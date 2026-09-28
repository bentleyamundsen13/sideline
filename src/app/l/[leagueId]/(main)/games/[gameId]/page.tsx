import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Settings, Trophy } from "lucide-react";
import { getLeagueContext, rsvpFor, type LeagueContext } from "@/lib/league";
import { BackHeader } from "@/components/back-header";
import { TeamTheme } from "@/components/team-theme";
import { RsvpBar } from "@/components/rsvp-bar";
import { Avatar, SectionHeader, TeamBadge } from "@/components/ui";
import { statSummary } from "@/lib/ovr";
import { playerOfTheGame } from "@/lib/potg";
import { formatGameDate, formatGameTime, leagueTz, tzAbbreviation } from "@/lib/time-zone";
import type { Game, Member, StatLine, Team } from "@/lib/types";

export const metadata = { title: "Game" };

export default async function GamePage({ params }: PageProps<"/l/[leagueId]/games/[gameId]">) {
  const { leagueId, gameId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const game = ctx.games.find((g) => g.id === gameId);
  if (!game) notFound();

  const base = `/l/${leagueId}`;
  const home = ctx.teamById.get(game.home_team_id);
  const away = ctx.teamById.get(game.away_team_id);
  const final = game.status === "final";

  const { data } = await ctx.supabase.from("stat_lines").select("*").eq("game_id", game.id);
  const lines = (data ?? []) as StatLine[];
  const potg = final ? playerOfTheGame(lines) : null;
  const potgMember = potg ? ctx.memberById.get(potg.member_id) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <TeamTheme color={null} />
      <BackHeader href={`${base}/schedule`} label="Schedule" />

      <Scoreboard game={game} home={home} away={away} base={base} tz={leagueTz(ctx.league)}>
        {!final && <RsvpBar info={rsvpFor(ctx, game)} />}
      </Scoreboard>

      {potg && potgMember && (
        <Link
          href={`${base}/players/${potgMember.id}`}
          className="card relative overflow-hidden flex items-center gap-4 p-4 !border-amber-400/40"
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-400/15 to-transparent" />
          <Avatar member={potgMember} color={ctx.teamById.get(potgMember.team_id ?? "")?.color} size="lg" className="relative" />
          <div className="relative min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1">
              <Trophy size={12} /> Player of the Game
            </div>
            <div className="display text-2xl truncate">{potgMember.display_name}</div>
            <div className="text-sm text-muted">{statSummary(potg)}</div>
          </div>
        </Link>
      )}

      {final ? (
        <section className="space-y-5">
          <SectionHeader title="Box score" />
          {[away, home].map((team) =>
            team ? <BoxScore key={team.id} ctx={ctx} team={team} lines={lines} potgId={potg?.member_id ?? null} /> : null,
          )}
          <OtherLines ctx={ctx} game={game} lines={lines} />
        </section>
      ) : (
        <section id="playing" className="space-y-4 scroll-mt-20">
          <SectionHeader title="Who's playing" />
          {[away, home].map((team) => (team ? <Attendance key={team.id} ctx={ctx} team={team} game={game} /> : null))}
        </section>
      )}

      {ctx.isCommish && (
        <Link href={`${base}/manage#schedule`} className="btn btn-secondary w-full">
          <Settings size={16} /> {final ? "Edit score" : "Enter score"}
        </Link>
      )}
    </div>
  );
}

function Scoreboard({
  game,
  home,
  away,
  base,
  tz,
  children,
}: {
  game: Game;
  home?: Team;
  away?: Team;
  base: string;
  tz: string;
  children?: React.ReactNode;
}) {
  const final = game.status === "final";
  const side = (team: Team | undefined, score: number | null, won: boolean, lost: boolean) => (
    <Link href={team ? `${base}/teams/${team.id}` : "#"} className="flex flex-col items-center gap-2 min-w-0 flex-1">
      <TeamBadge team={team ?? null} size={56} />
      <span className={`text-sm font-semibold text-center leading-tight line-clamp-2 ${lost ? "text-muted" : ""}`}>{team?.name ?? "TBD"}</span>
      {final && <span className={`display text-5xl tabular ${lost ? "text-muted" : ""}`}>{score}</span>}
      {won && <span className="text-[10px] font-bold uppercase tracking-widest text-success">Win</span>}
    </Link>
  );
  const homeWon = final && game.home_score! > game.away_score!;
  const awayWon = final && game.away_score! > game.home_score!;

  return (
    <section className="card p-5">
      <div className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted">
        {game.week ? `Week ${game.week} · ` : ""}
        {formatGameDate(game.scheduled_at, tz)}
      </div>
      <div className="flex items-start gap-3 mt-4">
        {side(away, game.away_score, awayWon, homeWon)}
        <div className="pt-4 text-center shrink-0 w-16">
          <div className={`display text-lg ${final ? "" : "text-muted"}`}>{final ? "Final" : formatGameTime(game.scheduled_at, tz)}</div>
          {!final && <div className="text-[10px] text-muted">{tzAbbreviation(tz, game.scheduled_at)}</div>}
          <div className="text-xs text-muted mt-0.5">at</div>
        </div>
        {side(home, game.home_score, homeWon, awayWon)}
      </div>
      {game.location && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted mt-4">
          <MapPin size={12} /> {game.location}
        </div>
      )}
      {children}
    </section>
  );
}

