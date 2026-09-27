"use client";

import { useState } from "react";
import { Check, ChevronDown, Crown, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { abbrFromName, formatGameDate, formatGameTime } from "@/lib/format";
import { SPORTS, TEAM_COLORS } from "@/lib/constants";
import type { Game, League, Team } from "@/lib/types";
import { Avatar, TeamBadge } from "./ui";
import { FormError } from "./form-error";

type Player = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  team_id: string | null;
  onboarded: boolean;
  is_commissioner: boolean;
};

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <h2 className="display text-2xl">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {TEAM_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: c, boxShadow: value === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : undefined }}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
        >
          {value === c && <Check size={14} color="#fff" strokeWidth={3} />}
        </button>
      ))}
      <label className="w-8 h-8 rounded-full border border-dashed border-line inline-flex items-center justify-center cursor-pointer relative overflow-hidden" title="Custom color">
        <Plus size={14} className="text-muted" />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ Teams */

export function TeamsManager({ leagueId, teams, players }: { leagueId: string; teams: Team[]; players: Player[] }) {
  const { run, pending, error } = useAction();
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [abbrTouched, setAbbrTouched] = useState(false);
  const [color, setColor] = useState<string>(TEAM_COLORS[teams.length % TEAM_COLORS.length]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await must(
        createClient()
          .from("teams")
          .insert({ league_id: leagueId, name: name.trim(), abbr: (abbr || abbrFromName(name)).toUpperCase(), color }),
      );
      return true;
    });
    if (ok) {
      setName("");
      setAbbr("");
      setAbbrTouched(false);
      setColor(TEAM_COLORS[(teams.length + 1) % TEAM_COLORS.length]);
    }
  }

  const preview = { abbr: (abbr || abbrFromName(name || "New Team")).toUpperCase(), color };

  return (
    <Section id="teams" title="Teams" subtitle="Create teams, then name a captain for each. Captains draft the rest.">
      {teams.map((t) => (
        <TeamEditor key={t.id} team={t} players={players} />
      ))}

      <form onSubmit={create} className="card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <TeamBadge team={preview} size={48} />
          <div className="font-semibold">New team</div>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <div>
            <label className="label" htmlFor="team-name">Name</label>
            <input
              id="team-name"
              className="input"
              required
              minLength={2}
              maxLength={40}
              placeholder="Cul-de-sac Crushers"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!abbrTouched) setAbbr(abbrFromName(e.target.value));
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="team-abbr">Abbr</label>
            <input
              id="team-abbr"
              className="input uppercase text-center"
              required
              minLength={2}
              maxLength={4}
              value={abbr}
              onChange={(e) => {
                setAbbrTouched(true);
                setAbbr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              }}
            />
          </div>
        </div>
        <div>
          <span className="label">Team color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending || name.trim().length < 2}>
          <Plus size={16} /> {pending ? "Creating…" : "Create Team"}
        </button>
      </form>
    </Section>
  );
}

