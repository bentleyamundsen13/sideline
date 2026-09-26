import { getLeagueContext } from "@/lib/league";
import { EmptyState } from "@/components/ui";
import {
  LeagueSettings,
  NewsComposer,
  PlayersManager,
  ScheduleManager,
  TeamsManager,
} from "@/components/manage-sections";

export const metadata = { title: "Manage league" };

export default async function ManagePage({ params }: PageProps<"/l/[leagueId]/manage">) {
  const { leagueId } = await params;
  const { league, me, teams, members, games } = await getLeagueContext(leagueId);

  if (!me.is_commissioner) {
    return <EmptyState title="Commissioner only" body="Only the league commissioner can manage teams and the schedule." />;
  }

  const players = members.map((m) => ({
    id: m.id,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
    team_id: m.team_id,
    onboarded: m.onboarded,
    is_commissioner: m.is_commissioner,
  }));

  const nav = [
    ["teams", "Teams"],
    ["players", "Players"],
    ["schedule", "Schedule"],
    ["news", "News"],
    ["league", "League"],
  ];

  return (
    <div className="space-y-10 animate-fade-up">
      <div>
        <h1 className="display text-4xl">Manage league</h1>
        <p className="text-sm text-muted mt-1">You&apos;re the commish. Build teams, name captains, run the schedule.</p>
        <nav className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip !text-text hover:bg-line">
              {label}
            </a>
          ))}
        </nav>
      </div>
      <TeamsManager leagueId={leagueId} teams={teams} players={players} />
      <PlayersManager meId={me.id} teams={teams} players={players} />
      <ScheduleManager key={teams.length} leagueId={leagueId} teams={teams} games={games} defaultLocation={league.location} />
      <NewsComposer leagueId={leagueId} authorId={me.id} />
      <LeagueSettings league={league} />
    </div>
  );
}
