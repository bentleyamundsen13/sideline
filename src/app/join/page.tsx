"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { FormError } from "@/components/form-error";
import { BackHeader } from "@/components/back-header";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { run, pending, error } = useAction();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const leagueId = await run(
      () => must(createClient().rpc("join_league", { p_code: code })) as Promise<string>,
      { refresh: false },
    );
    if (leagueId) router.push(`/l/${leagueId}/onboarding`);
  }

  return (
    <main className="mx-auto max-w-sm px-4 pt-6 pb-16">
      <BackHeader href="/" />
      <form onSubmit={onSubmit} className="mt-10 space-y-6 animate-fade-up">
        <div>
          <h1 className="display text-4xl">Join a league</h1>
          <p className="text-muted text-sm mt-2">Enter the 6-character code your commissioner shared.</p>
        </div>
        <input
          aria-label="League code"
          className="input text-center display !text-4xl tracking-[0.3em] uppercase !py-4"
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        />
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending || code.length !== 6}>
          {pending ? "Finding league…" : "Join League"}
        </button>
      </form>
    </main>
  );
}
