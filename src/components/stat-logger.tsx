"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { completionPct, computeOvr, sumLines } from "@/lib/ovr";
import { formatGameDate } from "@/lib/format";
import type { StatLine } from "@/lib/types";
import { FormError } from "./form-error";
import { OvrBadge } from "./ui";

const FIELDS = [
  { key: "touchdowns", label: "Touchdowns", hint: "Ran it in or caught it", good: true },
  { key: "receptions", label: "Receptions", hint: "Catches", good: true },
  { key: "tackles", label: "Tackles", hint: "Stops (flag pulls count)", good: true },
  { key: "interceptions", label: "Interceptions", hint: "Picks on defense", good: true },
  { key: "pass_breakups", label: "Pass breakups", hint: "Knocked down or tipped a pass", good: true },
  { key: "drops", label: "Drops", hint: "Catchable balls dropped", good: false },
  { key: "fumbles", label: "Fumbles", hint: "Ball on the ground", good: false },
] as const;

const PASS_FIELDS = [
  { key: "pass_attempts", label: "Pass attempts", hint: "Every throw", good: true },
  { key: "pass_completions", label: "Completions", hint: "Throws that were caught", good: true },
  { key: "pass_tds", label: "TD passes", hint: "Touchdowns you threw", good: true },
  { key: "ints_thrown", label: "Interceptions thrown", hint: "Your passes the defense picked", good: false },
] as const;

