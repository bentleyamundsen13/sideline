import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagueContext } from "@/lib/league";
import { loadTrades, statusMeta } from "@/lib/trades";
import { BackHeader } from "@/components/back-header";
import { Avatar, OvrBadge, TeamBadge } from "@/components/ui";
import { TradeActions } from "@/components/trade-actions";
import { timeAgo } from "@/lib/format";
import type { Team } from "@/lib/types";

export const metadata = { title: "Trade" };

export default async function TradePage({ params }: PageProps<"/l/[leagueId]/trades/[tradeId]">) {
  const { leagueId, tradeId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const [trade] = await loadTrades(ctx, { id: tradeId });
  if (!trade) notFound();

  const { teamById, memberById, ovrByMember, captainTeam } = ctx;
  const base = `/l/${leagueId}`;
  const prop = teamById.get(trade.proposer_team_id);
  const recv = teamById.get(trade.receiver_team_id);
  const proposer = trade.proposer_id ? memberById.get(trade.proposer_id) : null;
  const status = statusMeta[trade.status];

  const isReceiver = captainTeam?.id === trade.receiver_team_id;
  const isProposer = captainTeam?.id === trade.proposer_team_id;
  const pending = trade.status === "pending";

  const side = (from: Team | undefined, to: Team | undefined) => {
    const players = trade.trade_players.filter((tp) => tp.from_team_id === from?.id);
    return (
      <section className="card overflow-hidden">
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b border-line"
          style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${to?.color ?? "#64748b"} 22%, transparent), transparent)` }}
        >
          <TeamBadge team={to ?? null} size={28} />
          <div className="text-sm">
            <span className="font-semibold">{to?.name}</span> <span className="text-muted">receive</span>
          </div>
        </div>
        <div className="divide-y divide-line">
          {players.map((tp) => {
            const m = memberById.get(tp.member_id);
            if (!m) return null;
            return (
              <Link key={tp.member_id} href={`${base}/players/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
                <Avatar member={m} color={from?.color} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.display_name}</div>
                  <div className="text-xs text-muted truncate">
                    {[m.offense_position, m.defense_position].filter(Boolean).join(" / ")} · from {from?.name}
                  </div>
                </div>
                <OvrBadge ovr={ovrByMember.get(m.id) ?? null} />
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <BackHeader href={`${base}/trades`} label="Trades" />

      <div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${status.className}`}>
          {status.label}
        </span>
        <h1 className="display text-4xl mt-3">
          {prop?.name} <span className="text-muted">⇄</span> {recv?.name}
        </h1>
        <p className="text-sm text-muted mt-1">
          Proposed by {proposer?.display_name ?? prop?.name} · {timeAgo(trade.created_at)}
          {trade.parent_id && (
            <>
              {" · "}
              <Link href={`${base}/trades/${trade.parent_id}`} className="underline underline-offset-2">
                counter to earlier offer
              </Link>
            </>
          )}
        </p>
      </div>

      {trade.message && (
        <blockquote className="card p-4 text-sm border-l-4" style={{ borderLeftColor: prop?.color }}>
          <span className="text-muted text-xs block mb-1">{proposer?.display_name ?? "Captain"} says:</span>
          {trade.message}
        </blockquote>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {side(prop, recv)}
        {side(recv, prop)}
      </div>

      {pending && (isReceiver || isProposer) && (
        <TradeActions leagueId={leagueId} tradeId={trade.id} role={isReceiver ? "receiver" : "proposer"} />
      )}
      {pending && !isReceiver && !isProposer && (
        <p className="text-sm text-muted text-center">Waiting on the {recv?.name} captain to respond.</p>
      )}
    </div>
  );
}
