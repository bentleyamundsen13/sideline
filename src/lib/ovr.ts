import type { PassingStats, StatTotals } from "./types";

type Counts = Pick<StatTotals, "games" | "touchdowns" | "interceptions" | "fumbles" | "receptions" | "drops"> &
  Partial<PassingStats>;
type Line = Omit<Counts, "games">;

/**
 * OVR: how good your games are compared with the rest of your league.
 * Madden-style, 40-99. New players start at 60; 70 is a typical regular.
 *
 *  1. Whole game. Every stat you logged adds up to one number per game
 *     (offense, defense and passing together), so one stat on its own can't
 *     define you. That number is averaged across your games.
 *  2. Start at 60. Everyone begins as if they'd already played PRIOR_GAMES
 *     games at a 60 level. A quiet first game leaves you at 60; each real game
 *     slowly outweighs that start, so it takes a run of good games to climb.
 *  3. League-relative. Compared with your league's average and spread, so
 *     ratings mean the same whether your league scores a lot or a little.
 *  4. Diminishing returns. A curve that flattens near the top: each step up is
 *     harder than the last, and 99 means far above everyone, consistently.
 *
 * Ratings are relative, so they can shift slightly as others log games.
 */
export type OvrModel = {
  /** League-average production per game. */
  avg: number;
  /** How spread out players are. */
  sd: number;
  /** League completion rate, the baseline passers are compared with. */
  cmp: number;
};

const PRIOR_GAMES = 8; // head start in games: one game is a nudge, a season is a real rating
const PRIOR_AVG = 10; // expected production per game before a league has data
const PRIOR_AVG_GAMES = 8; // how quickly a league's own average takes over
const PRIOR_SD = 9; // expected spread before a league has data
const PRIOR_SD_PLAYERS = 4; // how quickly a league's own spread takes over
const PRIOR_CMP = 0.55; // completion % before a league has enough passes
const PRIOR_CMP_ATTEMPTS = 20;

/** Where on the curve a 60 sits: 70 + 30·tanh(z/2) = 60. */
const Z_AT_60 = -2 * Math.atanh(1 / 3);

export const DEFAULT_OVR_MODEL: OvrModel = { avg: PRIOR_AVG, sd: PRIOR_SD, cmp: PRIOR_CMP };

/** Everything you did in a game, as one number (per game, averaged over your games). */
function productionPerGame(s: Counts, cmpBaseline = PRIOR_CMP): number {
  const per = (n: number | undefined) => (n ?? 0) / s.games;
  let points =
    // Scoring and catching
    8 * per(s.touchdowns) +
    2 * per(s.receptions) -
    4 * per(s.drops) -
    6 * per(s.fumbles) +
    // Defense
    12 * per(s.interceptions) +
    4 * per(s.pass_breakups) +
    1.5 * per(s.tackles);

  const attempts = s.pass_attempts ?? 0;
  if (attempts > 0) {
    const pct = (s.pass_completions ?? 0) / attempts;
    // Completion % vs the league's, counting fully once you throw ~10 a game.
    const volume = Math.min(1, per(attempts) / 10);
    points +=
      8 * per(s.pass_tds) -
      8 * per(s.ints_thrown) +
      // Moving the ball counts too, so a steady QB's game adds up like anyone else's.
      1 * per(s.pass_completions) +
      (pct - cmpBaseline) * 40 * volume;
  }
  return points;
}

/** Production that corresponds to a 60 in this league. */
const level60 = (m: OvrModel) => m.avg + Z_AT_60 * m.sd;

/**
 * The head start everyone is given, set so a first game with nothing logged
 * lands exactly on 60 (a quiet game pulls you just to 60, not below it).
 */
const startingLevel = (m: OvrModel) => (level60(m) * (PRIOR_GAMES + 1)) / PRIOR_GAMES;

/** Your per-game production, blended with the PRIOR_GAMES-game head start. */
function blended(s: Counts, m: OvrModel) {
  return (productionPerGame(s, m.cmp) * s.games + PRIOR_GAMES * startingLevel(m)) / (s.games + PRIOR_GAMES);
}

/** Learns the league's average, spread and completion rate from season totals. */
export function buildOvrModel(all: Counts[]): OvrModel {
  const rated = all.filter((s) => s.games > 0);
  const attempts = rated.reduce((a, s) => a + (s.pass_attempts ?? 0), 0);
  const completions = rated.reduce((a, s) => a + (s.pass_completions ?? 0), 0);
  const cmp = (completions + PRIOR_CMP * PRIOR_CMP_ATTEMPTS) / (attempts + PRIOR_CMP_ATTEMPTS);

  const games = rated.reduce((a, s) => a + s.games, 0);
  const production = rated.reduce((a, s) => a + productionPerGame(s, cmp) * s.games, 0);
  const avg = (production + PRIOR_AVG * PRIOR_AVG_GAMES) / (games + PRIOR_AVG_GAMES);

  // Spread of players' long-run level (their production with small samples
  // discounted), blended with a sensible default while the league is new.
  const longRun = rated.map((s) => (productionPerGame(s, cmp) * s.games + PRIOR_GAMES * avg) / (s.games + PRIOR_GAMES));
  const sumSq = longRun.reduce((a, x) => a + (x - avg) ** 2, 0);
  const sd = Math.sqrt((sumSq + PRIOR_SD_PLAYERS * PRIOR_SD ** 2) / (rated.length + PRIOR_SD_PLAYERS));
  return { avg, sd: Math.max(sd, 3), cmp };
}

/** 40-99. Null until you've logged a game. */
export function computeOvr(s: Counts | null | undefined, model: OvrModel = DEFAULT_OVR_MODEL): number | null {
  if (!s || s.games <= 0) return null;
  const z = (blended(s, model) - model.avg) / model.sd;
  // Above average: gains flatten toward 99 (z of 1 ≈ 82, 2 ≈ 91, 3 ≈ 95).
  // Below: 60 at the starting level, falling toward 40.
  const rating = z >= 0 ? 70 + 29 * Math.tanh(z / 2.2) : 70 + 30 * Math.tanh(z / 2);
  return Math.max(40, Math.min(99, Math.round(rating)));
}

/** Everything in one game's stat line, as one number. Picks Player of the Game. */
export function gameScore(line: Line, model: OvrModel = DEFAULT_OVR_MODEL): number {
  return productionPerGame({ ...line, games: 1 }, model.cmp);
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
