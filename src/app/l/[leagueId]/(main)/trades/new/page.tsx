import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getLeagueContext, rosterOf } from "@/lib/league";
import { loadTrades } from "@/lib/trades";
import { BackHeader } from "@/components/back-header";
import { EmptyState, TeamBadge } from "@/components/ui";
import { TradeBuilder, type BuilderPlayer } from "@/components/trade-builder";
import { TeamTheme } from "@/components/team-theme";
import { recordString } from "@/lib/format";

export const metadata = { title: "New trade" };

export default async function NewTradePage({ params, searchParams }: PageProps<"/l/[leagueId]/trades/new">) {
  const { leagueId } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const ctx = await getLeagueContext(leagueId);
  const { captainTeam, teams, teamById, memberById, ovrByMember, records } = ctx;
  const base = `/l/${leagueId}`;

  if (!captainTeam) {
    return (
      <div className="animate-fade-up space-y-6">
        <BackHeader href={`${base}/trades`} label="Trades" />
        <EmptyState title="Captains only" body="Only team captains can propose trades." />
      </div>
    );
  }

  // Figure out who we're trading with and what's pre-selected.
  let otherTeamId: string | undefined = one(sp.team);
  let send: string[] = [];
  let receive: string[] = [];
  let counterOf: string | null = null;

  const counterId = one(sp.counter);
  const targetId = one(sp.target);
  if (counterId) {
    const [parent] = await loadTrades(ctx, { id: counterId });
    if (parent && parent.status === "pending" && parent.receiver_team_id === captainTeam.id) {
      counterOf = parent.id;
      otherTeamId = parent.proposer_team_id;
      // Start from their offer, flipped to our side.
      send = parent.trade_players.filter((tp) => tp.from_team_id === captainTeam.id).map((tp) => tp.member_id);
      receive = parent.trade_players.filter((tp) => tp.from_team_id === parent.proposer_team_id).map((tp) => tp.member_id);
    }
  } else if (targetId) {
    const target = memberById.get(targetId);
    if (target?.team_id && target.team_id !== captainTeam.id) {
      otherTeamId = target.team_id;
      receive = [target.id];
    }
  }

  const other = otherTeamId ? teamById.get(otherTeamId) : undefined;

  if (!other || other.id === captainTeam.id) {
    const options = teams.filter((t) => t.id !== captainTeam.id);
    return (
      <div className="animate-fade-up space-y-6">
        <BackHeader href={`${base}/trades`} label="Trades" />
        <div>
          <h1 className="display text-4xl">Trade with…</h1>
          <p className="text-sm text-muted mt-1">Pick a team to start building an offer.</p>
        </div>
        {options.length === 0 ? (
          <EmptyState title="No other teams yet" />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {options.map((t) => (
              <Link key={t.id} href={`${base}/trades/new?team=${t.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors">
                <TeamBadge team={t} size={40} />
                <div className="flex-1">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted">{recordString(records.get(t.id)!)}</div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const toPlayers = (teamId: string, captainId: string | null): BuilderPlayer[] =>
    rosterOf(ctx, teamId)
      .filter((m) => m.id !== captainId)
      .map((m) => ({
        id: m.id,
        name: m.display_name,
        avatar_url: m.avatar_url,
        positions: [m.offense_position, m.defense_position].filter(Boolean).join(" / "),
        ovr: ovrByMember.get(m.id) ?? null,
      }));

  return (
    <div className="animate-fade-up space-y-6">
      <TeamTheme color={other.color} />
      <BackHeader href={counterOf ? `${base}/trades/${counterOf}` : `${base}/trades`} label={counterOf ? "Original offer" : "Trades"} />
      <div>
        <h1 className="display text-4xl">{counterOf ? "Counter offer" : "Build a trade"}</h1>
        <p className="text-sm text-muted mt-1">
          {captainTeam.name} ⇄ {other.name}. Captains can&apos;t be traded.
        </p>
      </div>
      <TradeBuilder
        leagueId={leagueId}
        myTeam={{ id: captainTeam.id, name: captainTeam.name, abbr: captainTeam.abbr, color: captainTeam.color }}
        theirTeam={{ id: other.id, name: other.name, abbr: other.abbr, color: other.color }}
        myPlayers={toPlayers(captainTeam.id, captainTeam.captain_id)}
        theirPlayers={toPlayers(other.id, other.captain_id)}
        initialSend={send}
        initialReceive={receive}
        counterOf={counterOf}
      />
    </div>
  );
}