/** A team's logged stat lines for this game, biggest games first. */
function BoxScore({ ctx, team, lines, potgId }: { ctx: LeagueContext; team: Team; lines: StatLine[]; potgId: string | null }) {
  const base = `/l/${ctx.league.id}`;
  const roster = ctx.members.filter((m) => m.onboarded && m.team_id === team.id);
  const teamLines = lines
    .filter((l) => ctx.memberById.get(l.member_id)?.team_id === team.id)
    .sort((a, b) => b.touchdowns - a.touchdowns || b.receptions - a.receptions);
  const missing = roster.filter((m) => !lines.some((l) => l.member_id === m.id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <TeamBadge team={team} size={22} />
        <span className="font-semibold text-sm">{team.name}</span>
      </div>
      <div className="card divide-y divide-line" style={{ borderLeft: `3px solid ${team.color}` }}>
        {teamLines.length === 0 && <p className="p-3 text-sm text-muted">No stats logged yet.</p>}
        {teamLines.map((l) => {
          const m = ctx.memberById.get(l.member_id)!;
          return (
            <Link key={l.id} href={`${base}/players/${m.id}`} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar member={m} color={team.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">
                  {m.display_name}
                  {m.id === potgId && <Trophy size={13} className="inline ml-1.5 -mt-0.5 text-amber-300" aria-label="Player of the Game" />}
                </div>
                <div className="text-xs text-muted">{statSummary(l) || "No stats"}</div>
              </div>
            </Link>
          );
        })}
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-muted mt-1.5 px-1">Not logged yet: {missing.map((m) => m.display_name.split(" ")[0]).join(", ")}</p>
      )}
    </div>
  );
}

/** Lines from players who've since moved to another team. */
function OtherLines({ ctx, game, lines }: { ctx: LeagueContext; game: Game; lines: StatLine[] }) {
  const others = lines.filter((l) => {
    const t = ctx.memberById.get(l.member_id)?.team_id;
    return t !== game.home_team_id && t !== game.away_team_id;
  });
  if (others.length === 0) return null;
  return (
    <div>
      <div className="text-xs text-muted mb-2 px-1">Since traded or released</div>
      <div className="card divide-y divide-line">
        {others.map((l) => {
          const m = ctx.memberById.get(l.member_id);
          return m ? (
            <div key={l.id} className="px-3 py-2.5 text-sm">
              <span className="font-semibold">{m.display_name}</span> <span className="text-muted">· {statSummary(l)}</span>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

/** Upcoming game: who's in, who's out, who hasn't answered, per team. */
function Attendance({ ctx, team, game }: { ctx: LeagueContext; team: Team; game: Game }) {
  const answers = ctx.rsvps.get(game.id) ?? new Map<string, "in" | "out">();
  const roster = ctx.members.filter((m) => m.onboarded && m.team_id === team.id);
  const group = (s: "in" | "out" | null) => roster.filter((m) => (answers.get(m.id) ?? null) === s);
  const row = (label: string, people: Member[], tone: string) =>
    people.length > 0 && (
      <div className="flex gap-2 text-sm">
        <span className={`w-16 shrink-0 text-xs font-semibold uppercase tracking-widest pt-0.5 ${tone}`}>{label}</span>
        <span className="text-text/90">{people.map((m) => m.display_name.split(" ")[0]).join(", ")}</span>
      </div>
    );
  const yes = group("in");

  return (
    <div className="card p-3.5 space-y-2" style={{ borderLeft: `3px solid ${team.color}` }}>
      <div className="flex items-center gap-2">
        <TeamBadge team={team} size={22} />
        <span className="font-semibold text-sm flex-1">{team.name}</span>
        <span className="text-xs text-muted tabular">
          {yes.length}/{roster.length} in
        </span>
      </div>
      {row("In", yes, "text-success")}
      {row("Out", group("out"), "text-danger")}
      {row("No reply", group(null), "text-muted")}
      {roster.length === 0 && <p className="text-sm text-muted">No players yet.</p>}
    </div>
  );
}
