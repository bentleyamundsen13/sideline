import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getLeagueContext, rosterOf } from "@/lib/league";
import { BackHeader } from "@/components/back-header";
import { TeamTheme } from "@/components/team-theme";
import { EmptyState, PlayerRow, TeamBadge } from "@/components/ui";
import { recordString } from "@/lib/format";
import { FREE_AGENTS_ID } from "@/lib/constants";

export const metadata = { title: "All players" };

export default async function AllPlayersPage({ params }: PageProps<"/l/[leagueId]/players">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { ranked, records, ovrByMember, members } = ctx;
  const base = `/l/${leagueId}`;

  // Teams in standings order, then free agents.
  const groups = [
    ...ranked.map((t) => ({ key: t.id, team: t, href: `${base}/teams/${t.id}`, roster: rosterOf(ctx, t.id) })),
    { key: FREE_AGENTS_ID, team: null, href: `${base}/teams/${FREE_AGENTS_ID}`, roster: rosterOf(ctx, null) },
  ].filter((g) => g.team || g.roster.length > 0);
  const total = members.filter((m) => m.onboarded).length;

  return (
    <div className="space-y-7 animate-fade-up">
      <TeamTheme color={null} />
      <BackHeader href={base} label="League" />
      <div>
        <h1 className="display text-4xl">All players</h1>
        <p className="text-sm text-muted mt-1">{total} players across {ranked.length} teams</p>
      </div>

      {total === 0 && <EmptyState title="No players yet" />}

      {groups.map(({ key, team, href, roster }) => (
        <section key={key}>
          <Link href={href} className="flex items-center gap-2.5 mb-2 px-1 group">
            <TeamBadge team={team} size={28} />
            <span className="font-semibold group-hover:underline underline-offset-2">{team?.name ?? "Free Agents"}</span>
            <span className="text-xs text-muted">
              {team ? recordString(records.get(team.id)!) + " · " : ""}
              {roster.length} player{roster.length === 1 ? "" : "s"}
            </span>
            <ChevronRight size={16} className="text-muted ml-auto" />
          </Link>
          {roster.length === 0 ? (
            <p className="card p-3 text-sm text-muted">No players yet.</p>
          ) : (
            <div className="card divide-y divide-line" style={team ? { borderLeft: `3px solid ${team.color}` } : undefined}>
              {roster.map((m) => (
                <PlayerRow
                  key={m.id}
                  member={m}
                  team={team}
                  ovr={ovrByMember.get(m.id) ?? null}
                  href={`${base}/players/${m.id}`}
                  isCaptain={team?.captain_id === m.id}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
