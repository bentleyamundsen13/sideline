"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Crown, Dices, Minus, Palette, Plus, RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { abbrFromName, formatHeight } from "@/lib/format";
import {
  describeSizes,
  pickCaptain,
  rollTeams,
  teamAverages,
  teamSizes,
  toughName,
  type RollPlayer,
  type RolledTeam,
} from "@/lib/team-roll";
import { Avatar, TeamBadge } from "./ui";
import { ColorPicker } from "./color-picker";
import { FormError } from "./form-error";

/**
 * Commissioner: generate fair teams from everyone's OVR, positions and size,
 * review and tweak them, then Confirm (or Decline). Nothing changes until Confirm.
 */
export function TeamRoller({
  leagueId,
  players,
  currentTeams,
  teamsWithGames,
}: {
  leagueId: string;
  players: RollPlayer[];
  currentTeams: string[];
  teamsWithGames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [sittingOut, setSittingOut] = useState<Set<string>>(new Set());
  const [showWho, setShowWho] = useState(false);
  const playing = players.filter((p) => !sittingOut.has(p.id));
  const maxTeams = Math.max(2, Math.min(12, Math.floor(playing.length / 2)));
  const [count, setCount] = useState(() => Math.min(maxTeams, Math.max(2, Math.round(players.length / 5))));
  const teamCount = Math.min(count, maxTeams);
  const [rolled, setRolled] = useState<RolledTeam[] | null>(null);
  const enough = playing.length >= 4;

  const roll = () => setRolled(rollTeams(playing, teamCount, teamsWithGames));

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-2 transition-colors" aria-expanded={open}>
        <span className="w-10 h-10 shrink-0 rounded-xl bg-brand text-bg inline-flex items-center justify-center">
          <Dices size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Roll New Teams</div>
          <div className="text-xs text-muted">Fair teams from everyone&apos;s OVR, positions and size. You review before anything changes.</div>
        </div>
        <ChevronDown size={18} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-3 space-y-4 border-t border-line">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="label !mb-0">Number of teams</div>
              <div className="text-xs text-muted mt-0.5">
                {enough ? `${playing.length} players: ${describeSizes(teamSizes(playing.length, teamCount))}` : "Need at least 4 players."}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-10 h-10 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center disabled:opacity-40"
                onClick={() => setCount(Math.max(2, teamCount - 1))}
                disabled={teamCount <= 2}
                aria-label="Fewer teams"
              >
                <Minus size={16} />
              </button>
              <span className="display text-3xl w-8 text-center tabular">{teamCount}</span>
              <button
                type="button"
                className="w-10 h-10 rounded-xl bg-surface-2 border border-line inline-flex items-center justify-center disabled:opacity-40"
                onClick={() => setCount(Math.min(maxTeams, teamCount + 1))}
                disabled={teamCount >= maxTeams}
                aria-label="More teams"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <button type="button" className="text-sm font-semibold inline-flex items-center gap-1" onClick={() => setShowWho((s) => !s)} aria-expanded={showWho}>
              Who&apos;s playing ({playing.length} of {players.length})
              <ChevronDown size={15} className={`text-muted transition-transform ${showWho ? "rotate-180" : ""}`} />
            </button>
            {showWho && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {players.map((p) => {
                  const on = !sittingOut.has(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer ${on ? "border-line bg-surface-2" : "border-line/50 text-muted"}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setSittingOut((s) => {
                            const next = new Set(s);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          })
                        }
                        className="accent-[var(--brand)]"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted mt-1.5">Anyone sitting out ends up a free agent.</p>
          </div>

          <button type="button" className="btn btn-primary w-full" disabled={!enough} onClick={roll}>
            <Dices size={16} /> Roll teams
          </button>
        </div>
      )}

      {rolled && (
        <RollReview
          leagueId={leagueId}
          players={playing}
          teams={rolled}
          setTeams={setRolled}
          reroll={roll}
          currentTeams={currentTeams}
          teamsWithGames={teamsWithGames}
          onDone={() => {
            setRolled(null);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RollReview({
  leagueId,
  players,
  teams,
  setTeams,
  reroll,
  currentTeams,
  teamsWithGames,
  onDone,
}: {
  leagueId: string;
  players: RollPlayer[];
  teams: RolledTeam[];
  setTeams: (t: RolledTeam[]) => void;
  reroll: () => void;
  currentTeams: string[];
  teamsWithGames: string[];
  onDone: () => void;
}) {
  const { run, pending, error } = useAction();
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const stats = teams.map((t) => teamAverages(t.playerIds, byId));
  const ovrs = stats.map((s) => s.ovr).filter((o): o is number => o != null);
  const spread = ovrs.length ? Math.max(...ovrs) - Math.min(...ovrs) : null;

  const update = (key: string, patch: Partial<RolledTeam>) => setTeams(teams.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  function move(playerId: string, from: string, to: string) {
    setTeams(
      teams.map((t) => {
        if (t.key === from) {
          const ids = t.playerIds.filter((id) => id !== playerId);
          return { ...t, playerIds: ids, captainId: t.captainId === playerId ? pickCaptain(ids) : t.captainId };
        }
        if (t.key === to) {
          const ids = [...t.playerIds, playerId];
          return { ...t, playerIds: ids, captainId: t.captainId ?? playerId };
        }
        return t;
      }),
    );
  }

  // Names must be valid and unique (including old teams that are being kept for their games).
  const problems: string[] = [];
  const lower = teams.map((t) => t.name.trim().toLowerCase());
  teams.forEach((t, i) => {
    if (t.name.trim().length < 2) problems.push("Every team needs a name.");
    else if (lower.indexOf(lower[i]) !== i) problems.push(`Two teams are called "${t.name.trim()}".`);
    else if (teamsWithGames.some((n) => n.toLowerCase() === lower[i])) problems.push(`"${t.name.trim()}" is taken by an old team with games.`);
    if (t.abbr.length < 2) problems.push(`${t.name || "A team"} needs a 2-4 letter abbreviation.`);
    if (t.playerIds.length === 0) problems.push(`${t.name || "A team"} has no players.`);
  });
  const problem = [...new Set(problems)][0] ?? null;

  async function confirmTeams() {
    const removed = currentTeams.filter((n) => !teamsWithGames.includes(n));
    const lines = [
      `Make these ${teams.length} teams official?`,
      removed.length ? `\nRemoves: ${removed.join(", ")}.` : "",
      teamsWithGames.length ? `\nKept for their game history (with no players): ${teamsWithGames.join(", ")}.` : "",
      "\nPending trades are cancelled and everyone gets a notification.",
    ];
    if (!confirm(lines.join(""))) return;
    const ok = await run(async () => {
      await must(
        createClient().rpc("apply_team_roll", {
          p_league: leagueId,
          p_teams: teams.map((t) => ({
            name: t.name.trim(),
            abbr: t.abbr,
            color: t.color,
            captain_id: t.captainId,
            member_ids: t.playerIds,
          })),
        }),
      );
      return true;
    });
    if (ok) onDone();
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-bg flex flex-col animate-fade-up" role="dialog" aria-modal="true" aria-label="Review new teams">
      <div className="border-b border-line" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto max-w-3xl flex items-center gap-2 px-4 py-2 min-h-14">
          <div className="flex-1 min-w-0">
            <div className="display text-xl truncate">Review new teams</div>
            <div className="text-xs text-muted">
              {describeSizes(teams.map((t) => t.playerIds.length))}
              {spread != null && (Math.round(spread) === 0 ? " · Avg OVR even" : ` · Avg OVR within ${Math.round(spread)} of each other`)}
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-surface-2 inline-flex items-center justify-center" onClick={onDone} aria-label="Decline and close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-4 grid gap-3 sm:grid-cols-2">
          {teams.map((t, i) => (
            <RolledTeamCard
              key={t.key}
              team={t}
              stats={stats[i]}
              byId={byId}
              others={teams.filter((o) => o.key !== t.key)}
              onChange={(patch) => update(t.key, patch)}
              onReName={() => {
                const name = toughName([...teams.map((o) => o.name), ...teamsWithGames]);
                update(t.key, { name, abbr: abbrFromName(name) });
              }}
              onMove={(pid, to) => move(pid, t.key, to)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-line bg-bg" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-3xl px-4 pt-3 space-y-2">
          {(problem || error) && <FormError error={problem ?? error} />}
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={onDone} disabled={pending}>
              Decline
            </button>
            <button className="btn btn-secondary" onClick={reroll} disabled={pending} aria-label="Roll again">
              <RefreshCw size={16} /> Re-roll
            </button>
            <button className="btn btn-primary flex-1" onClick={confirmTeams} disabled={pending || !!problem}>
              {pending ? "Saving…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RolledTeamCard({
  team,
  stats,
  byId,
  others,
  onChange,
  onReName,
  onMove,
}: {
  team: RolledTeam;
  stats: { ovr: number | null; height: number | null; weight: number | null };
  byId: Map<string, RollPlayer>;
  others: RolledTeam[];
  onChange: (patch: Partial<RolledTeam>) => void;
  onReName: () => void;
  onMove: (playerId: string, toKey: string) => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);
  const tiles = [
    { label: "AVG OVR", value: stats.ovr != null ? Math.round(stats.ovr) : "—" },
    { label: "AVG HT", value: stats.height != null ? formatHeight(Math.round(stats.height)) : "—" },
    { label: "AVG WT", value: stats.weight != null ? Math.round(stats.weight) : "—" },
    { label: "PLAYERS", value: team.playerIds.length },
  ];

  return (
    <div className="card overflow-hidden" style={{ borderTop: `3px solid ${team.color}` }}>
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <TeamBadge team={{ abbr: team.abbr || "?", color: team.color }} size={40} />
          <input
            aria-label="Team name"
            className="input flex-1 min-w-0 !h-10 font-semibold"
            maxLength={40}
            value={team.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <input
            aria-label="Abbreviation"
            className="input w-16 !h-10 uppercase text-center"
            maxLength={4}
            value={team.abbr}
            onChange={(e) => onChange({ abbr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReName}>
            <Dices size={14} /> New name
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColorOpen((o) => !o)} aria-expanded={colorOpen}>
            <Palette size={14} /> Color
          </button>
        </div>
        {colorOpen && <ColorPicker value={team.color} onChange={(color) => onChange({ color })} />}
      </div>

      <div className="grid grid-cols-4 gap-px bg-line border-y border-line">
        {tiles.map((s) => (
          <div key={s.label} className="bg-surface px-1 py-2 text-center">
            <div className="display text-xl tabular">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-line">
        {team.playerIds.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          const captain = team.captainId === id;
          return (
            <li key={id} className="flex items-center gap-2 px-3 py-2">
              <Avatar member={{ display_name: p.name, avatar_url: p.avatar_url }} color={team.color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {p.name}
                  {captain && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">Captain</span>}
                </div>
                <div className="text-xs text-muted truncate">
                  {[p.offense_position, p.defense_position].filter(Boolean).join(" / ") || "No position"}
                  {p.height_in ? ` · ${formatHeight(p.height_in)}` : ""}
                  {p.weight_lb ? ` · ${p.weight_lb} lb` : ""}
                </div>
              </div>
              <span className="display text-lg tabular min-w-7 text-right">{p.ovr ?? "—"}</span>
              <button
                type="button"
                onClick={() => onChange({ captainId: id })}
                className={`w-8 h-8 rounded-lg inline-flex items-center justify-center ${captain ? "text-amber-300" : "text-muted/50 hover:text-text"}`}
                aria-label={captain ? `${p.name} is captain` : `Make ${p.name} captain`}
                aria-pressed={captain}
              >
                <Crown size={15} />
              </button>
              <select
                aria-label={`Move ${p.name} to another team`}
                className="input !h-8 !w-auto !py-0 !px-1.5 text-xs"
                value=""
                onChange={(e) => e.target.value && onMove(id, e.target.value)}
              >
                <option value="">Move</option>
                {others.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.abbr || o.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
