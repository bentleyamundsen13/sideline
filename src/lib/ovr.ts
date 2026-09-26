import type { PassingStats, StatTotals } from "./types";

type Counts = Pick<StatTotals, "games" | "touchdowns" | "interceptions" | "fumbles" | "receptions" | "drops"> &
  Partial<PassingStats>;

/**
 * Overall rating, Madden-style (40-99).
 *
 * Built from per-game production so players who've logged more games aren't
 * automatically rated higher. Early on the rating is pulled toward 60 until a
 * player has 3+ games logged, so one monster game doesn't make you a 99.
 *
 * Defense: interceptions and forced fumbles both add.
 * Passing counts for anyone who threw: TD passes and completion % add, picks
 * thrown subtract. It stacks with everything else, so a QB who also rushes,
 * catches, or plays defense gets credit for all of it.
 */
export function computeOvr(s: Counts | null | undefined): number | null {
  if (!s || s.games <= 0) return null;

  const per = (n: number | undefined) => (n ?? 0) / s.games;
  let raw =
    60 +
    8 * per(s.touchdowns) +
    12 * per(s.interceptions) +
    8 * per(s.forced_fumbles) +
    2 * per(s.receptions) -
    6 * per(s.fumbles) -
    4 * per(s.drops);

  const attempts = s.pass_attempts ?? 0;
  if (attempts > 0) {
    const pct = (s.pass_completions ?? 0) / attempts;
    // Completion % only counts fully once you're throwing ~10 passes a game.
    const volume = Math.min(1, per(attempts) / 10);
    raw += 8 * per(s.pass_tds) - 8 * per(s.ints_thrown) + (pct - 0.55) * 40 * volume;
  }

  const confidence = Math.min(1, s.games / 3);
  const rating = 60 + (raw - 60) * confidence;
  return Math.max(40, Math.min(99, Math.round(rating)));
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

export function sumLines(lines: Omit<Counts, "games">[]): Counts {
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
      forced_fumbles: (acc.forced_fumbles ?? 0) + (l.forced_fumbles ?? 0),
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
      forced_fumbles: 0,
    },
  );
}
