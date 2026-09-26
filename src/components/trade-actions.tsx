"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Repeat, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { FormError } from "./form-error";

export function TradeActions({
  leagueId,
  tradeId,
  role,
}: {
  leagueId: string;
  tradeId: string;
  role: "receiver" | "proposer";
}) {
  const { run, pending, error } = useAction();
  const [notice, setNotice] = useState<string | null>(null);

  async function respond(accept: boolean) {
    const result = await run(
      () => must(createClient().rpc("respond_trade", { p_trade: tradeId, p_accept: accept })) as Promise<string>,
    );
    if (result === "invalid") setNotice("Rosters changed since this offer was made, so it was cancelled.");
  }

  if (role === "proposer") {
    return (
      <div className="space-y-2">
        <button
          className="btn btn-danger w-full"
          disabled={pending}
          onClick={() => run(() => must(createClient().rpc("cancel_trade", { p_trade: tradeId })))}
        >
          {pending ? "Withdrawing…" : "Withdraw Offer"}
        </button>
        <FormError error={error} />
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-danger" disabled={pending} onClick={() => respond(false)}>
          <X size={16} /> Decline
        </button>
        <button className="btn btn-primary" disabled={pending} onClick={() => respond(true)}>
          <Check size={16} /> Accept
        </button>
      </div>
      <Link href={`/l/${leagueId}/trades/new?counter=${tradeId}`} className="btn btn-secondary w-full">
        <Repeat size={16} /> Counter Offer
      </Link>
      <FormError error={error ?? notice} />
    </div>
  );
}
