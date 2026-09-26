import { gameScore } from "./ovr";
import type { StatLine } from "./types";

/**
 * The best single-game performance among a game's logged stat lines, scored on
 * the same scale as OVR. Nobody wins for a quiet game (score must be positive).
 */
export function playerOfTheGame<T extends Pick<StatLine, "member_id" | "touchdowns">>(
  lines: (T & Parameters<typeof gameScore>[0])[],
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const l of lines) {
    const s = gameScore(l);
    if (s > bestScore || (s === bestScore && best && l.touchdowns > best.touchdowns)) {
      best = l;
      bestScore = s;
    }
  }
  return best;
}
