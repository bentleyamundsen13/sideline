"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import type { StatLine } from "@/lib/types";
import { FormError } from "./form-error";
import { Counter, FIELDS, PASS_FIELDS, empty, withCount, type Key } from "./stat-logger";

/** Commissioner only: set a player's OVR by hand, or go back to the one from their stats. */
export function OvrOverride({
  memberId,
  firstName,
  override,
  calculated,
}: {
  memberId: string;
  firstName: string;
  override: number | null;
  calculated: number | null;
}) {
  const { run, pending, error } = useAction();
  const [value, setValue] = useState(String(override ?? calculated ?? 70));
  const n = Number(value);
  // Any number, for fun. Stats-based OVR stays 40-99.
  const valid = value.trim() !== "" && Number.isInteger(n) && n >= -999 && n <= 9999;

  const save = (ovr: number | null) =>
    run(() => must(createClient().rpc("set_ovr_override", { p_member: memberId, p_ovr: ovr })));

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield size={15} className="text-muted" />
        <h2 className="section-title flex-1">Commissioner: OVR</h2>
      </div>
      <p className="text-sm text-muted">
        {override != null ? (
          <>
            You set {firstName}&apos;s OVR to <span className="text-text font-semibold">{override}</span>. From their stats it
            would be {calculated ?? "unrated"}.
          </>
        ) : (
          <>
            From {firstName}&apos;s stats: <span className="text-text font-semibold">{calculated ?? "not rated yet"}</span>. Set a
            number to replace it, or fix a game in the log below.
          </>
        )}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save(n);
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min={-999}
          max={9999}
          aria-label="OVR"
          className="input w-24 text-center display text-xl tabular"
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn btn-primary flex-1" disabled={pending || !valid || n === override}>
          Set OVR
        </button>
        {override != null && (
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => save(null)}>
            Use stats
          </button>
        )}
      </form>
      {!valid && value !== "" && <p className="text-xs text-danger">Pick a whole number from -999 to 9999.</p>}
      <FormError error={error} />
    </section>
  );
}

/** Commissioner only: a pencil on a game-log row that opens that game's stats to fix or delete. */
export function EditStatLineButton({ line, label, playerName }: { line: StatLine; label: string; playerName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="w-8 h-8 -my-1 shrink-0 rounded-lg inline-flex items-center justify-center text-muted hover:text-text hover:bg-surface-2"
        onClick={() => setOpen(true)}
        aria-label={`Fix ${playerName}'s stats for ${label}`}
      >
        <Pencil size={14} />
      </button>
      {open && <StatLineEditor line={line} label={label} playerName={playerName} onClose={() => setOpen(false)} />}
    </>
  );
}

function StatLineEditor({ line, label, playerName, onClose }: { line: StatLine; label: string; playerName: string; onClose: () => void }) {
  const { run, pending, error } = useAction();
  const [counts, setCounts] = useState<Record<Key, number>>(() => {
    const c = { ...empty };
    for (const k of Object.keys(c) as Key[]) c[k] = line[k] ?? 0;
    return c;
  });
  const [showPassing, setShowPassing] = useState(Boolean(line.pass_attempts || line.pass_tds || line.ints_thrown));
  const setCount = (k: Key, raw: number) => setCounts((c) => withCount(c, k, raw));

  async function save() {
    const { pass_attempts, pass_completions, pass_tds, ints_thrown, ...rest } = counts;
    // Only touch passing columns when this game has passing, like logging does.
    const passing = showPassing ? { pass_attempts, pass_completions, pass_tds, ints_thrown } : {};
    const ok = await run(async () => {
      const rows = await must(createClient().from("stat_lines").update({ ...rest, ...passing }).eq("id", line.id).select("id"));
      // Row-level security skips rows you can't edit instead of erroring.
      if (!rows?.length) throw new Error("Couldn't save. Only the commissioner can fix other players' stats.");
      return true;
    });
    if (ok) onClose();
  }

  async function remove() {
    if (!confirm(`Delete ${playerName}'s stats for this game?`)) return;
    const ok = await run(() => must(createClient().from("stat_lines").delete().eq("id", line.id)));
    if (ok !== undefined) onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end sm:items-center justify-center animate-fade-up" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Fix stats: ${label}`}
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col bg-bg border border-line rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <div className="flex-1 min-w-0">
            <div className="display text-lg truncate">Fix {playerName.split(" ")[0]}&apos;s stats</div>
            <div className="text-xs text-muted truncate">{label}</div>
          </div>
          <button className="w-9 h-9 rounded-full bg-surface-2 inline-flex items-center justify-center" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showPassing ? (
            <div className="card divide-y divide-line">
              {PASS_FIELDS.map((f) => (
                <Counter key={f.key} label={f.label} hint={f.hint} good={f.good} value={counts[f.key]} onChange={(v) => setCount(f.key, v)} />
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-secondary w-full" onClick={() => setShowPassing(true)}>
              <Plus size={16} /> Add passing stats
            </button>
          )}
          <div className="card divide-y divide-line">
            {FIELDS.map((f) => (
              <Counter key={f.key} label={f.label} hint={f.hint} good={f.good} value={counts[f.key]} onChange={(v) => setCount(f.key, v)} />
            ))}
          </div>
          <FormError error={error} />
        </div>

        <div className="flex gap-2 p-4 border-t border-line pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button className="btn btn-secondary text-danger" onClick={remove} disabled={pending} aria-label="Delete this game">
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-primary flex-1" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
