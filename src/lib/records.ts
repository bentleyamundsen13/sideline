import type { Game, Team, TeamRecord } from "./types";

export function computeRecords(teams: Team[], games: Game[]): Map<string, TeamRecord> {
  const records = new Map<string, TeamRecord>(
    teams.map((t) => [
      t.id,
      { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, streak: null, played: 0 },
    ]),
  );
  const results = new Map<string, ("W" | "L" | "T")[]>();

  const finals = games
    .filter((g) => g.status === "final" && g.home_score != null && g.away_score != null)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  for (const g of finals) {
    const sides: [string, number, number][] = [
      [g.home_team_id, g.home_score!, g.away_score!],
      [g.away_team_id, g.away_score!, g.home_score!],
    ];
    for (const [teamId, scored, allowed] of sides) {
      const r = records.get(teamId);
      if (!r) continue;
      r.played++;
      r.pointsFor += scored;
      r.pointsAgainst += allowed;
      const res = scored > allowed ? "W" : scored < allowed ? "L" : "T";
      if (res === "W") r.wins++;
      else if (res === "L") r.losses++;
      else r.ties++;
      results.set(teamId, [...(results.get(teamId) ?? []), res]);
    }
  }

  for (const [teamId, list] of results) {
    const last = list[list.length - 1];
    let n = 0;
    for (let i = list.length - 1; i >= 0 && list[i] === last; i--) n++;
    records.get(teamId)!.streak = `${last}${n}`;
  }

  return records;
}

export function winPct(r: TeamRecord) {
  return r.played === 0 ? 0 : (r.wins + r.ties * 0.5) / r.played;
}

export function standings(teams: Team[], records: Map<string, TeamRecord>) {
  return [...teams].sort((a, b) => {
    const ra = records.get(a.id)!;
    const rb = records.get(b.id)!;
    return (
      winPct(rb) - winPct(ra) ||
      rb.wins - ra.wins ||
      rb.pointsFor - rb.pointsAgainst - (ra.pointsFor - ra.pointsAgainst) ||
      a.name.localeCompare(b.name)
    );
  });
}
