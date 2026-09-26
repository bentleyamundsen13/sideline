import { getLeagueContext } from "@/lib/league";
import { BackHeader } from "@/components/back-header";
import { TeamTheme } from "@/components/team-theme";
import { Leaderboard, type LeaderCategory, type LeaderRow } from "@/components/leaderboard";
import { catchRate } from "@/lib/ovr";

export const metadata = { title: "Leaders" };

const CATEGORIES: LeaderCategory[] = [
  { key: "ovr", label: "OVR" },
  { key: "td", label: "Touchdowns" },
  { key: "rec", label: "Receptions" },
  { key: "passTd", label: "Passing TDs" },
  { key: "tkl", label: "Tackles" },
  { key: "int", label: "Interceptions" },
  { key: "pbu", label: "Pass breakups" },
  { key: "catch", label: "Catch %", unit: "%" },
];

export default async function LeadersPage({ params }: PageProps<"/l/[leagueId]/leaders">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { members, teamById, statsByMember, ovrByMember } = ctx;

  const rows: LeaderRow[] = members
    .filter((m) => m.onboarded)
    .map((m) => {
      const s = statsByMember.get(m.id);
      const team = m.team_id ? teamById.get(m.team_id) : null;
      // Catch % only ranks players with a real sample (5+ targets).
      const targets = (s?.receptions ?? 0) + (s?.drops ?? 0);
      return {
        id: m.id,
        name: m.display_name,
        avatarUrl: m.avatar_url,
        teamName: team?.name ?? "Free Agent",
        teamColor: team?.color ?? null,
        games: s?.games ?? 0,
        stats: {
          ovr: ovrByMember.get(m.id) ?? null,
          td: s?.touchdowns ?? 0,
          rec: s?.receptions ?? 0,
          passTd: s?.pass_tds ?? 0,
          tkl: s?.tackles ?? 0,
          int: s?.interceptions ?? 0,
          pbu: s?.pass_breakups ?? 0,
          catch: targets >= 5 ? catchRate(s) : null,
        },
      };
    });

  return (
    <div className="space-y-5 animate-fade-up">
      <TeamTheme color={null} />
      <BackHeader href={`/l/${leagueId}`} label="League" />
      <div>
        <h1 className="display text-4xl">Leaders</h1>
        <p className="text-sm text-muted mt-1">Season totals. Catch % needs 5+ targets.</p>
      </div>
      <Leaderboard leagueId={leagueId} rows={rows} categories={CATEGORIES} />
    </div>
  );
}
