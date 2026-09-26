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
 * Defense: interceptions, forced fumbles and tackles all add.
 * Passing counts for anyone who threw: TD passes and completion % add, picks
 * thrown subtract. It stacks with everything else, so a QB who also rushes,
 * catches, or plays defense gets credit for all of it.
 */
export function computeOvr(s: Counts | null | undefined): number | null {
  if (!s || s.games <= 0) return null;
  const confidence = Math.min(1, s.games / 3);
  const rating = 60 + productionPerGame(s) * confidence;
  return Math.max(40, Math.min(99, Math.round(rating)));
}

/** Points above or below an average (60) player, per game. Shared by OVR and Player of the Game. */
function productionPerGame(s: Counts): number {
  const per = (n: number | undefined) => (n ?? 0) / s.games;
  let points =
    8 * per(s.touchdowns) +
    12 * per(s.interceptions) +
    8 * per(s.forced_fumbles) +
    1.5 * per(s.tackles) +
    2 * per(s.receptions) -
    6 * per(s.fumbles) -
    4 * per(s.drops);

  const attempts = s.pass_attempts ?? 0;
  if (attempts > 0) {
    const pct = (s.pass_completions ?? 0) / attempts;
    // Completion % only counts fully once you're throwing ~10 passes a game.
    const volume = Math.min(1, per(attempts) / 10);
    points += 8 * per(s.pass_tds) - 8 * per(s.ints_thrown) + (pct - 0.55) * 40 * volume;
  }
  return points;
}

/** How big one game's stat line was, on the same scale OVR uses. Picks Player of the Game. */
export function gameScore(line: Omit<Counts, "games">): number {
  return productionPerGame({ ...line, games: 1 });
}

/** "3 TD · 7 REC · 9/14 passing" style summary of one stat line (good stuff first). */
export function statSummary(l: Omit<Counts, "games">): string {
  const parts: string[] = [];
  if (l.pass_attempts) {
    parts.push(`${l.pass_completions ?? 0}/${l.pass_attempts} passing`);
    if (l.pass_tds) parts.push(`${l.pass_tds} pass TD`);
  }
  if (l.touchdowns) parts.push(`${l.touchdowns} TD`);
  if (l.receptions) parts.push(`${l.receptions} REC`);
  if (l.tackles) parts.push(`${l.tackles} TKL`);
  if (l.interceptions) parts.push(`${l.interceptions} INT`);
  if (l.forced_fumbles) parts.push(`${l.forced_fumbles} FF`);
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
      forced_fumbles: 0,
      tackles: 0,
    },
  );
}