function TeamEditor({ team, players }: { team: Team; players: Player[] }) {
  const { run, pending, error } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [abbr, setAbbr] = useState(team.abbr);
  const [color, setColor] = useState(team.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const roster = players.filter((p) => p.team_id === team.id);
  const captain = players.find((p) => p.id === team.captain_id);
  const candidates = players.filter((p) => p.onboarded);
  const dirty = name !== team.name || abbr !== team.abbr || color !== team.color;

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-2 transition-colors" aria-expanded={open}>
        <TeamBadge team={{ abbr, color }} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{team.name}</div>
          <div className="text-xs text-muted truncate">
            {roster.length} player{roster.length === 1 ? "" : "s"} ·{" "}
            {captain ? (
              <>
                <Crown size={11} className="inline -mt-0.5" /> {captain.display_name}
              </>
            ) : (
              <span className="text-amber-300">No captain</span>
            )}
          </div>
        </div>
        <ChevronDown size={18} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-2 space-y-4 border-t border-line">
          <div>
            <label className="label" htmlFor={`cap-${team.id}`}>Captain</label>
            <select
              id={`cap-${team.id}`}
              className="input"
              value={team.captain_id ?? ""}
              disabled={pending}
              onChange={(e) => run(() => must(createClient().rpc("set_captain", { p_team: team.id, p_member: e.target.value || null })))}
            >
              <option value="">No captain</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                  {p.team_id && p.team_id !== team.id ? " (moves to this team)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1.5">The captain joins this team and can draft free agents and propose trades.</p>
          </div>

          <div className="grid grid-cols-[1fr_90px] gap-3">
            <div>
              <label className="label" htmlFor={`name-${team.id}`}>Name</label>
              <input id={`name-${team.id}`} className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor={`abbr-${team.id}`}>Abbr</label>
              <input
                id={`abbr-${team.id}`}
                className="input uppercase text-center"
                maxLength={4}
                value={abbr}
                onChange={(e) => setAbbr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
            </div>
          </div>
          <div>
            <span className="label">Color</span>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <FormError error={error} />
          <div className="flex gap-2">
            <button
              className="btn btn-primary flex-1"
              disabled={!dirty || pending || name.trim().length < 2 || abbr.length < 2}
              onClick={() => run(() => must(createClient().from("teams").update({ name: name.trim(), abbr, color }).eq("id", team.id)))}
            >
              Save changes
            </button>
            {confirmDelete ? (
              <button
                className="btn btn-danger"
                disabled={pending}
                onClick={() => run(() => must(createClient().from("teams").delete().eq("id", team.id)))}
              >
                Confirm delete
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete team">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {confirmDelete && (
            <p className="text-xs text-muted">Deleting moves all its players to Free Agents and removes its games.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Players */

export function PlayersManager({ meId, teams, players }: { meId: string; teams: Team[]; players: Player[] }) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  // Players on teams (by team name), then free agents, then unfinished profiles.
  const group = (p: Player) => (!p.onboarded ? 2 : p.team_id ? 0 : 1);
  const sorted = [...players].sort(
    (a, b) =>
      group(a) - group(b) ||
      (teamById.get(a.team_id ?? "")?.name ?? "").localeCompare(teamById.get(b.team_id ?? "")?.name ?? "") ||
      a.display_name.localeCompare(b.display_name),
  );
  return (
    <Section id="players" title="Players" subtitle="Move anyone to any team. Captains can also draft and trade on their own.">
      <div className="card divide-y divide-line">
        {sorted.map((p) => (
          <PlayerAssignRow key={p.id} player={p} teams={teams} team={teamById.get(p.team_id ?? "") ?? null} isMe={p.id === meId} />
        ))}
      </div>
    </Section>
  );
}

function PlayerAssignRow({ player, teams, team, isMe }: { player: Player; teams: Team[]; team: Team | null; isMe: boolean }) {
  const { run, pending, error } = useAction();
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        <Avatar member={player} color={team?.color} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {player.display_name}
            {isMe && <span className="text-muted font-normal"> (you)</span>}
          </div>
          <div className={`text-xs truncate ${player.onboarded ? "text-muted" : "text-amber-300"}`}>
            {player.onboarded ? (team?.name ?? "Free Agent") : "Profile not finished"}
          </div>
        </div>
        {!isMe &&
          (confirmRemove ? (
            <button
              className="btn btn-danger btn-sm"
              disabled={pending}
              onClick={() => run(() => must(createClient().from("members").delete().eq("id", player.id)))}
            >
              Remove
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(true)} aria-label={`Remove ${player.display_name} from league`}>
              <Trash2 size={15} />
            </button>
          ))}
      </div>
      {player.onboarded && (
        <div className="flex items-center gap-2 mt-2 pl-12">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted shrink-0">Team</span>
          <select
            aria-label={`Team for ${player.display_name}`}
            className="input !py-2 !text-sm"
            value={player.team_id ?? ""}
            disabled={pending}
            onChange={(e) => run(() => must(createClient().rpc("assign_player", { p_member: player.id, p_team: e.target.value || null })))}
          >
            <option value="">Free Agent</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {confirmRemove && (
        <div className="flex items-center justify-between gap-2 mt-2 pl-12 text-xs text-muted">
          <span>Remove from the league? Their stats are deleted.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger mt-1.5 pl-12">{error}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- Schedule */

function localInputValue(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function ScheduleManager({
  leagueId,
  teams,
  games,
  defaultLocation,
}: {
  leagueId: string;
  teams: Team[];
  games: Game[];
  defaultLocation: string | null;
}) {
  const { run, pending, error } = useAction();
  const nextWeek = games.reduce((m, g) => Math.max(m, g.week ?? 0), 0) + 1;
  const [away, setAway] = useState(teams[0]?.id ?? "");
  const [home, setHome] = useState(teams[1]?.id ?? "");
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); // next Sunday
    d.setHours(14, 0, 0, 0);
    return localInputValue(d);
  });
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [week, setWeek] = useState(String(nextWeek));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(() =>
      must(
        createClient()
          .from("games")
          .insert({
            league_id: leagueId,
            home_team_id: home,
            away_team_id: away,
            scheduled_at: new Date(when).toISOString(),
            location: location.trim() || null,
            week: week ? Number(week) : null,
          }),
      ),
    );
  }

  const upcoming = games.filter((g) => g.status === "scheduled");
  const finals = games.filter((g) => g.status === "final").reverse();

  return (
    <Section id="schedule" title="Schedule" subtitle="Add games, then enter the final score when it's over. Results update standings automatically.">
      {teams.length < 2 ? (
        <p className="card p-4 text-sm text-muted">Create at least two teams to start scheduling games.</p>
      ) : (
        <form onSubmit={add} className="card p-4 space-y-3">
          <div>
            <span className="label">Matchup</span>
            <div className="space-y-2">
              {(
                [
                  ["Away", away, setAway],
                  ["Home", home, setHome],
                ] as const
              ).map(([side, value, set], i) => (
                <div key={side}>
                  {i === 1 && <div className="text-center text-xs font-semibold text-muted -mt-0.5 mb-1.5">at</div>}
                  <div className="flex items-center gap-2.5">
                    <TeamBadge team={teamById.get(value) ?? null} size={40} />
                    <select aria-label={`${side} team`} className="input flex-1" value={value} onChange={(e) => set(e.target.value)}>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <span className="w-11 text-[10px] font-semibold uppercase tracking-widest text-muted">{side}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="label" htmlFor="when-date">Date</label>
              <input
                id="when-date"
                type="date"
                className="input"
                required
                value={when.slice(0, 10)}
                onChange={(e) => e.target.value && setWhen(`${e.target.value}T${when.slice(11, 16)}`)}
              />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="when-time">Time</label>
              <input
                id="when-time"
                type="time"
                className="input"
                required
                value={when.slice(11, 16)}
                onChange={(e) => e.target.value && setWhen(`${when.slice(0, 10)}T${e.target.value}`)}
              />
            </div>
          </div>
          <div className="grid grid-cols-[76px_1fr] gap-2">
            <div className="min-w-0">
              <label className="label" htmlFor="week">Week</label>
              <input id="week" type="number" inputMode="numeric" min={1} max={99} className="input text-center" value={week} onChange={(e) => setWeek(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="loc">Location</label>
              <input id="loc" className="input" maxLength={60} placeholder="Optional" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <FormError error={error ?? (home === away ? "Pick two different teams." : null)} />
          <button className="btn btn-primary w-full" disabled={pending || home === away}>
            <Plus size={16} /> Add Game
          </button>
        </form>
      )}

      {upcoming.length > 0 && (
        <div className="card divide-y divide-line">
          {upcoming.map((g) => (
            <GameEditor key={g.id} game={g} home={teamById.get(g.home_team_id)} away={teamById.get(g.away_team_id)} />
          ))}
        </div>
      )}
      {finals.length > 0 && (
        <>
          <h3 className="section-title pt-2 px-1">Final</h3>
          <div className="card divide-y divide-line">
            {finals.map((g) => (
              <GameEditor key={g.id} game={g} home={teamById.get(g.home_team_id)} away={teamById.get(g.away_team_id)} />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

function GameEditor({ game, home, away }: { game: Game; home?: Team; away?: Team }) {
  const { run, pending, error } = useAction();
  const [homeScore, setHomeScore] = useState(game.home_score?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(game.away_score?.toString() ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const final = game.status === "final";
  const changed = homeScore !== (game.home_score?.toString() ?? "") || awayScore !== (game.away_score?.toString() ?? "");

  const scoreInput = (team: Team | undefined, value: string, set: (v: string) => void) => (
    <div className="flex items-center gap-2 min-w-0">
      <TeamBadge team={team ?? null} size={26} />
      <span className="text-sm font-semibold truncate flex-1">{team?.name}</span>
      <input
        aria-label={`${team?.name} score`}
        placeholder="Pts"
        type="number"
        inputMode="numeric"
        min={0}
        className="input !w-16 !py-1.5 text-center tabular"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {game.week ? `Week ${game.week} · ` : ""}
          {formatGameDate(game.scheduled_at)} · {formatGameTime(game.scheduled_at)}
        </span>
        {confirmDelete ? (
          <button className="text-danger font-semibold" disabled={pending} onClick={() => run(() => must(createClient().from("games").delete().eq("id", game.id)))}>
            Confirm delete
          </button>
        ) : (
          <button onClick={() => setConfirmDelete(true)} aria-label="Delete game" className="hover:text-text">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {scoreInput(away, awayScore, setAwayScore)}
      {scoreInput(home, homeScore, setHomeScore)}
      {(!final || changed) && (
        <button
          className="btn btn-secondary btn-sm w-full"
          disabled={pending || homeScore === "" || awayScore === ""}
          onClick={() =>
            run(() =>
              must(
                createClient()
                  .from("games")
                  .update({ home_score: Number(homeScore), away_score: Number(awayScore), status: "final" })
                  .eq("id", game.id),
              ),
            )
          }
        >
          <Check size={14} /> {final ? "Update final score" : "Mark as final"}
        </button>
      )}
      <FormError error={error} />
    </div>
  );
}

/* ------------------------------------------------------------------- News */

export function NewsComposer({ leagueId, authorId }: { leagueId: string; authorId: string }) {
  const { run, pending, error } = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posted, setPosted] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await must(
        createClient()
          .from("news")
          .insert({ league_id: leagueId, author_id: authorId, kind: "announcement", title: title.trim(), body: body.trim() || null }),
      );
      return true;
    });
    if (ok) {
      setTitle("");
      setBody("");
      setPosted(true);
      setTimeout(() => setPosted(false), 2500);
    }
  }

  return (
    <Section id="news" title="Post news" subtitle="Announcements go on the league home page and notify everyone in the league. Trades, drafts and results post automatically.">
      <form onSubmit={post} className="card p-4 space-y-3">
        <input className="input" aria-label="Headline" required maxLength={120} placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input min-h-24" aria-label="Details" maxLength={2000} placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending || !title.trim()}>
          {pending ? "Posting…" : posted ? "Posted ✓" : "Post Announcement"}
        </button>
      </form>
    </Section>
  );
}

/* ----------------------------------------------------------------- League */

export function LeagueSettings({ league }: { league: League }) {
  const { run, pending, error } = useAction();
  const [f, setF] = useState({
    name: league.name,
    sport: league.sport,
    season: league.season ?? "",
    location: league.location ?? "",
    description: league.description ?? "",
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await must(
        createClient()
          .from("leagues")
          .update({
            name: f.name.trim(),
            sport: f.sport,
            season: f.season.trim() || null,
            location: f.location.trim() || null,
            description: f.description.trim() || null,
          })
          .eq("id", league.id),
      );
      return true;
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <Section id="league" title="League settings">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="label !mb-1">Invite code</div>
          <div className="display text-4xl tracking-[0.2em]">{league.code}</div>
        </div>
        <p className="text-xs text-muted max-w-[45%] text-right">Friends enter this after tapping Join League.</p>
      </div>
      <form onSubmit={save} className="card p-4 space-y-3">
        <div>
          <label className="label" htmlFor="l-name">Name</label>
          <input id="l-name" className="input" required minLength={2} maxLength={60} value={f.name} onChange={set("name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="l-sport">Sport</label>
            <select id="l-sport" className="input" value={f.sport} onChange={set("sport")}>
              {[...new Set([...SPORTS, f.sport])].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="l-season">Season</label>
            <input id="l-season" className="input" maxLength={30} value={f.season} onChange={set("season")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-loc">Home field</label>
          <input id="l-loc" className="input" maxLength={60} value={f.location} onChange={set("location")} />
        </div>
        <div>
          <label className="label" htmlFor="l-desc">About</label>
          <textarea id="l-desc" className="input min-h-20" maxLength={300} value={f.description} onChange={set("description")} />
        </div>
        <FormError error={error} />
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save League"}
        </button>
      </form>
    </Section>
  );
}