type Key = (typeof FIELDS)[number]["key"] | (typeof PASS_FIELDS)[number]["key"];
const empty: Record<Key, number> = {
  touchdowns: 0,
  receptions: 0,
  interceptions: 0,
  pass_breakups: 0,
  tackles: 0,
  drops: 0,
  fumbles: 0,
  pass_attempts: 0,
  pass_completions: 0,
  pass_tds: 0,
  ints_thrown: 0,
};
const MAX: Partial<Record<Key, number>> = { pass_attempts: 200, pass_completions: 200, tackles: 100 };

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function StatLogger({
  leagueId,
  memberId,
  isQb,
  gameOptions,
  lines,
  lineLabels,
}: {
  leagueId: string;
  memberId: string;
  isQb: boolean;
  gameOptions: { id: string; label: string; date: string }[];
  lines: StatLine[];
  lineLabels: Record<string, string>;
}) {
  const { run, pending, error } = useAction();
  const [gameId, setGameId] = useState(gameOptions[0]?.id ?? "");
  const [date, setDate] = useState(localToday);
  const [counts, setCounts] = useState(empty);
  const [showPassing, setShowPassing] = useState(isQb);
  const [saved, setSaved] = useState(false);

  const currentOvr = computeOvr(sumLines(lines));
  const previewOvr = computeOvr(sumLines([...lines, counts]));

  /** Keeps completions <= attempts whichever one changes. */
  const setCount = (k: Key, raw: number) =>
    setCounts((c) => {
      const v = Math.max(0, Math.min(MAX[k] ?? 99, Math.round(raw) || 0));
      const next = { ...c, [k]: v };
      if (k === "pass_attempts" && next.pass_completions > v) next.pass_completions = v;
      if (k === "pass_completions" && v > next.pass_attempts) next.pass_attempts = v;
      return next;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const game = gameOptions.find((g) => g.id === gameId);
    // Only send passing columns when used, so non-QB logging never depends on them.
    const passing =
      counts.pass_attempts || counts.pass_tds || counts.ints_thrown
        ? {
            pass_attempts: counts.pass_attempts,
            pass_completions: counts.pass_completions,
            pass_tds: counts.pass_tds,
            ints_thrown: counts.ints_thrown,
          }
        : {};
    const ok = await run(async () => {
      await must(
        createClient()
          .from("stat_lines")
          .insert({
            league_id: leagueId,
            member_id: memberId,
            game_id: game?.id ?? null,
            played_on: game?.date ?? date,
            touchdowns: counts.touchdowns,
            receptions: counts.receptions,
            interceptions: counts.interceptions,
            drops: counts.drops,
            fumbles: counts.fumbles,
            ...(counts.pass_breakups ? { pass_breakups: counts.pass_breakups } : {}),
            ...(counts.tackles ? { tackles: counts.tackles } : {}),
            ...passing,
          }),
      );
      return true;
    });
    if (ok) {
      setCounts(empty);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const pct = completionPct(counts);

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4">
        <div className="card p-4 space-y-3">
          <div>
            <label className="label" htmlFor="game">Game</label>
            <select id="game" className="input" value={gameId} onChange={(e) => setGameId(e.target.value)}>
              {gameOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
              <option value="">Pickup / unscheduled game</option>
            </select>
          </div>
          {!gameId && (
            <div>
              <label className="label" htmlFor="date">Date played</label>
              <input id="date" type="date" className="input" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
        </div>

        {showPassing ? (
          <section>
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="section-title">Passing</h2>
              {pct != null && <span className="text-xs text-muted tabular">{pct}% completed</span>}
            </div>
            <div className="card divide-y divide-line">
              {PASS_FIELDS.map((f) => (
                <Counter key={f.key} label={f.label} hint={f.hint} good={f.good} value={counts[f.key]} onChange={(v) => setCount(f.key, v)} />
              ))}
            </div>
          </section>
        ) : (
          <button type="button" className="btn btn-secondary w-full" onClick={() => setShowPassing(true)}>
            <Plus size={16} /> I played QB (add passing stats)
          </button>
        )}

        <section>
          <h2 className="section-title px-1 mb-2">{showPassing ? "Running, catching & defense" : "Stats"}</h2>
          <div className="card divide-y divide-line">
            {FIELDS.map((f) => (
              <Counter key={f.key} label={f.label} hint={f.hint} good={f.good} value={counts[f.key]} onChange={(v) => setCount(f.key, v)} />
            ))}
          </div>
        </section>

        <div className="card p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted font-semibold">OVR after this game</div>
            <div className="text-sm text-muted mt-1">
              {currentOvr == null ? "Your first rating" : `Currently ${currentOvr}`}
              {currentOvr != null && previewOvr != null && previewOvr !== currentOvr && (
                <span className={previewOvr > currentOvr ? "text-success" : "text-danger"}>
                  {" "}
                  ({previewOvr > currentOvr ? "+" : ""}
                  {previewOvr - currentOvr})
                </span>
              )}
            </div>
          </div>
          <OvrBadge ovr={previewOvr} size="lg" />
        </div>

        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save game"}
        </button>
      </form>

      {lines.length > 0 && (
        <section>
          <h2 className="section-title mb-3 px-1">Logged games</h2>
          <div className="card divide-y divide-line">
            {lines.map((l) => (
              <LoggedLine key={l.id} line={l} label={lineLabels[l.id] ?? "Game"} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Counter({
  label,
  hint,
  good,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  good: boolean;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <button
        type="button"
        className="w-10 h-10 shrink-0 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label={`Fewer ${label}`}
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-12 bg-transparent text-center display text-3xl tabular outline-none rounded-lg focus:bg-surface-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${
          value > 0 ? (good ? "text-text" : "text-danger") : "text-muted"
        }`}
      />
      <button
        type="button"
        className="w-10 h-10 shrink-0 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center"
        onClick={() => onChange(value + 1)}
        aria-label={`More ${label}`}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function LoggedLine({ line, label }: { line: StatLine; label: string }) {
  const { run, pending } = useAction();
  const passing = line.pass_attempts
    ? `${line.pass_completions ?? 0}/${line.pass_attempts} passing` +
      (line.pass_tds ? `, ${line.pass_tds} TD` : "") +
      (line.ints_thrown ? `, ${line.ints_thrown} INT` : "")
    : null;
  const summary = [
    passing,
    line.touchdowns && `${line.touchdowns} TD`,
    line.receptions && `${line.receptions} REC`,
    line.tackles && `${line.tackles} TKL`,
    line.interceptions && `${line.interceptions} INT`,
    line.pass_breakups && `${line.pass_breakups} PBU`,
    line.drops && `${line.drops} DRP`,
    line.fumbles && `${line.fumbles} FUM`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          {label} <span className="text-muted font-normal">· {formatGameDate(line.played_on + "T12:00:00")}</span>
        </div>
        <div className="text-xs text-muted">{summary || "No stats"}</div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        aria-label="Delete this game"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this game's stats?")) run(() => must(createClient().from("stat_lines").delete().eq("id", line.id)));
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
