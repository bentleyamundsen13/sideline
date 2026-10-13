import { TEAM_COLORS } from "./constants";
import { abbrFromName } from "./format";

/** Everything the roller looks at for one player. */
export type RollPlayer = {
  id: string;
  name: string;
  avatar_url: string | null;
  ovr: number | null;
  offense_position: string | null;
  defense_position: string | null;
  height_in: number | null;
  weight_lb: number | null;
};

export type RolledTeam = {
  key: string;
  name: string;
  abbr: string;
  color: string;
  captainId: string | null;
  playerIds: string[];
};

/* --------------------------------------------------------------- Names */

const ADJECTIVES = [
  "Black", "Iron", "Midnight", "Savage", "Crimson", "Steel", "Ghost", "Outlaw", "Venom", "Blackout",
  "Shadow", "Rogue", "Thunder", "Cold", "Dark", "Wrecking", "Scarlet", "Obsidian", "Grim", "Lawless",
];
const NOUNS = [
  "Wolves", "Vipers", "Reapers", "Outlaws", "Ravens", "Sharks", "Titans", "Spartans", "Warhawks", "Mambas",
  "Bandits", "Phantoms", "Raptors", "Grizzlies", "Cobras", "Marauders", "Jackals", "Scorpions", "Hornets", "Rhinos",
  "Wolverines", "Panthers", "Mustangs", "Kings", "Hitmen", "Enforcers", "Warlords", "Juggernauts", "Gladiators", "Assassins",
];
const SOLO = ["Havoc", "Mayhem", "Blackout", "Smoke", "Voltage", "Carnage", "Riot", "Venom", "Inferno", "Wrath"];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** A tough team name that isn't already taken (and doesn't reuse a word that is). */
export function toughName(taken: string[]): string {
  const used = new Set(taken.flatMap((n) => n.toLowerCase().split(/\s+/)));
  for (let i = 0; i < 200; i++) {
    const name = Math.random() < 0.18 ? pick(SOLO) : `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    const words = name.toLowerCase().split(/\s+/);
    if (words.some((w) => used.has(w)) || words[0] === words[1]) continue;
    return name;
  }
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

/* --------------------------------------------------------------- Sizes */

/** How many teams of each size, e.g. 13 players into 3 → [5, 4, 4]. */
export function teamSizes(players: number, teams: number): number[] {
  const base = Math.floor(players / teams);
  const extra = players % teams;
  return Array.from({ length: teams }, (_, i) => base + (i < extra ? 1 : 0));
}

/** "1 team of 5, 2 teams of 4" */
export function describeSizes(sizes: number[]): string {
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, n]) => `${n} team${n === 1 ? "" : "s"} of ${size}`)
    .join(", ");
}

/* --------------------------------------------------------------- Balancing */

/** Position groups the roller spreads evenly. */
function groupsOf(p: RollPlayer): string[] {
  const g: string[] = [];
  const off = p.offense_position;
  const def = p.defense_position;
  if (off === "QB") g.push("qb");
  else if (off === "WR" || off === "TE") g.push("catch");
  else if (off === "RB") g.push("rb");
  else if (off === "Center") g.push("center");
  if (def === "CB" || def === "Safety") g.push("db");
  else if (def === "LB" || def === "Rusher" || def === "Lineman") g.push("front");
  return g;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const variance = (xs: number[]) => {
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
};

/**
 * Splits players into `count` teams as evenly as possible: overall first, then
 * QBs (one per team when there are enough), size, and positions. Random each
 * time, so rolling again gives a different, equally fair split.
 */
export function rollTeams(players: RollPlayer[], count: number, existingNames: string[] = []): RolledTeam[] {
  const rated = players.map((p) => p.ovr).filter((o): o is number => o != null);
  const fallbackOvr = rated.length ? mean(rated) : 65; // unrated players count as average
  const strength = new Map(players.map((p) => [p.id, (p.ovr ?? fallbackOvr) + Math.random() * 2]));
  const heights = players.map((p) => p.height_in).filter((h): h is number => !!h);
  const weights = players.map((p) => p.weight_lb).filter((w): w is number => !!w);
  const avgH = heights.length ? mean(heights) : 70;
  const avgW = weights.length ? mean(weights) : 170;
  const byId = new Map(players.map((p) => [p.id, p]));

  // Start: QBs spread first, then everyone else snake-drafted by strength.
  const sizes = teamSizes(players.length, count).sort(() => Math.random() - 0.5);
  const teams: string[][] = sizes.map(() => []);
  const order = [...players].sort((a, b) => strength.get(b.id)! - strength.get(a.id)!);
  const qbs = order.filter((p) => p.offense_position === "QB");
  const rest = order.filter((p) => p.offense_position !== "QB");
  const total = (t: string[]) => t.reduce((a, id) => a + strength.get(id)!, 0);
  for (const p of [...qbs, ...rest]) {
    const open = teams.map((t, i) => i).filter((i) => teams[i].length < sizes[i]);
    // Fewest QBs first (for QBs), then the weakest team so far.
    const qbCount = (i: number) => teams[i].filter((id) => byId.get(id)!.offense_position === "QB").length;
    open.sort((a, b) =>
      p.offense_position === "QB" && qbCount(a) !== qbCount(b)
        ? qbCount(a) - qbCount(b)
        : total(teams[a]) / Math.max(1, teams[a].length) - total(teams[b]) / Math.max(1, teams[b].length),
    );
    teams[open[0]].push(p.id);
  }

  // Score a split: lower is fairer.
  const groups = ["qb", "catch", "rb", "center", "db", "front"];
  const cost = (split: string[][]) => {
    const ovr = split.map((t) => mean(t.map((id) => strength.get(id)!)));
    const h = split.map((t) => mean(t.map((id) => byId.get(id)!.height_in ?? avgH)));
    const w = split.map((t) => mean(t.map((id) => byId.get(id)!.weight_lb ?? avgW)));
    let c = 10 * variance(ovr) + 1.5 * variance(h) + 0.05 * variance(w);
    for (const g of groups) c += 4 * variance(split.map((t) => t.filter((id) => groupsOf(byId.get(id)!).includes(g)).length));
    // A team with no QB at all is the biggest problem when QBs exist.
    if (qbs.length >= count) c += 50 * split.filter((t) => !t.some((id) => byId.get(id)!.offense_position === "QB")).length;
    return c;
  };

  // Improve with swaps between teams (sizes never change).
  let best = cost(teams);
  for (let i = 0; i < 4000 && count > 1; i++) {
    const a = Math.floor(Math.random() * count);
    let b = Math.floor(Math.random() * (count - 1));
    if (b >= a) b++;
    if (!teams[a].length || !teams[b].length) continue;
    const ia = Math.floor(Math.random() * teams[a].length);
    const ib = Math.floor(Math.random() * teams[b].length);
    [teams[a][ia], teams[b][ib]] = [teams[b][ib], teams[a][ia]];
    const c = cost(teams);
    if (c <= best) best = c;
    else [teams[a][ia], teams[b][ib]] = [teams[b][ib], teams[a][ia]];
  }

  // Names, colors and captains.
  const names: string[] = [...existingNames];
  const colors = [...TEAM_COLORS].sort(() => Math.random() - 0.5);
  return teams.map((ids, i) => {
    const name = toughName(names);
    names.push(name);
    const sorted = [...ids].sort((x, y) => (byId.get(y)!.ovr ?? 0) - (byId.get(x)!.ovr ?? 0));
    return {
      key: `t${i}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      abbr: abbrFromName(name),
      color: colors[i % colors.length],
      captainId: pickCaptain(sorted, byId),
      playerIds: sorted,
    };
  });
}

/** The team's QB (best one if several), otherwise its best player. */
export function pickCaptain(ids: string[], byId: Map<string, RollPlayer>): string | null {
  const qbs = ids.filter((id) => byId.get(id)?.offense_position === "QB");
  const pool = qbs.length ? qbs : ids;
  return [...pool].sort((a, b) => (byId.get(b)?.ovr ?? 0) - (byId.get(a)?.ovr ?? 0))[0] ?? null;
}

/** Averages shown on each team card. */
export function teamAverages(ids: string[], byId: Map<string, RollPlayer>) {
  const list = ids.map((id) => byId.get(id)!).filter(Boolean);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null && x > 0);
    return v.length ? mean(v) : null;
  };
  return {
    ovr: avg(list.map((p) => p.ovr)),
    height: avg(list.map((p) => p.height_in)),
    weight: avg(list.map((p) => p.weight_lb)),
  };
}
