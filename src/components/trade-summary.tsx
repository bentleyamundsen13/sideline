import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import type { LeagueContext } from "@/lib/league";
import { statusMeta, type TradeWithPlayers } from "@/lib/trades";
import { timeAgo } from "@/lib/format";
import { TeamBadge } from "./ui";

export function TradeSummary({ trade, ctx }: { trade: TradeWithPlayers; ctx: LeagueContext }) {
  const prop = ctx.teamById.get(trade.proposer_team_id);
  const recv = ctx.teamById.get(trade.receiver_team_id);
  const names = (teamId: string) =>
    trade.trade_players
      .filter((tp) => tp.from_team_id === teamId)
      .map((tp) => ctx.memberById.get(tp.member_id)?.display_name ?? "Former player")
      .join(", ") || "Nobody";
  const status = statusMeta[trade.status];

  return (
    <Link href={`/l/${ctx.league.id}/trades/${trade.id}`} className="block p-4 hover:bg-surface-2 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${status.className}`}>
          {status.label}
        </span>
        <span className="text-xs text-muted">{timeAgo(trade.created_at)}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TeamBadge team={prop ?? null} size={24} />
            <span className="text-xs font-semibold truncate">{prop?.name}</span>
          </div>
          <div className="text-sm mt-1.5 line-clamp-2">{names(trade.proposer_team_id)}</div>
        </div>
        <ArrowLeftRight size={16} className="text-muted" />
        <div className="min-w-0 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-semibold truncate">{recv?.name}</span>
            <TeamBadge team={recv ?? null} size={24} />
          </div>
          <div className="text-sm mt-1.5 line-clamp-2">{names(trade.receiver_team_id)}</div>
        </div>
      </div>
    </Link>
  );
}
