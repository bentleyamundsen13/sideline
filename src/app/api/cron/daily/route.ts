import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, flushNotifications, pushConfigured } from "@/lib/push-server";
import { playerOfTheGame } from "@/lib/potg";
import { statSummary } from "@/lib/ovr";
import type { StatLine } from "@/lib/types";

const HOUR = 3600_000;

// Once a day (see vercel.json), in the evening US time:
//  - announce Player of the Game for games from about a day ago (time to log stats)
//  - nudge players from today's games who haven't logged stats
//  - ask players with a game tomorrow who haven't said if they're in
// Each game is only ever announced/reminded once. Vercel sends CRON_SECRET as a bearer token.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: "push not configured" });

  const admin = adminClient();
  const announced = await announcePlayersOfTheGame(admin);
  const reminders = await sendReminders(admin);
  const sent = await flushNotifications(req.nextUrl.origin);
  return NextResponse.json({ announced, reminders, sent });
}

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

async function teamNames(admin: SupabaseClient, ids: string[]) {
  const { data } = await admin.from("teams").select("id, name").in("id", ids);
  return new Map((data ?? []).map((t) => [t.id as string, t.name as string]));
}

async function announcePlayersOfTheGame(admin: SupabaseClient) {
  const { data: games } = await admin
    .from("games")
    .select("*")
    .eq("status", "final")
    .is("potg_posted_at", null)
    .gte("scheduled_at", iso(-60 * HOUR))
    .lte("scheduled_at", iso(-18 * HOUR));
  if (!games?.length) return 0;

  const [{ data: lineData }, names] = await Promise.all([
    admin.from("stat_lines").select("*").in("game_id", games.map((g) => g.id)),
    teamNames(admin, [...new Set(games.flatMap((g) => [g.home_team_id, g.away_team_id]))]),
  ]);
  const lines = (lineData ?? []) as StatLine[];
  const winners = games.map((g) => ({ game: g, best: playerOfTheGame(lines.filter((l) => l.game_id === g.id)) }));
  const memberIds = winners.flatMap((w) => (w.best ? [w.best.member_id] : []));
  const { data: memberData } = memberIds.length
    ? await admin.from("members").select("id, user_id, display_name").in("id", memberIds)
    : { data: [] };
  const members = new Map((memberData ?? []).map((m) => [m.id as string, m]));

  const news: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];
  const done: string[] = [];
  for (const { game: g, best } of winners) {
    const m = best ? members.get(best.member_id) : null;
    // Nobody logged yet? Give it another day before giving up on this game.
    if (!best || !m) {
      if (g.scheduled_at < iso(-42 * HOUR)) done.push(g.id);
      continue;
    }
    const matchup = `${names.get(g.away_team_id)} at ${names.get(g.home_team_id)}`;
    const summary = statSummary(best);
    news.push({ league_id: g.league_id, author_id: m.id, kind: "result", title: `🏆 Player of the Game: ${m.display_name}`, body: `${summary} in ${matchup}.` });
    notes.push({ user_id: m.user_id, league_id: g.league_id, kind: "potg", title: "You're Player of the Game! 🏆", body: `${summary} in ${matchup}.`, link: `/l/${g.league_id}/games/${g.id}` });
    done.push(g.id);
  }

  await Promise.all([
    news.length ? admin.from("news").insert(news) : null,
    notes.length ? admin.from("notifications").insert(notes) : null,
    done.length ? admin.from("games").update({ potg_posted_at: new Date().toISOString() }).in("id", done) : null,
  ]);
  return news.length;
}

async function sendReminders(admin: SupabaseClient) {
  const [{ data: recent }, { data: soon }] = await Promise.all([
    admin.from("games").select("*").is("stats_reminded_at", null).gte("scheduled_at", iso(-30 * HOUR)).lte("scheduled_at", iso(0)),
    admin.from("games").select("*").eq("status", "scheduled").is("rsvp_reminded_at", null).gte("scheduled_at", iso(0)).lte("scheduled_at", iso(30 * HOUR)),
  ]);
  const games = [...(recent ?? []), ...(soon ?? [])];
  if (games.length === 0) return 0;

  const teamIds = [...new Set(games.flatMap((g) => [g.home_team_id, g.away_team_id]))];
  const gameIds = games.map((g) => g.id);
  const [names, { data: players }, { data: lines }, { data: rsvps }] = await Promise.all([
    teamNames(admin, teamIds),
    admin.from("members").select("id, user_id, team_id").in("team_id", teamIds).eq("onboarded", true),
    admin.from("stat_lines").select("member_id, game_id").in("game_id", gameIds),
    admin.from("game_rsvps").select("member_id, game_id").in("game_id", gameIds),
  ]);
  const logged = new Set((lines ?? []).map((l) => `${l.game_id}:${l.member_id}`));
  const answered = new Set((rsvps ?? []).map((r) => `${r.game_id}:${r.member_id}`));
  const playersOn = (g: { home_team_id: string; away_team_id: string }) =>
    (players ?? []).filter((p) => p.team_id === g.home_team_id || p.team_id === g.away_team_id);

  const rows: Record<string, unknown>[] = [];
  for (const g of recent ?? []) {
    const matchup = `${names.get(g.away_team_id)} at ${names.get(g.home_team_id)}`;
    for (const p of playersOn(g)) {
      if (logged.has(`${g.id}:${p.id}`)) continue;
      rows.push({ user_id: p.user_id, league_id: g.league_id, kind: "stats_reminder", title: "How'd you play?", body: `Log your stats from ${matchup}.`, link: `/l/${g.league_id}/me/stats` });
    }
  }
  for (const g of soon ?? []) {
    const matchup = `${names.get(g.away_team_id)} at ${names.get(g.home_team_id)}`;
    for (const p of playersOn(g)) {
      if (answered.has(`${g.id}:${p.id}`)) continue;
      rows.push({ user_id: p.user_id, league_id: g.league_id, kind: "rsvp_reminder", title: "Game coming up. Are you in?", body: `${matchup}. Let your team know.`, link: `/l/${g.league_id}/games/${g.id}` });
    }
  }

  const stamp = new Date().toISOString();
  await Promise.all([
    rows.length ? admin.from("notifications").insert(rows) : null,
    recent?.length ? admin.from("games").update({ stats_reminded_at: stamp }).in("id", recent.map((g) => g.id)) : null,
    soon?.length ? admin.from("games").update({ rsvp_reminded_at: stamp }).in("id", soon.map((g) => g.id)) : null,
  ]);
  return rows.length;
}
