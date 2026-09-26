"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./ui";

export type LeaderRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  teamName: string;
  teamColor: string | null;
  games: number;
  stats: Record<string, number | null>;
};

export type LeaderCategory = { key: string; label: string; unit?: string };

/** Pick a stat, see everyone ranked. Players with none of that stat are left off. */
export function Leaderboard({ leagueId, rows, categories }: { leagueId: string; rows: LeaderRow[]; categories: LeaderCategory[] }) {
  const [active, setActive] = useState(categories[0].key);
  const cat = categories.find((c) => c.key === active)!;
  const ranked = rows
    .filter((r) => (r.stats[active] ?? 0) > 0)
    .sort((a, b) => (b.stats[active] ?? 0) - (a.stats[active] ?? 0) || a.name.localeCompare(b.name));

  const medal = ["bg-amber-300 text-bg", "bg-slate-300 text-bg", "bg-orange-400 text-bg"];

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="tablist" aria-label="Stat">
        {categories.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={c.key === active}
            onClick={() => setActive(c.key)}
            className={`shrink-0 rounded-full px-3.5 h-9 text-sm font-semibold border transition-colors ${
              c.key === active ? "bg-text text-bg border-text" : "bg-surface border-line text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">Nobody has any {cat.label.toLowerCase()} yet.</div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {ranked.map((r) => {
            // Ties share a rank.
            const rank = ranked.findIndex((x) => (x.stats[active] ?? 0) === (r.stats[active] ?? 0)) + 1;
            return (
              <Link key={r.id} href={`/l/${leagueId}/players/${r.id}`} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={`w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-xs font-bold tabular ${
                    rank <= 3 ? medal[rank - 1] : "text-muted"
                  }`}
                >
                  {rank}
                </span>
                <Avatar member={{ display_name: r.name, avatar_url: r.avatarUrl }} color={r.teamColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.name}</div>
                  <div className="text-xs text-muted truncate">
                    {r.teamName} · {r.games} GP
                  </div>
                </div>
                <span className={`display tabular ${rank === 1 ? "text-3xl" : "text-2xl"}`}>
                  {r.stats[active]}
                  {cat.unit && <span className="text-sm text-muted ml-0.5">{cat.unit}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
