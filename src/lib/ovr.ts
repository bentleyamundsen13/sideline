import type { StatTotals } from "./types";

type Counts = Pick<StatTotals, "games" | "touchdowns" | "interceptions" | "fumbles" | "receptions" | "drops">;

/**
 * Overall rating, Madden-style (40-99).
 *
 * Built from per-game production so players who've logged more games aren't
 * automatically rated higher. Early on the rating is pulled toward 60 until a
 * player has 3+ games logged, so one monster game doesn't make you a 99.
 */
export function computeOvr(s: Counts | null | undefined): number | null {
  if (!s || s.games <= 0) return null;

  const per = (n: number) => n / s.games;
  const raw =
    60 +
    8 * per(s.touchdowns) +
    12 * per(s.interceptions) +
    2 * per(s.receptions) -
    6 * per(s.fumbles) -
    4 * per(s.drops);

  const confidence = Math.min(1, s.games / 3);
  const rating = 60 + (raw - 60) * confidence;
  return Math.max(40, Math.min(99, Math.round(rating)));
}

export function catchRate(s: Counts | null | undefined): number | null {
  if (!s) return null;
  const targets = s.receptions + s.drops;
  return targets === 0 ? null : Math.round((s.receptions / targets) * 100);
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
    }),
    { games: 0, touchdowns: 0, interceptions: 0, fumbles: 0, receptions: 0, drops: 0 },
  );
}
