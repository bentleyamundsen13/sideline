"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";

export function DraftButton({
  memberId,
  playerName,
  teamName,
  full = false,
}: {
  memberId: string;
  playerName: string;
  teamName: string;
  full?: boolean;
}) {
  const { run, pending, error } = useAction();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={full ? "w-full" : "text-right"}>
      {confirming ? (
        <div className={`flex items-center gap-1.5 ${full ? "w-full" : ""}`}>
          <button
            className={`btn btn-accent btn-sm ${full ? "flex-1" : ""}`}
            disabled={pending}
            onClick={() => run(() => must(createClient().rpc("draft_player", { p_member: memberId })))}
          >
            {pending ? "Drafting…" : `Draft to ${teamName}`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={`btn btn-secondary btn-sm ${full ? "w-full" : ""}`}
          onClick={() => setConfirming(true)}
          aria-label={`Draft ${playerName}`}
        >
          <UserPlus size={14} /> Draft
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
