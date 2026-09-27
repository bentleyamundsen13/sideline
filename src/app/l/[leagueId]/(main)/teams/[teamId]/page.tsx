import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Crown, Settings } from "lucide-react";
import { getLeagueContext, rosterOf, rsvpFor, type LeagueContext } from "@/lib/league";
import { leagueTz } from "@/lib/time-zone";
import { Avatar, EmptyState, PlayerRow, SectionHeader, StatTile, TeamBadge } from "@/components/ui";
import { TeamTheme } from "@/components/team-theme";
import { GameCard } from "@/components/game-card";
import { DraftButton } from "@/components/draft-button";
import { BackHeader } from "@/components/back-header";
import { ordinal, recordString } from "@/lib/format";
import { FREE_AGENT_COLOR, FREE_AGENTS_ID } from "@/lib/constants";
import type { Team } from "@/lib/types";

export default async function TeamPage({ params }: PageProps<"/l/[leagueId]/teams/[teamId]">) {
  const { leagueId, teamId } = await params;
  const ctx = await getLeagueContext(leagueId);
  if (teamId === FREE_AGENTS_ID) return <FreeAgents ctx={ctx} />;
  const team = ctx.teamById.get(teamId);
  if (!team) notFound();
  return <TeamView ctx={ctx} team={team} />;
}

