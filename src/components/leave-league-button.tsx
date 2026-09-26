"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { FormError } from "./form-error";

export function LeaveLeagueButton({ memberId, leagueName }: { memberId: string; leagueName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { run, pending, error } = useAction();

  async function leave() {
    const ok = await run(async () => {
      await must(createClient().from("members").delete().eq("id", memberId));
      return true;
    }, { refresh: false });
    if (ok) {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex gap-2">
          <button className="btn btn-danger flex-1" onClick={leave} disabled={pending}>
            {pending ? "Leaving…" : `Yes, leave ${leagueName}`}
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost w-full text-danger" onClick={() => setConfirming(true)}>
          Leave league
        </button>
      )}
      <FormError error={error} />
    </div>
  );
}
