"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import type { RsvpInfo } from "@/lib/league";

/** "5 in · 1 out" plus I'm in / Out buttons on an upcoming game. Updates instantly. */
export function RsvpBar({ info }: { info: RsvpInfo }) {
  const { run, error } = useAction();
  const [mine, setMine] = useState(info.mine);

  // Counts shift immediately with your tap; the server catches up in the background.
  const count = { ...info.count };
  if (info.mine) count[info.mine]--;
  if (mine) count[mine]++;

  function choose(next: "in" | "out") {
    const value = mine === next ? null : next; // tapping your answer again clears it
    const previous = mine;
    setMine(value);
    run(async () => {
      const supabase = createClient();
      const res = value
        ? await must(
            supabase
              .from("game_rsvps")
              .upsert({ game_id: info.gameId, member_id: info.memberId, league_id: info.leagueId, status: value, updated_at: new Date().toISOString() }),
          )
        : await must(supabase.from("game_rsvps").delete().eq("game_id", info.gameId).eq("member_id", info.memberId));
      return res;
    }).then((ok) => {
      if (ok === undefined) setMine(previous);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
      <div className="flex-1 text-xs text-muted tabular">
        <span className={count.in ? "text-success font-semibold" : ""}>{count.in} in</span>
        {count.out > 0 && <span> · {count.out} out</span>}
        {error && <span className="block text-danger">{error}</span>}
      </div>
      {info.canRsvp && (
        <div className="flex gap-1.5" role="group" aria-label="Are you playing?">
          <button
            type="button"
            onClick={() => choose("in")}
            aria-pressed={mine === "in"}
            className={`btn btn-sm !px-3 border ${
              mine === "in" ? "bg-success text-bg border-success" : "bg-surface-2 border-line text-text"
            }`}
          >
            <Check size={14} strokeWidth={3} /> I&apos;m in
          </button>
          <button
            type="button"
            onClick={() => choose("out")}
            aria-pressed={mine === "out"}
            className={`btn btn-sm !px-3 border ${
              mine === "out" ? "bg-danger text-white border-danger" : "bg-surface-2 border-line text-muted"
            }`}
          >
            <X size={14} strokeWidth={3} /> Out
          </button>
        </div>
      )}
    </div>
  );
}