function TeamView({ ctx, team }: { ctx: LeagueContext; team: Team }) {
  const { league, me, games, teamById, records, ranked, captainTeam, statsByMember, ovrByMember, memberById } = ctx;
  const base = `/l/${league.id}`;
  const roster = rosterOf(ctx, team.id);
  const record = records.get(team.id)!;
  const rank = ranked.findIndex((t) => t.id === team.id) + 1;
  const captain = team.captain_id ? memberById.get(team.captain_id) : null;

  const rated = roster.map((m) => ovrByMember.get(m.id)).filter((v): v is number => v != null);
  const avgOvr = rated.length ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : null;
  const diff = record.pointsFor - record.pointsAgainst;

  const teamGames = games.filter((g) => g.home_team_id === team.id || g.away_team_id === team.id);
  const nextGame = teamGames.find((g) => g.status === "scheduled");
  const lastGame = [...teamGames].reverse().find((g) => g.status === "final");

  const leader = (key: "touchdowns" | "receptions" | "interceptions" | "pass_tds") => {
    let best: { name: string; id: string; value: number } | null = null;
    for (const m of roster) {
      const v = statsByMember.get(m.id)?.[key] ?? 0;
      if (v > 0 && (!best || v > best.value)) best = { name: m.display_name, id: m.id, value: v };
    }
    return best;
  };

  const canTrade = captainTeam && captainTeam.id !== team.id;
  const isMyTeam = me.team_id === team.id;

  return (
    <div className="space-y-7 animate-fade-up">
      <TeamTheme color={team.color} />
      <BackHeader href={`${base}/teams`} label="All teams" />

      <section className="card overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${team.color} 45%, transparent), transparent 65%)` }}
        />
        <div
          className="absolute -right-6 -bottom-10 display text-[9rem] opacity-[0.07] select-none pointer-events-none"
          aria-hidden="true"
        >
          {team.abbr}
        </div>
        <div className="relative p-5 flex items-center gap-4">
          <TeamBadge team={team} size={72} />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-text/70 truncate">
              {rank > 0 && record.played > 0 ? `${ordinal(rank)} in ${league.name}` : league.name}
              {isMyTeam && " · Your team"}
            </div>
            <h1 className="display text-4xl sm:text-5xl leading-[0.95] text-balance break-words mt-0.5">{team.name}</h1>
            <div className="display text-2xl text-text/80 tabular mt-1">{recordString(record)}</div>
          </div>
        </div>
        {captain && (
          <Link
            href={`${base}/players/${captain.id}`}
            className="relative flex items-center gap-2.5 px-5 py-3 border-t border-white/10 bg-black/20 hover:bg-black/30 transition-colors"
          >
            <Avatar member={captain} color={team.color} size="xs" />
            <span className="text-sm">
              <Crown size={13} className="inline -mt-0.5 mr-1" style={{ color: team.color }} />
              Captain <span className="font-semibold">{captain.display_name}</span>
            </span>
          </Link>
        )}
      </section>

      <div className="flex gap-2">
        {canTrade && (
          <Link href={`${base}/trades/new?team=${team.id}`} className="btn btn-accent flex-1">
            <ArrowLeftRight size={16} /> Propose Trade
          </Link>
        )}
        {me.is_commissioner && (
          <Link href={`${base}/manage#teams`} className={`btn btn-secondary ${canTrade ? "" : "flex-1"}`}>
            <Settings size={16} /> Manage
          </Link>
        )}
      </div>

      <section className="grid grid-cols-3 gap-2">
        <StatTile label="Avg OVR" value={avgOvr ?? "—"} />
        <StatTile label="Point diff" value={diff > 0 ? `+${diff}` : diff} sub={`${record.pointsFor} PF · ${record.pointsAgainst} PA`} />
        <StatTile label="Streak" value={record.streak ?? "—"} sub={`${roster.length} players`} />
      </section>

      {(nextGame || lastGame) && (
        <section className="grid sm:grid-cols-2 gap-3">
          {nextGame && (
            <div>
              <SectionHeader title="Next game" />
              <GameCard tz={leagueTz(ctx.league)} game={nextGame} home={teamById.get(nextGame.home_team_id)} away={teamById.get(nextGame.away_team_id)} leagueId={league.id} rsvp={rsvpFor(ctx, nextGame)} />
            </div>
          )}
          {lastGame && (
            <div>
              <SectionHeader title="Last game" />
              <GameCard tz={leagueTz(ctx.league)} game={lastGame} home={teamById.get(lastGame.home_team_id)} away={teamById.get(lastGame.away_team_id)} leagueId={league.id} />
            </div>
          )}
        </section>
      )}

      <section>
        <SectionHeader title="Team leaders" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["TD", leader("touchdowns")],
              ["PASS TD", leader("pass_tds")],
              ["REC", leader("receptions")],
              ["INT", leader("interceptions")],
            ] as const
          ).map(([label, l]) => (
            <div key={label} className="card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div>
              {l ? (
                <Link href={`${base}/players/${l.id}`} className="block mt-1.5">
                  <div className="display text-2xl tabular">{l.value}</div>
                  <div className="text-xs truncate hover:underline">{l.name}</div>
                </Link>
              ) : (
                <div className="display text-2xl text-muted mt-1.5">—</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={`Roster · ${roster.length}`} />
        {roster.length === 0 ? (
          <EmptyState title="No players yet" body="Captains draft players from Free Agents." />
        ) : (
          <div className="card divide-y divide-line">
            {roster.map((m) => (
              <PlayerRow
                key={m.id}
                member={m}
                team={team}
                ovr={ovrByMember.get(m.id) ?? null}
                href={`${base}/players/${m.id}`}
                isCaptain={team.captain_id === m.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FreeAgents({ ctx }: { ctx: LeagueContext }) {
  const { league, captainTeam, ovrByMember, members } = ctx;
  const base = `/l/${league.id}`;
  const agents = rosterOf(ctx, null);
  const pendingProfiles = members.filter((m) => !m.onboarded).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <TeamTheme color={FREE_AGENT_COLOR} />
      <BackHeader href={`${base}/teams`} label="All teams" />
      <section className="flex items-center gap-4 pt-1">
        <TeamBadge team={null} size={64} />
        <div>
          <h1 className="display text-4xl">Free Agents</h1>
          <p className="text-sm text-muted mt-1">
            {agents.length} available
            {captainTeam ? ` · Drafting for ${captainTeam.name}` : ""}
          </p>
        </div>
      </section>

      {!captainTeam && (
        <p className="text-sm text-muted card p-3.5">
          Only team captains can draft. Free agents show up here until a captain picks them up.
        </p>
      )}

      {agents.length === 0 ? (
        <EmptyState title="Nobody here" body="Every player has a team." />
      ) : (
        <div className="card divide-y divide-line">
          {agents.map((m) => (
            <PlayerRow
              key={m.id}
              member={m}
              team={null}
              ovr={ovrByMember.get(m.id) ?? null}
              href={`${base}/players/${m.id}`}
              right={captainTeam ? <DraftButton memberId={m.id} playerName={m.display_name} teamName={captainTeam.abbr} /> : undefined}
            />
          ))}
        </div>
      )}
      {pendingProfiles > 0 && (
        <p className="text-xs text-muted text-center">
          {pendingProfiles} player{pendingProfiles === 1 ? " has" : "s have"} joined but not finished their profile yet.
        </p>
      )}
    </div>
  );
}
