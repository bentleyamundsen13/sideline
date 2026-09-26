import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, BarChart3, Pencil, Settings } from "lucide-react";
import { getLeagueContext } from "@/lib/league";
import { EmptyState, SectionHeader } from "@/components/ui";
import { TeamTheme } from "@/components/team-theme";
import { DraftButton } from "@/components/draft-button";
import { PlayerHero } from "@/components/player-hero";
import { catchRate, completionPct } from "@/lib/ovr";
import { formatGameDate, formatHeight } from "@/lib/format";
import { FREE_AGENT_COLOR } from "@/lib/constants";
import type { StatLine } from "@/lib/types";

export default async function PlayerPage({ params }: PageProps<"/l/[leagueId]/players/[memberId]">) {
  const { leagueId, memberId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { me, teamById, memberById, statsByMember, ovrByMember, captainTeam, captainIds, games, supabase } = ctx;
  const player = memberById.get(memberId);
  if (!player) notFound();

  const base = `/l/${leagueId}`;
  const team = player.team_id ? teamById.get(player.team_id) ?? null : null;
  const ovr = ovrByMember.get(player.id) ?? null;
  const totals = statsByMember.get(player.id);
  const isMe = player.id === me.id;
  const isCaptain = captainIds.has(player.id);
  const gameById = new Map(games.map((g) => [g.id, g]));

  const { data: lineData } = await supabase
    .from("stat_lines")
    .select("*")
    .eq("member_id", player.id)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  const lines = (lineData ?? []) as StatLine[];

  const canRequestTrade = !!captainTeam && !!team && team.id !== captainTeam.id && !isCaptain;
  const canDraft = !!captainTeam && !team && player.onboarded;

  const bio = [
    ["Age", player.age],
    ["Height", formatHeight(player.height_in)],
    ["Weight", player.weight_lb ? `${player.weight_lb} lb` : null],
    ["Throws", player.dominant_hand],
    ["Hometown", player.hometown],
    ["Joined", new Date(player.joined_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })],
  ].filter(([, v]) => v != null && v !== "") as [string, string | number][];

  const cr = catchRate(totals);
  const season = [
    { label: "GP", value: totals?.games ?? 0 },
    { label: "TD", value: totals?.touchdowns ?? 0 },
    { label: "REC", value: totals?.receptions ?? 0 },
    { label: "INT", value: totals?.interceptions ?? 0 },
    { label: "DROPS", value: totals?.drops ?? 0 },
    { label: "FUM", value: totals?.fumbles ?? 0 },
    { label: "CATCH %", value: cr == null ? "—" : `${cr}` },
    { label: "TD / G", value: totals?.games ? (totals.touchdowns / totals.games).toFixed(1) : "—" },
  ];

  const cmp = completionPct(totals);
  const passing = totals?.pass_attempts
    ? [
        { label: "CMP / ATT", value: `${totals.pass_completions ?? 0}/${totals.pass_attempts}` },
        { label: "CMP %", value: cmp ?? "—" },
        { label: "PASS TD", value: totals.pass_tds ?? 0 },
        { label: "INT THR", value: totals.ints_thrown ?? 0 },
      ]
    : null;
  const showPassingLog = lines.some((l) => l.pass_attempts);

  const opponentFor = (line: StatLine) => {
    const g = line.game_id ? gameById.get(line.game_id) : null;
    if (!g || !team) return null;
    const oppId = g.home_team_id === team.id ? g.away_team_id : g.away_team_id === team.id ? g.home_team_id : null;
    return oppId ? teamById.get(oppId) ?? null : null;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <TeamTheme color={team?.color ?? FREE_AGENT_COLOR} />

      <PlayerHero player={player} team={team} ovr={ovr} isCaptain={isCaptain} base={base} />

      {(isMe || canRequestTrade || canDraft || me.is_commissioner) && (
        <div className="flex gap-2">
          {isMe && (
            <>
              <Link href={`${base}/me/stats`} className="btn btn-accent flex-1">
                <BarChart3 size={16} /> Log Stats
              </Link>
              <Link href={`${base}/me/edit`} className="btn btn-secondary flex-1">
                <Pencil size={16} /> Edit Profile
              </Link>
            </>
          )}
          {canRequestTrade && (
            <Link href={`${base}/trades/new?target=${player.id}`} className="btn btn-accent flex-1">
              <ArrowLeftRight size={16} /> Request Trade
            </Link>
          )}
          {canDraft && <DraftButton memberId={player.id} playerName={player.display_name} teamName={captainTeam!.name} full />}
          {me.is_commissioner && !isMe && (
            <Link href={`${base}/manage#players`} className="btn btn-secondary" aria-label="Manage player">
              <Settings size={16} />
            </Link>
          )}
        </div>
      )}

      {player.bio && <p className="text-text/90 px-1">{player.bio}</p>}

      <section className="card overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-line">
          {bio.map(([label, value]) => (
            <div key={label} className="bg-surface px-3 py-3 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div>
              <div className="font-semibold mt-0.5 truncate">{value}</div>
            </div>
          ))}
          {Array.from({ length: (3 - (bio.length % 3)) % 3 }, (_, i) => (
            <div key={`pad-${i}`} className="bg-surface" />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Season stats" />
        <div className="card overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-line">
            {season.map((s) => (
              <div key={s.label} className="bg-surface px-2 py-3 text-center">
                <div className="display text-2xl tabular">{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {passing && (
            <>
              <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted font-semibold border-t border-line">Passing</div>
              <div className="grid grid-cols-4 gap-px bg-line border-t border-line">
                {passing.map((s) => (
                  <div key={s.label} className="bg-surface px-2 py-3 text-center">
                    <div className="display text-2xl tabular">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted mt-2 px-1">
          OVR is built from per-game touchdowns, interceptions and receptions, minus drops and fumbles. QBs also get
          credit for TD passes and completion %, and lose points for interceptions thrown. It settles in after 3 games.
        </p>
      </section>

      <section>
        <SectionHeader title="Game log" />
        {lines.length === 0 ? (
          <EmptyState
            title="No games logged"
            body={isMe ? "Log your stats after each game to build your OVR." : `${player.display_name} hasn't logged any games yet.`}
            action={
              isMe ? (
                <Link href={`${base}/me/stats`} className="btn btn-primary btn-sm">
                  Log a game
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-line">
                  <th className="text-left font-semibold py-2.5 pl-4">Game</th>
                  {showPassingLog && <th className="font-semibold px-2">Pass</th>}
                  <th className="font-semibold px-2">TD</th>
                  <th className="font-semibold px-2">REC</th>
                  <th className="font-semibold px-2">INT</th>
                  <th className="font-semibold px-2">DRP</th>
                  <th className="font-semibold px-2 pr-4">FUM</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const opp = opponentFor(l);
                  return (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pl-4">
                        <div className="font-medium">{opp ? `vs ${opp.name}` : l.game_id ? "League game" : "Pickup"}</div>
                        <div className="text-xs text-muted">{formatGameDate(l.played_on + "T12:00:00")}</div>
                      </td>
                      {showPassingLog && (
                        <td className="text-center px-2 whitespace-nowrap">
                          {l.pass_attempts ? (
                            <>
                              <div>
                                {l.pass_completions ?? 0}/{l.pass_attempts}
                              </div>
                              <div className="text-[11px] text-muted">
                                {l.pass_tds ?? 0} TD · {l.ints_thrown ?? 0} INT
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">–</span>
                          )}
                        </td>
                      )}
                      <td className="text-center px-2">{l.touchdowns}</td>
                      <td className="text-center px-2">{l.receptions}</td>
                      <td className="text-center px-2">{l.interceptions}</td>
                      <td className="text-center px-2">{l.drops}</td>
                      <td className="text-center px-2 pr-4">{l.fumbles}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
