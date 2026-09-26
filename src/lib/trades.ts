import type { LeagueContext } from "./league";
import type { Trade, TradePlayer, TradeStatus } from "./types";

export type TradeWithPlayers = Trade & { trade_players: TradePlayer[] };

export async function loadTrades(ctx: LeagueContext, opts: { id?: string } = {}) {
  let q = ctx.supabase
    .from("trades")
    .select("*, trade_players(*)")
    .eq("league_id", ctx.league.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (opts.id) q = q.eq("id", opts.id);
  const { data } = await q;
  return (data ?? []) as TradeWithPlayers[];
}

export const statusMeta: Record<TradeStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  accepted: { label: "Accepted", className: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
  declined: { label: "Declined", className: "bg-rose-400/15 text-rose-300 border-rose-400/30" },
  countered: { label: "Countered", className: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
  cancelled: { label: "Cancelled", className: "bg-surface-2 text-muted border-line" },
};
