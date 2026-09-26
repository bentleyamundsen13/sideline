"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { computeOvr, sumLines } from "@/lib/ovr";
import { formatGameDate } from "@/lib/format";
import type { StatLine } from "@/lib/types";
import { FormError } from "./form-error";
import { OvrBadge } from "./ui";

const FIELDS = [
  { key: "touchdowns", label: "Touchdowns", hint: "Scored or thrown", good: true },
  { key: "receptions", label: "Receptions", hint: "Catches", good: true },
  { key: "interceptions", label: "Interceptions", hint: "Picks on defense", good: true },
  { key: "drops", label: "Drops", hint: "Catchable balls dropped", good: false },
  { key: "fumbles", label: "Fumbles", hint: "Ball on the ground", good: false },
] as const;

type Key = (typeof FIELDS)[number]["key"];
const empty: Record<Key, number> = { touchdowns: 0, receptions: 0, interceptions: 0, drops: 0, fumbles: 0 };

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function StatLogger({
  leagueId,
  memberId,
  gameOptions,
  lines,
  lineLabels,
}: {
  leagueId: string;
  memberId: string;
  gameOptions: { id: string; label: string; date: string }[];
  lines: StatLine[];
  lineLabels: Record<string, string>;
}) {
  const { run, pending, error } = useAction();
  const [gameId, setGameId] = useState(gameOptions[0]?.id ?? "");
  const [date, setDate] = useState(localToday);
  const [counts, setCounts] = useState(empty);
  const [saved, setSaved] = useState(false);

  const currentOvr = computeOvr(sumLines(lines));
  const previewOvr = computeOvr(sumLines([...lines, counts]));

  const bump = (k: Key, d: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(99, c[k] + d)) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const game = gameOptions.find((g) => g.id === gameId);
    const ok = await run(async () => {
      await must(
        createClient()
          .from("stat_lines")
          .insert({
            league_id: leagueId,
            member_id: memberId,
            game_id: game?.id ?? null,
            played_on: game?.date ?? date,
            ...counts,
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

        <div className="card divide-y divide-line">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{f.label}</div>
                <div className="text-xs text-muted">{f.hint}</div>
              </div>
              <button type="button" className="w-10 h-10 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center disabled:opacity-40" onClick={() => bump(f.key, -1)} disabled={counts[f.key] === 0} aria-label={`Fewer ${f.label}`}>
                <Minus size={16} />
              </button>
              <span className={`display text-3xl w-10 text-center tabular ${counts[f.key] > 0 ? (f.good ? "text-text" : "text-danger") : "text-muted"}`}>
                {counts[f.key]}
              </span>
              <button type="button" className="w-10 h-10 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center" onClick={() => bump(f.key, 1)} aria-label={`More ${f.label}`}>
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>

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

function LoggedLine({ line, label }: { line: StatLine; label: string }) {
  const { run, pending } = useAction();
  const summary = [
    line.touchdowns && `${line.touchdowns} TD`,
    line.receptions && `${line.receptions} REC`,
    line.interceptions && `${line.interceptions} INT`,
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
