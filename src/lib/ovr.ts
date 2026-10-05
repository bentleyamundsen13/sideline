import type { PassingStats, StatTotals } from "./types";

type Counts = Pick<StatTotals, "games" | "touchdowns" | "interceptions" | "fumbles" | "receptions" | "drops"> &
  Partial<PassingStats>;
type Line = Omit<Counts, "games">;

/**
 * OVR, Madden-style, 40-99.
 *
 *  1. Every game gets its own rating. Everything you logged (scoring, catching,
 *     passing and defense together) adds up to one number, which goes on a
 *     fixed scale: a quiet game is 55, a solid game mid-70s, a big game 90+,
 *     and a monster game 99.
 *  2. Your first game sets your OVR. After that it's the average of all your
 *     game ratings, so every game carries it on: a great game pulls you up, a
 *     bad one pulls you down, and the more you've played the steadier it gets.
 *
 * The scale is fixed, so your rating only moves when you play, never because
 * of what someone else logged.
 */
export type OvrModel = {
  /** League completion rate, the baseline passers are compared with. */
  cmp: number;
};

const PRIOR_CMP = 0.55; // completion % before a league has enough passes
const PRIOR_CMP_ATTEMPTS = 20;

export const DEFAULT_OVR_MODEL: OvrModel = { cmp: PRIOR_CMP };

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

/**
 * One game's rating. Nothing logged = 55. Above that, gains flatten toward 99:
 * 1 TD + 4 catches ≈ 77, 3 TD + 6 catches + an INT ≈ 92, ~16 TDs = 99.
 * Drops, fumbles and picks thrown can take a game below 55, down to 40.
 */
function rateGame(points: number): number {
  const rating = points >= 0 ? 55 + 44 * (1 - Math.exp(-points / 28)) : 55 + 15 * Math.tanh(points / 12);
  return Math.max(40, Math.min(99, rating));
}

/** Learns the league's completion rate (the bar passers are measured against). */
export function buildOvrModel(all: Counts[]): OvrModel {
  const attempts = all.reduce((a, s) => a + (s.pass_attempts ?? 0), 0);
  const completions = all.reduce((a, s) => a + (s.pass_completions ?? 0), 0);
  return { cmp: (completions + PRIOR_CMP * PRIOR_CMP_ATTEMPTS) / (attempts + PRIOR_CMP_ATTEMPTS) };
}

/** 40-99: the average of your game ratings. Null until you've logged a game. */
export function computeOvr(lines: Line[] | null | undefined, model: OvrModel = DEFAULT_OVR_MODEL): number | null {
  if (!lines?.length) return null;
  const total = lines.reduce((a, l) => a + rateGame(gameScore(l, model)), 0);
  return Math.round(total / lines.length);
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
