import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import { getLeagueContext, rosterOf, type LeagueContext } from "@/lib/league";
import { TeamTheme } from "@/components/team-theme";
import { EmptyState, SectionHeader, TeamBadge } from "@/components/ui";
import { ordinal, recordString } from "@/lib/format";
import { FREE_AGENTS_ID } from "@/lib/constants";
import type { Team } from "@/lib/types";

export const metadata = { title: "Teams" };

export default async function TeamsPage({ params }: PageProps<"/l/[leagueId]/teams">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { ranked, myTeam, me } = ctx;
  const base = `/l/${leagueId}`;
  const others = ranked.filter((t) => t.id !== myTeam?.id);
  const freeAgents = rosterOf(ctx, null);

  return (
    <div className="space-y-7 animate-fade-up">
      <TeamTheme color={null} />
      <h1 className="display text-4xl pt-1">Teams</h1>

      {myTeam && (
        <section>
          <SectionHeader title="Your team" />
          <TeamCard ctx={ctx} team={myTeam} big />
        </section>
      )}

      <section>
        <SectionHeader title={myTeam ? "Around the league" : "All teams"} />
        {ranked.length === 0 ? (
          <EmptyState
            title="No teams yet"
            body={me.is_commissioner ? "Create teams from Manage League on the You tab." : "The commissioner hasn't made teams yet."}
          />
        ) : (
          <div className="space-y-2">
            {others.map((t) => (
              <TeamCard key={t.id} ctx={ctx} team={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Link href={`${base}/teams/${FREE_AGENTS_ID}`} className="card flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors">
          <TeamBadge team={null} size={44} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Free Agents</div>
            <div className="text-xs text-muted">
              {freeAgents.length} available{ctx.captainTeam && freeAgents.length > 0 ? " · tap to draft" : ""}
            </div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Link>
      </section>
    </div>
  );
}

function TeamCard({ ctx, team, big = false }: { ctx: LeagueContext; team: Team; big?: boolean }) {
  const record = ctx.records.get(team.id)!;
  const rank = ctx.ranked.findIndex((t) => t.id === team.id) + 1;
  const roster = rosterOf(ctx, team.id);
  const captain = team.captain_id ? ctx.memberById.get(team.captain_id) : null;
  const rated = roster.map((m) => ctx.ovrByMember.get(m.id)).filter((v): v is number => v != null);
  const avg = rated.length ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : null;

  return (
    <Link
      href={`/l/${ctx.league.id}/teams/${team.id}`}
      className={`card relative overflow-hidden flex items-center gap-3 hover:bg-surface-2 transition-colors ${big ? "p-4" : "p-3"}`}
      style={{ borderLeft: `4px solid ${team.color}` }}
    >
      {big && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(110deg, color-mix(in srgb, ${team.color} 30%, transparent), transparent 70%)` }}
        />
      )}
      <TeamBadge team={team} size={big ? 56 : 44} className="relative" />
      <div className="relative flex-1 min-w-0">
        <div className={`font-semibold truncate ${big ? "display text-2xl" : ""}`}>{team.name}</div>
        <div className="text-xs text-muted truncate mt-0.5">
          {captain ? (
            <>
              <Crown size={11} className="inline -mt-0.5" /> {captain.display_name}
            </>
          ) : (
            "No captain yet"
          )}
          {" · "}
          {roster.length} player{roster.length === 1 ? "" : "s"}
          {avg != null && ` · ${avg} avg OVR`}
        </div>
      </div>
      <div className="relative text-right shrink-0">
        <div className="display text-xl tabular">{recordString(record)}</div>
        {record.played > 0 && <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{ordinal(rank)}</div>}
      </div>
      <ChevronRight size={18} className="relative text-muted -mr-1" />
    </Link>
  );
}
