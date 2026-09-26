import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeagueContext } from "@/lib/league";
import { loadTrades } from "@/lib/trades";
import { TradeSummary } from "@/components/trade-summary";
import { EmptyState, SectionHeader } from "@/components/ui";

export const metadata = { title: "Trades" };

export default async function TradesPage({ params }: PageProps<"/l/[leagueId]/trades">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { captainTeam } = ctx;
  const trades = await loadTrades(ctx);

  const mine = (t: (typeof trades)[number]) =>
    captainTeam && (t.proposer_team_id === captainTeam.id || t.receiver_team_id === captainTeam.id);
  const incoming = trades.filter((t) => t.status === "pending" && t.receiver_team_id === captainTeam?.id);
  const outgoing = trades.filter((t) => t.status === "pending" && t.proposer_team_id === captainTeam?.id);
  const completed = trades.filter((t) => t.status === "accepted").slice(0, 15);
  const history = trades.filter((t) => mine(t) && t.status !== "pending" && t.status !== "accepted").slice(0, 15);
  const otherPending = ctx.isCommish ? trades.filter((t) => t.status === "pending" && !mine(t)) : [];

  const list = (items: typeof trades) => (
    <div className="card divide-y divide-line overflow-hidden">
      {items.map((t) => (
        <TradeSummary key={t.id} trade={t} ctx={ctx} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Trades</h1>
          <p className="text-sm text-muted mt-1">
            {captainTeam ? `Dealing for ${captainTeam.name}` : "Only captains can make trades. Completed deals show up here."}
          </p>
        </div>
        {captainTeam && ctx.teams.length > 1 && (
          <Link href={`/l/${leagueId}/trades/new`} className="btn btn-primary btn-sm">
            <Plus size={15} /> New trade
          </Link>
        )}
      </div>

      {captainTeam && (
        <>
          <section>
            <SectionHeader title={`Needs your response · ${incoming.length}`} />
            {incoming.length ? list(incoming) : <EmptyState title="No offers right now" />}
          </section>
          {outgoing.length > 0 && (
            <section>
              <SectionHeader title="Your offers" />
              {list(outgoing)}
            </section>
          )}
        </>
      )}

      {otherPending.length > 0 && (
        <section>
          <SectionHeader title="Pending around the league" />
          {list(otherPending)}
        </section>
      )}

      <section>
        <SectionHeader title="Completed trades" />
        {completed.length ? list(completed) : <EmptyState title="No trades yet" body="The trade market is quiet… for now." />}
      </section>

      {history.length > 0 && (
        <section>
          <SectionHeader title="Your history" />
          {list(history)}
        </section>
      )}
    </div>
  );
}
