import type { PassingStats, StatTotals } from "./types";

type Counts = Pick<StatTotals, "games" | "touchdowns" | "interceptions" | "fumbles" | "receptions" | "drops"> &
  Partial<PassingStats>;
type Line = Omit<Counts, "games">;

/**
 * OVR: how good you are at what you do, compared with others in your league
 * who do the same thing. Madden-style, 40-99, with 70 = average.
 *
 *  1. Roles. Production is split into receiving/rushing, passing and defense.
 *     Each role is rated only against players who actually play it, so a 70 QB
 *     is an average QB and a 70 corner is an average defender.
 *  2. Per game. Playing more games doesn't inflate anything.
 *  3. Sample size. Everyone starts each role as if they'd played PRIOR_GAMES
 *     average games; real games gradually outweigh that. One monster game barely
 *     moves you, a season of great games makes you a star.
 *  4. Combining roles. Your best role is your rating; being above average in a
 *     second role adds a bonus. Roles you barely play (a receiver with one
 *     tackle a game) are ignored, and a weaker second role never costs you.
 *  5. Diminishing returns. A curve that flattens near the top, so each step up
 *     is harder than the last and 99 means far above everyone, consistently.
 *
 * Ratings are relative, so they can shift slightly as others log games.
 */

type Role = "offense" | "passing" | "defense";
const ROLES: Role[] = ["offense", "passing", "defense"];

type RoleModel = { avg: number; sd: number };
export type OvrModel = { roles: Record<Role, RoleModel>; cmp: number };

const PRIOR_GAMES = 6; // average games everyone starts each role with
const PRIOR_WEIGHT_GAMES = 6; // how quickly a league's own averages take over
const PRIOR_WEIGHT_PLAYERS = 4; // how quickly a league's own spreads take over
const PRIOR_CMP = 0.55; // completion % before a league has enough passes
const PRIOR_CMP_ATTEMPTS = 20;

/** Expected average and spread per role before a league has its own data. */
const PRIORS: Record<Role, RoleModel> = {
  offense: { avg: 8, sd: 8 },
  passing: { avg: 6, sd: 8 },
  defense: { avg: 7, sd: 5 },
};

/**
 * A role only counts once you really play it, per game. (Receivers make the odd
 * tackle; that shouldn't turn them into "defenders" and skew the defensive bar.)
 */
const MIN_ACTIVITY: Record<Role, number> = { offense: 1.5, passing: 3, defense: 2 };

export const DEFAULT_OVR_MODEL: OvrModel = { roles: PRIORS, cmp: PRIOR_CMP };

const per = (s: Counts, n: number | undefined) => (n ?? 0) / s.games;

/** Value added per game in each role. */
function roleProduction(s: Counts, role: Role, cmpBaseline: number): number {
  switch (role) {
    case "offense":
      return 8 * per(s, s.touchdowns) + 2 * per(s, s.receptions) - 4 * per(s, s.drops) - 6 * per(s, s.fumbles);
    case "defense":
      return 12 * per(s, s.interceptions) + 4 * per(s, s.pass_breakups) + 1.5 * per(s, s.tackles);
    case "passing": {
      const attempts = s.pass_attempts ?? 0;
      if (attempts === 0) return 0;
      const pct = (s.pass_completions ?? 0) / attempts;
      // Completion % vs the league's, counting fully once you throw ~10 a game.
      const volume = Math.min(1, per(s, attempts) / 10);
      return 8 * per(s, s.pass_tds) - 8 * per(s, s.ints_thrown) + (pct - cmpBaseline) * 40 * volume;
    }
  }
}

/** How much of a role you actually do per game (touches, throws, defensive plays). */
function roleActivity(s: Counts, role: Role): number {
  switch (role) {
    case "offense":
      return per(s, s.receptions + s.drops + s.touchdowns + s.fumbles);
    case "passing":
      return per(s, s.pass_attempts);
    case "defense":
      return per(s, (s.tackles ?? 0) + (s.pass_breakups ?? 0) + s.interceptions);
  }
}

/** Roles that count for a player: the ones they really play, or their main one if none clear the bar. */
function activeRoles(s: Counts): Role[] {
  const active = ROLES.filter((r) => roleActivity(s, r) >= MIN_ACTIVITY[r]);
  if (active.length > 0) return active;
  const busiest = ROLES.reduce((a, b) => (roleActivity(s, b) / MIN_ACTIVITY[b] > roleActivity(s, a) / MIN_ACTIVITY[a] ? b : a));
  return [busiest];
}

/** Role production pulled toward that role's average in proportion to how few games you've logged. */
function shrunk(s: Counts, role: Role, model: OvrModel) {
  const avg = model.roles[role].avg;
  return (roleProduction(s, role, model.cmp) * s.games + PRIOR_GAMES * avg) / (s.games + PRIOR_GAMES);
}

