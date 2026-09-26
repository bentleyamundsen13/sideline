import { getLeagueContext } from "@/lib/league";
import { BackHeader } from "@/components/back-header";
import { StatLogger } from "@/components/stat-logger";
import { formatGameDate } from "@/lib/format";
import { requestTime } from "@/lib/time";
import type { StatLine } from "@/lib/types";

export const metadata = { title: "Log stats" };

export default async function StatsPage({ params }: PageProps<"/l/[leagueId]/me/stats">) {
  const { leagueId } = await params;
  const { me, games, teamById, supabase } = await getLeagueContext(leagueId);

  const { data } = await supabase
    .from("stat_lines")
    .select("*")
    .eq("member_id", me.id)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  const lines = (data ?? []) as StatLine[];

  const logged = new Set(lines.map((l) => l.game_id).filter(Boolean));
  const now = requestTime();
  // Games your team has played (or is playing today) that you haven't logged yet.
  const gameOptions = games
    .filter(
      (g) =>
        me.team_id &&
        (g.home_team_id === me.team_id || g.away_team_id === me.team_id) &&
        (g.status === "final" || new Date(g.scheduled_at).getTime() < now + 12 * 3600_000) &&
        !logged.has(g.id),
    )
    .reverse()
    .map((g) => {
      const oppId = g.home_team_id === me.team_id ? g.away_team_id : g.home_team_id;
      return {
        id: g.id,
        label: `vs ${teamById.get(oppId)?.name ?? "TBD"} · ${formatGameDate(g.scheduled_at)}`,
        date: g.scheduled_at.slice(0, 10),
      };
    });

  const lineLabels = Object.fromEntries(
    lines.map((l) => {
      const g = l.game_id ? games.find((x) => x.id === l.game_id) : null;
      const oppId = g && me.team_id ? (g.home_team_id === me.team_id ? g.away_team_id : g.home_team_id) : null;
      return [l.id, oppId ? `vs ${teamById.get(oppId)?.name ?? "TBD"}` : g ? "League game" : "Pickup game"];
    }),
  );

  return (
    <div className="max-w-md mx-auto animate-fade-up">
      <BackHeader href={`/l/${leagueId}/players/${me.id}`} label="My profile" />
      <h1 className="display text-4xl mt-4">Log stats</h1>
      <p className="text-sm text-muted mt-1 mb-6">Be honest. Your league can see every number.</p>
      {/* Remount after each save so the game picker moves to the next unlogged game. */}
      <StatLogger key={lines.length} leagueId={leagueId} memberId={me.id} isQb={me.offense_position === "QB"} gameOptions={gameOptions} lines={lines} lineLabels={lineLabels} />
    </div>
  );
}
