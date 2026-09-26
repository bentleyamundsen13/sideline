import { NextResponse, type NextRequest } from "next/server";
import { adminClient, flushNotifications, pushConfigured } from "@/lib/push-server";

// Once a day (see vercel.json), in the evening US time:
//  - players from games in the last day who haven't logged stats get a nudge
//  - players with a game in the next day who haven't said in/out get asked
// Each game is only ever reminded once. Vercel sends CRON_SECRET as a bearer token.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: "push not configured" });

  const admin = adminClient();
  const now = Date.now();
  const iso = (ms: number) => new Date(now + ms).toISOString();
  const HOUR = 3600_000;

  const [{ data: recent }, { data: soon }] = await Promise.all([
    admin.from("games").select("*").is("stats_reminded_at", null).gte("scheduled_at", iso(-30 * HOUR)).lte("scheduled_at", iso(0)),
    admin.from("games").select("*").eq("status", "scheduled").is("rsvp_reminded_at", null).gte("scheduled_at", iso(0)).lte("scheduled_at", iso(30 * HOUR)),
  ]);
  const games = [...(recent ?? []), ...(soon ?? [])];
  if (games.length === 0) return NextResponse.json({ reminders: 0 });

  const teamIds = [...new Set(games.flatMap((g) => [g.home_team_id, g.away_team_id]))];
  const gameIds = games.map((g) => g.id);
  const [{ data: teams }, { data: players }, { data: lines }, { data: rsvps }] = await Promise.all([
    admin.from("teams").select("id, name").in("id", teamIds),
    admin.from("members").select("id, user_id, team_id").in("team_id", teamIds).eq("onboarded", true),
    admin.from("stat_lines").select("member_id, game_id").in("game_id", gameIds),
    admin.from("game_rsvps").select("member_id, game_id").in("game_id", gameIds),
  ]);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name as string]));
  const logged = new Set((lines ?? []).map((l) => `${l.game_id}:${l.member_id}`));
  const answered = new Set((rsvps ?? []).map((r) => `${r.game_id}:${r.member_id}`));
  const playersOn = (g: { home_team_id: string; away_team_id: string }) =>
    (players ?? []).filter((p) => p.team_id === g.home_team_id || p.team_id === g.away_team_id);

  const rows: Record<string, unknown>[] = [];
  for (const g of recent ?? []) {
    const matchup = `${teamName.get(g.away_team_id)} at ${teamName.get(g.home_team_id)}`;
    for (const p of playersOn(g)) {
      if (logged.has(`${g.id}:${p.id}`)) continue;
      rows.push({ user_id: p.user_id, league_id: g.league_id, kind: "stats_reminder", title: "How'd you play?", body: `Log your stats from ${matchup}.`, link: `/l/${g.league_id}/me/stats` });
    }
  }
  for (const g of soon ?? []) {
    const matchup = `${teamName.get(g.away_team_id)} at ${teamName.get(g.home_team_id)}`;
    for (const p of playersOn(g)) {
      if (answered.has(`${g.id}:${p.id}`)) continue;
      rows.push({ user_id: p.user_id, league_id: g.league_id, kind: "rsvp_reminder", title: "Game coming up. Are you in?", body: `${matchup}. Let your team know.`, link: `/l/${g.league_id}/schedule` });
    }
  }

  const stamp = new Date().toISOString();
  await Promise.all([
    rows.length ? admin.from("notifications").insert(rows) : null,
    recent?.length ? admin.from("games").update({ stats_reminded_at: stamp }).in("id", recent.map((g) => g.id)) : null,
    soon?.length ? admin.from("games").update({ rsvp_reminded_at: stamp }).in("id", soon.map((g) => g.id)) : null,
  ]);

  const sent = await flushNotifications(req.nextUrl.origin);
  return NextResponse.json({ reminders: rows.length, sent });
}
