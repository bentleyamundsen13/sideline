import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getAuthUser } from "./auth";
import { computeOvr } from "./ovr";
import { computeRecords, standings } from "./records";
import type { Game, League, Member, StatTotals, Team } from "./types";

/**
 * Everything a league screen needs, loaded once per request and shared between
 * the layout and the page. Backyard leagues are small, so we just load it all,
 * in a single parallel batch.
 */
export const getLeagueContext = cache(async (leagueId: string) => {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const [leagueRes, teamsRes, membersRes, statsRes, gamesRes, pendingRes, rsvpRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).maybeSingle(),
    supabase.from("teams").select("*").eq("league_id", leagueId).order("created_at"),
    supabase.from("members").select("*").eq("league_id", leagueId).order("display_name"),
    supabase.from("member_stats").select("*").eq("league_id", leagueId),
    supabase.from("games").select("*").eq("league_id", leagueId).order("scheduled_at"),
    // Only trades you're allowed to see come back (RLS): yours as a captain, or all as commissioner.
    supabase.from("trades").select("id, receiver_team_id").eq("league_id", leagueId).eq("status", "pending"),
    supabase.from("game_rsvps").select("game_id, member_id, status").eq("league_id", leagueId),
  ]);

  // Not in this league (RLS hides it) or it doesn't exist.
  if (!leagueRes.data) redirect("/");
  const members = (membersRes.data ?? []) as Member[];
  const me = members.find((m) => m.user_id === user.id);
  if (!me) redirect("/");

  const league = leagueRes.data as League;
  const teams = (teamsRes.data ?? []) as Team[];
  const stats = (statsRes.data ?? []) as StatTotals[];
  const games = (gamesRes.data ?? []) as Game[];

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const statsByMember = new Map(stats.map((s) => [s.member_id, s]));
  const ovrByMember = new Map(members.map((m) => [m.id, computeOvr(statsByMember.get(m.id))]));
  const records = computeRecords(teams, games);
  const ranked = standings(teams, records);
  const captainTeam = teams.find((t) => t.captain_id === me.id) ?? null;
  const captainIds = new Set(teams.map((t) => t.captain_id).filter(Boolean) as string[]);
  // game id -> member id -> "in" | "out"
  const rsvps = new Map<string, Map<string, "in" | "out">>();
  for (const r of (rsvpRes.data ?? []) as { game_id: string; member_id: string; status: "in" | "out" }[]) {
    if (!rsvps.has(r.game_id)) rsvps.set(r.game_id, new Map());
    rsvps.get(r.game_id)!.set(r.member_id, r.status);
  }
  const incomingTrades = captainTeam
    ? ((pendingRes.data ?? []) as { receiver_team_id: string }[]).filter((t) => t.receiver_team_id === captainTeam.id).length
    : 0;

  return {
    supabase,
    user,
    league,
    me,
    teams,
    members,
    games,
    teamById,
    memberById,
    statsByMember,
    ovrByMember,
    records,
    ranked,
    captainTeam,
    captainIds,
    incomingTrades,
    rsvps,
    myTeam: me.team_id ? (teamById.get(me.team_id) ?? null) : null,
    isCommish: me.is_commissioner,
  };
});

export type LeagueContext = Awaited<ReturnType<typeof getLeagueContext>>;

export type RsvpInfo = { gameId: string; leagueId: string; memberId: string; count: { in: number; out: number }; mine: "in" | "out" | null; canRsvp: boolean };

/** In/out counts for a game plus your own answer. Only players on the two teams can answer. */
export function rsvpFor(ctx: LeagueContext, game: Game): RsvpInfo {
  const answers = ctx.rsvps.get(game.id) ?? new Map();
  let yes = 0;
  let no = 0;
  for (const s of answers.values()) {
    if (s === "in") yes++;
    else no++;
  }
  return {
    gameId: game.id,
    leagueId: ctx.league.id,
    memberId: ctx.me.id,
    count: { in: yes, out: no },
    mine: answers.get(ctx.me.id) ?? null,
    canRsvp: ctx.me.team_id === game.home_team_id || ctx.me.team_id === game.away_team_id,
  };
}

/** Onboarded players on a team (null = free agents), captain first then by OVR. */
export function rosterOf(ctx: LeagueContext, teamId: string | null) {
  const team = teamId ? ctx.teamById.get(teamId) : null;
  return ctx.members
    .filter((m) => m.onboarded && m.team_id === teamId)
    .sort((a, b) => {
      if (team?.captain_id === a.id) return -1;
      if (team?.captain_id === b.id) return 1;
      return (ctx.ovrByMember.get(b.id) ?? 0) - (ctx.ovrByMember.get(a.id) ?? 0) || a.display_name.localeCompare(b.display_name);
    });
}
