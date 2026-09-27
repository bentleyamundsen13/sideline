import Link from "next/link";
import { getLeagueContext, rsvpFor } from "@/lib/league";
import { leagueTz } from "@/lib/time-zone";
import { BackHeader } from "@/components/back-header";
import { GameCard } from "@/components/game-card";
import { TeamTheme } from "@/components/team-theme";
import { EmptyState, SectionHeader } from "@/components/ui";
import type { Game } from "@/lib/types";

export const metadata = { title: "Schedule" };

/** Groups games by week (or "Other games" when no week was set), keeping order. */
function byWeek(games: Game[]) {
  const groups: { label: string; games: Game[] }[] = [];
  for (const g of games) {
    const label = g.week ? `Week ${g.week}` : "Other games";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.games.push(g);
    else groups.push({ label, games: [g] });
  }
  return groups;
}

export default async function SchedulePage({ params }: PageProps<"/l/[leagueId]/schedule">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { games, teamById, me } = ctx;
  const base = `/l/${leagueId}`;

  const upcoming = games.filter((g) => g.status === "scheduled"); // soonest first
  const results = games.filter((g) => g.status === "final").reverse(); // most recent first

  const list = (items: Game[]) =>
    byWeek(items).map(({ label, games: gs }, i) => (
      <div key={`${label}-${i}`} className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted px-1 pt-1">{label}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {gs.map((g) => (
            <GameCard tz={leagueTz(ctx.league)} key={g.id} game={g} home={teamById.get(g.home_team_id)} away={teamById.get(g.away_team_id)} leagueId={leagueId} highlightTeamId={me.team_id} rsvp={rsvpFor(ctx, g)} />
          ))}
        </div>
      </div>
    ));

  return (
    <div className="space-y-8 animate-fade-up">
      <TeamTheme color={null} />
      <BackHeader href={base} label="League" />
      <div>
        <h1 className="display text-4xl">Schedule</h1>
        <p className="text-sm text-muted mt-1">
          {upcoming.length} upcoming · {results.length} played
        </p>
      </div>

      <section className="space-y-3">
        <SectionHeader title="Upcoming" />
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            body={me.is_commissioner ? undefined : "The commissioner hasn't added any upcoming games."}
            action={
              me.is_commissioner ? (
                <Link href={`${base}/manage#schedule`} className="btn btn-secondary btn-sm">
                  Add games
                </Link>
              ) : undefined
            }
          />
        ) : (
          list(upcoming)
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Results" />
        {results.length === 0 ? <EmptyState title="No games played yet" /> : list(results)}
      </section>
    </div>
  );
}