/** Learns each role's average and spread (and the league completion rate) from season totals. */
export function buildOvrModel(all: Counts[]): OvrModel {
  const rated = all.filter((s) => s.games > 0);
  const attempts = rated.reduce((a, s) => a + (s.pass_attempts ?? 0), 0);
  const completions = rated.reduce((a, s) => a + (s.pass_completions ?? 0), 0);
  const cmp = (completions + PRIOR_CMP * PRIOR_CMP_ATTEMPTS) / (attempts + PRIOR_CMP_ATTEMPTS);

  const roles = {} as Record<Role, RoleModel>;
  for (const role of ROLES) {
    const players = rated.filter((s) => activeRoles(s).includes(role));
    const prior = PRIORS[role];
    const games = players.reduce((a, s) => a + s.games, 0);
    const production = players.reduce((a, s) => a + roleProduction(s, role, cmp) * s.games, 0);
    const avg = (production + prior.avg * PRIOR_WEIGHT_GAMES) / (games + PRIOR_WEIGHT_GAMES);
    const draft: OvrModel = { roles: { ...PRIORS, [role]: { avg, sd: prior.sd } }, cmp };
    const sumSq = players.reduce((a, s) => a + (shrunk(s, role, draft) - avg) ** 2, 0);
    const sd = Math.sqrt((sumSq + PRIOR_WEIGHT_PLAYERS * prior.sd ** 2) / (players.length + PRIOR_WEIGHT_PLAYERS));
    roles[role] = { avg, sd: Math.max(sd, prior.sd / 3) };
  }
  return { roles, cmp };
}

/** 40-99. Null until you've logged a game. */
export function computeOvr(s: Counts | null | undefined, model: OvrModel = DEFAULT_OVR_MODEL): number | null {
  if (!s || s.games <= 0) return null;
  const zs = activeRoles(s)
    .map((role) => (shrunk(s, role, model) - model.roles[role].avg) / model.roles[role].sd)
    .sort((a, b) => b - a);
  // Your best role, plus a bonus if you're also above average in a second one.
  // A weaker second role never costs you: specialists aren't punished.
  const z = zs[0] + 0.3 * Math.max(0, zs[1] ?? 0);
  // Above average: gains flatten toward 99 (z of 1 ≈ 82, 2 ≈ 91, 3 ≈ 95).
  // Below average: falls toward 40 (z of -1 ≈ 56, -2 ≈ 47).
  const rating = z >= 0 ? 70 + 29 * Math.tanh(z / 2.2) : 70 + 30 * Math.tanh(z / 2);
  return Math.max(40, Math.min(99, Math.round(rating)));
}

/** Total value of one game's stat line across all roles. Picks Player of the Game. */
export function gameScore(line: Line, model: OvrModel = DEFAULT_OVR_MODEL): number {
  const s = { ...line, games: 1 };
  return ROLES.reduce((a, r) => a + roleProduction(s, r, model.cmp), 0);
}

/** "3 TD · 7 REC · 9/14 passing" style summary of one stat line (good stuff first). */
export function statSummary(l: Line): string {
  const parts: string[] = [];
  if (l.pass_attempts) {
    parts.push(`${l.pass_completions ?? 0}/${l.pass_attempts} passing`);
    if (l.pass_tds) parts.push(`${l.pass_tds} pass TD`);
  }
  if (l.touchdowns) parts.push(`${l.touchdowns} TD`);
  if (l.receptions) parts.push(`${l.receptions} REC`);
  if (l.tackles) parts.push(`${l.tackles} TKL`);
  if (l.interceptions) parts.push(`${l.interceptions} INT`);
  if (l.pass_breakups) parts.push(`${l.pass_breakups} PBU`);
  if (l.ints_thrown) parts.push(`${l.ints_thrown} INT thrown`);
  if (l.drops) parts.push(`${l.drops} drop${l.drops === 1 ? "" : "s"}`);
  if (l.fumbles) parts.push(`${l.fumbles} fumble${l.fumbles === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function catchRate(s: Counts | null | undefined): number | null {
  if (!s) return null;
  const targets = s.receptions + s.drops;
  return targets === 0 ? null : Math.round((s.receptions / targets) * 100);
}

export function completionPct(s: Partial<PassingStats> | null | undefined): number | null {
  const att = s?.pass_attempts ?? 0;
  return att === 0 ? null : Math.round(((s?.pass_completions ?? 0) / att) * 100);
}

export function ovrTier(ovr: number | null): "elite" | "great" | "good" | "average" | "unrated" {
  if (ovr == null) return "unrated";
  if (ovr >= 90) return "elite";
  if (ovr >= 80) return "great";
  if (ovr >= 70) return "good";
  return "average";
}

export function sumLines(lines: Line[]): Counts {
  return lines.reduce<Counts>(
    (acc, l) => ({
      games: acc.games + 1,
      touchdowns: acc.touchdowns + l.touchdowns,
      interceptions: acc.interceptions + l.interceptions,
      fumbles: acc.fumbles + l.fumbles,
      receptions: acc.receptions + l.receptions,
      drops: acc.drops + l.drops,
      pass_completions: (acc.pass_completions ?? 0) + (l.pass_completions ?? 0),
      pass_attempts: (acc.pass_attempts ?? 0) + (l.pass_attempts ?? 0),
      pass_tds: (acc.pass_tds ?? 0) + (l.pass_tds ?? 0),
      ints_thrown: (acc.ints_thrown ?? 0) + (l.ints_thrown ?? 0),
      pass_breakups: (acc.pass_breakups ?? 0) + (l.pass_breakups ?? 0),
      tackles: (acc.tackles ?? 0) + (l.tackles ?? 0),
    }),
    {
      games: 0,
      touchdowns: 0,
      interceptions: 0,
      fumbles: 0,
      receptions: 0,
      drops: 0,
      pass_completions: 0,
      pass_attempts: 0,
      pass_tds: 0,
      ints_thrown: 0,
      pass_breakups: 0,
      tackles: 0,
    },
  );
}
