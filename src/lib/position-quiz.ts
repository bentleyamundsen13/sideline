import { DEFENSE_POSITIONS, OFFENSE_POSITIONS } from "./constants";

type Off = (typeof OFFENSE_POSITIONS)[number];
type Def = (typeof DEFENSE_POSITIONS)[number];
type Points = { off?: Partial<Record<Off, number>>; def?: Partial<Record<Def, number>> };

export type QuizQuestion = { q: string; options: { label: string; points: Points }[] };

/** A few quick questions; each answer leans you toward some positions. */
export const QUIZ: QuizQuestion[] = [
  {
    q: "The ball's snapped. Where do you want to be?",
    options: [
      { label: "Throwing it", points: { off: { QB: 3 } } },
      { label: "Running a route, ready to catch", points: { off: { WR: 2, TE: 1 } } },
      { label: "Ball in my hands, making people miss", points: { off: { RB: 3 } } },
      { label: "Hiking it and blocking", points: { off: { Center: 3, TE: 1 } } },
    ],
  },
  {
    q: "What's your best trait?",
    options: [
      { label: "Speed", points: { off: { WR: 2, RB: 1 }, def: { CB: 2, Safety: 1 } } },
      { label: "Hands", points: { off: { WR: 2, TE: 2 }, def: { Safety: 1 } } },
      { label: "Strength", points: { off: { Center: 2, TE: 1 }, def: { Lineman: 2, Rusher: 1, LB: 1 } } },
      { label: "Reading the play", points: { off: { QB: 2 }, def: { Safety: 2, LB: 1 } } },
    ],
  },
  {
    q: "How's your arm?",
    options: [
      { label: "I can drop a dime 30 yards out", points: { off: { QB: 3 } } },
      { label: "Decent, I can make the short throws", points: { off: { QB: 1, Utility: 1 } } },
      { label: "Please don't make me throw", points: { off: { WR: 1, RB: 1, Center: 1 } } },
    ],
  },
  {
    q: "On defense, you'd rather…",
    options: [
      { label: "Lock down their best receiver", points: { def: { CB: 3 } } },
      { label: "Hang back, read the QB and jump the route", points: { def: { Safety: 3 } } },
      { label: "Get after the QB", points: { def: { Rusher: 3 } } },
      { label: "Stop the run and hit people", points: { def: { LB: 2, Lineman: 2 } } },
    ],
  },
  {
    q: "How long can you keep running?",
    options: [
      { label: "All game", points: { off: { WR: 1 }, def: { CB: 1, Safety: 1 } } },
      { label: "Big bursts, then a breather", points: { off: { RB: 1 }, def: { Rusher: 2 } } },
      { label: "I'd rather not run much", points: { off: { Center: 2, QB: 1 }, def: { Lineman: 2 } } },
    ],
  },
  {
    q: "In pickup games, you usually end up…",
    options: [
      { label: "Wherever the team needs me", points: { off: { Utility: 3 }, def: { Utility: 3 } } },
      { label: "Calling the plays", points: { off: { QB: 2 }, def: { Safety: 1, LB: 1 } } },
      { label: "Guarding the best player", points: { def: { CB: 2, LB: 1 } } },
      { label: "The deep threat", points: { off: { WR: 2 }, def: { Safety: 1 } } },
    ],
  },
];

/** Share of the others you're bigger than (ties count half). Null without enough people to compare. */
export function percentile(mine: number | null, others: (number | null)[]): number | null {
  const vals = others.filter((v): v is number => v != null && v > 0);
  if (mine == null || vals.length < 2) return null;
  const below = vals.filter((v) => v < mine).length;
  const same = vals.filter((v) => v === mine).length;
  return (below + same / 2) / vals.length;
}

export type QuizResult = { offense: Off; defense: Def; offenseWhy: string; defenseWhy: string };

const WHY: Record<Off | Def, string> = {
  QB: "You want the ball in your hands every snap and can make the throws.",
  WR: "You've got the hands and the legs to get open and make the catch.",
  RB: "You're at your best with the ball, making people miss.",
  TE: "Good hands plus the size to win at the catch point.",
  Center: "Strong and steady, the one who gets every play started.",
  Utility: "You can do a bit of everything, which every team needs.",
  CB: "Quick enough to stick with their best receiver all game.",
  Safety: "You read the QB and see the play before it happens.",
  LB: "Tough in the middle, stopping the run and covering short.",
  Rusher: "Explosive off the line and built to get to the QB.",
  Lineman: "Big and strong, the wall up front.",
};

/** answers[i] = chosen option index for QUIZ[i]. Size percentiles (0-1) nudge the result when known. */
export function scoreQuiz(answers: number[], size: { height: number | null; weight: number | null }): QuizResult {
  const off = Object.fromEntries(OFFENSE_POSITIONS.map((p) => [p, 0])) as Record<Off, number>;
  const def = Object.fromEntries(DEFENSE_POSITIONS.map((p) => [p, 0])) as Record<Def, number>;
  answers.forEach((a, i) => {
    const p = QUIZ[i]?.options[a]?.points;
    for (const [k, v] of Object.entries(p?.off ?? {})) off[k as Off] += v;
    for (const [k, v] of Object.entries(p?.def ?? {})) def[k as Def] += v;
  });

  // Size compared with the league: tall helps catching and covering deep, heavy helps up front.
  const h = size.height;
  const w = size.weight;
  if (h != null) {
    off.WR += 1.5 * h;
    off.TE += h;
    off.RB += 1.2 * (1 - h);
    off.QB += 0.5 * h;
    def.Safety += h;
    def.CB += 0.5 * h;
    def.Rusher += 0.5 * h;
  }
  if (w != null) {
    off.Center += 1.5 * w;
    off.TE += w;
    def.Lineman += 1.5 * w;
    def.LB += w;
    def.Rusher += 0.5 * w;
    def.CB += 0.8 * (1 - w);
  }

  // Ties go to the earlier (more specific) position; Utility is listed last.
  const best = <K extends string>(scores: Record<K, number>, order: readonly K[]) =>
    order.reduce((top, p) => (scores[p] > scores[top] ? p : top), order[0]);
  const offense = best(off, OFFENSE_POSITIONS);
  const defense = best(def, DEFENSE_POSITIONS);
  return { offense, defense, offenseWhy: WHY[offense], defenseWhy: WHY[defense] };
}
