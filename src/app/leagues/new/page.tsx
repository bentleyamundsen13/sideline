"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { FormError } from "@/components/form-error";
import { BackHeader } from "@/components/back-header";
import { SPORTS } from "@/lib/constants";

export default function NewLeaguePage() {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [form, setForm] = useState({
    name: "",
    sport: SPORTS[0] as string,
    season: `${new Date().getFullYear()} Season`,
    location: "",
    description: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const leagueId = await run(
      () =>
        must(
          createClient().rpc("create_league", {
            p_name: form.name,
            p_sport: form.sport,
            p_season: form.season,
            p_location: form.location,
            p_description: form.description,
          }),
        ) as Promise<string>,
      { refresh: false },
    );
    if (leagueId) router.push(`/l/${leagueId}/onboarding`);
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6 pb-16">
      <BackHeader href="/" />
      <form onSubmit={onSubmit} className="mt-8 space-y-5 animate-fade-up">
        <div>
          <h1 className="display text-4xl">Create a league</h1>
          <p className="text-muted text-sm mt-2">
            You&apos;ll be the commissioner: you make the teams, pick captains, and set the schedule.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="name">League name</label>
          <input id="name" className="input" required minLength={2} maxLength={60} placeholder="The Backyard Bowl" value={form.name} onChange={set("name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sport">Sport</label>
            <select id="sport" className="input" value={form.sport} onChange={set("sport")}>
              {SPORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="season">Season</label>
            <input id="season" className="input" maxLength={30} value={form.season} onChange={set("season")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="location">Home field <span className="normal-case tracking-normal font-normal">(optional)</span></label>
          <input id="location" className="input" maxLength={60} placeholder="Jake's backyard" value={form.location} onChange={set("location")} />
        </div>
        <div>
          <label className="label" htmlFor="description">About <span className="normal-case tracking-normal font-normal">(optional)</span></label>
          <textarea id="description" className="input min-h-24" maxLength={300} placeholder="Sundays at 2. Two-hand touch. No blitzing until 3 Mississippi." value={form.description} onChange={set("description")} />
        </div>

        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Creating…" : "Create League"}
        </button>
      </form>
    </main>
  );
}
