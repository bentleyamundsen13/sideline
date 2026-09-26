import Link from "next/link";
import { ArrowLeftRight, ChevronRight, MapPin, Settings, UserPlus, Zap } from "lucide-react";
import { getLeagueContext } from "@/lib/league";
import { GameCard } from "@/components/game-card";
import { NewsFeed } from "@/components/news-feed";
import { Avatar, EmptyState, OvrBadge, SectionHeader, TeamBadge } from "@/components/ui";
import { TeamTheme } from "@/components/team-theme";
import { recordString } from "@/lib/format";
import { FREE_AGENTS_ID } from "@/lib/constants";
import { requestTime } from "@/lib/time";
import type { News } from "@/lib/types";

export default async function LeagueHome({ params }: PageProps<"/l/[leagueId]">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { league, me, teams, members, games, teamById, records, ranked, captainTeam, statsByMember, ovrByMember, supabase, incomingTrades } = ctx;
  const base = `/l/${leagueId}`;

  const { data: newsData } = await supabase
    .from("news")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(15);
  const news = (newsData ?? []) as News[];

  const players = members.filter((m) => m.onboarded);
  const freeAgents = players.filter((m) => !m.team_id);
  const now = requestTime();
  const upcoming = games.filter((g) => g.status === "scheduled" && new Date(g.scheduled_at).getTime() > now - 3 * 3600_000).slice(0, 4);
  const results = games.filter((g) => g.status === "final").reverse().slice(0, 4);
  const gamesPlayed = games.filter((g) => g.status === "final").length;

  const rated = players
    .map((m) => ({ m, ovr: ovrByMember.get(m.id) ?? null }))
    .filter((x) => x.ovr != null)
    .sort((a, b) => b.ovr! - a.ovr!)
    .slice(0, 5);

  const leader = (key: "touchdowns" | "interceptions" | "receptions" | "pass_tds") => {
    let best: { id: string; value: number } | null = null;
    for (const [id, s] of statsByMember) {
      const v = s[key] ?? 0;
      if (v > 0 && (!best || v > best.value)) best = { id, value: v };
    }
    return best ? { member: ctx.memberById.get(best.id)!, value: best.value } : null;
  };
  const leaders = [
    { label: "Touchdowns", l: leader("touchdowns") },
    { label: "Passing TDs", l: leader("pass_tds") },
    { label: "Receptions", l: leader("receptions") },
    { label: "Interceptions", l: leader("interceptions") },
  ];

  const callouts: { href: string; icon: typeof Zap; title: string; body: string; strong?: boolean }[] = [];
  if (me.is_commissioner && teams.length === 0)
    callouts.push({ href: `${base}/manage`, icon: Settings, title: "Set up your league", body: "Create teams and pick captains to get the draft started.", strong: true });
  if (incomingTrades > 0)
    callouts.push({ href: `${base}/trades`, icon: ArrowLeftRight, title: `${incomingTrades} trade offer${incomingTrades === 1 ? "" : "s"} waiting`, body: "Accept, decline, or counter.", strong: true });
  if (captainTeam && freeAgents.length > 0)
    callouts.push({ href: `${base}/teams/${FREE_AGENTS_ID}`, icon: UserPlus, title: `${freeAgents.length} free agent${freeAgents.length === 1 ? "" : "s"} available`, body: `Draft them to ${captainTeam.name}.` });
  if (!me.team_id && !captainTeam)
    callouts.push({ href: `${base}/teams/${FREE_AGENTS_ID}`, icon: UserPlus, title: "You're a free agent", body: "Sit tight. Captains can draft you any time." });
  if (!statsByMember.get(me.id))
    callouts.push({ href: `${base}/me/stats`, icon: Zap, title: "Get your OVR", body: "Log your stats from a game to earn a rating." });

  return (
    <div className="space-y-8 animate-fade-up">
      <TeamTheme color={null} />

      <section className="pt-2">
        <div className="flex flex-wrap gap-2">
          <span className="chip">{league.sport}</span>
          {league.season && <span className="chip">{league.season}</span>}
          {league.location && (
            <span className="chip">
              <MapPin size={11} /> {league.location}
            </span>
          )}
        </div>
        <h1 className="display text-5xl mt-3">{league.name}</h1>
        {league.description && <p className="text-muted mt-2 max-w-xl">{league.description}</p>}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: "Teams", value: teams.length, href: `${base}/teams` },
            { label: "Players", value: players.length, href: `${base}/players` },
            { label: "Games played", value: gamesPlayed, href: `${base}/schedule` },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="card px-3 py-2.5 relative hover:bg-surface-2 active:bg-surface-2 transition-colors">
              <ChevronRight size={15} className="absolute top-2.5 right-2 text-muted" />
              <div className="display text-3xl tabular">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {callouts.length > 0 && (
        <section className="space-y-2">
          {callouts.map(({ href, icon: Icon, title, body, strong }) => (
            <Link
              key={title}
              href={href}
              className={`card flex items-center gap-3 p-3.5 transition-colors ${strong ? "!border-brand/50 bg-brand/5 hover:bg-brand/10" : "hover:bg-surface-2"}`}
            >
              <span className={`w-9 h-9 rounded-xl inline-flex items-center justify-center ${strong ? "bg-brand text-bg" : "bg-surface-2 text-brand"}`}>
                <Icon size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-xs text-muted">{body}</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        </section>
      )}

      <section>
        <SectionHeader
          title="Upcoming games"
          action={
            games.length > 0 ? (
              <Link href={`${base}/schedule`} className="text-xs font-semibold text-muted hover:text-text">
                Full schedule
              </Link>
            ) : undefined
          }
        />
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on the schedule"
            body={me.is_commissioner ? "Add games from Manage League." : "The commissioner hasn't scheduled any games yet."}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map((g) => (
              <GameCard key={g.id} game={g} home={teamById.get(g.home_team_id)} away={teamById.get(g.away_team_id)} leagueId={leagueId} highlightTeamId={me.team_id} />
            ))}
          </div>
        )}
      </section>

      {teams.length > 0 && (
        <section>
          <SectionHeader title="Standings" />
          <div className="card overflow-hidden">
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-line">
                  <th className="text-left font-semibold py-2.5 pl-4 w-8">#</th>
                  <th className="text-left font-semibold py-2.5">Team</th>
                  <th className="font-semibold py-2.5 px-2">W-L</th>
                  <th className="font-semibold py-2.5 px-2 hidden sm:table-cell">PF</th>
                  <th className="font-semibold py-2.5 px-2 hidden sm:table-cell">PA</th>
                  <th className="font-semibold py-2.5 px-2">Diff</th>
                  <th className="font-semibold py-2.5 pr-4 pl-2">Strk</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((t, i) => {
                  const r = records.get(t.id)!;
                  const diff = r.pointsFor - r.pointsAgainst;
                  return (
                    <tr key={t.id} className={`border-b border-line last:border-0 ${t.id === me.team_id ? "bg-surface-2" : ""}`}>
                      <td className="py-2.5 pl-4 text-muted">{i + 1}</td>
                      <td className="py-2.5">
                        <Link href={`${base}/teams/${t.id}`} className="flex items-center gap-2.5 hover:underline underline-offset-2">
                          <TeamBadge team={t} size={26} />
                          <span className="font-semibold truncate">{t.name}</span>
                        </Link>
                      </td>
                      <td className="text-center px-2 font-semibold">{recordString(r)}</td>
                      <td className="text-center px-2 text-muted hidden sm:table-cell">{r.pointsFor}</td>
                      <td className="text-center px-2 text-muted hidden sm:table-cell">{r.pointsAgainst}</td>
                      <td className={`text-center px-2 ${diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-muted"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="text-center pr-4 pl-2 text-muted">{r.streak ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section>
          <SectionHeader title="Recent results" />
          <div className="grid sm:grid-cols-2 gap-3">
            {results.map((g) => (
              <GameCard key={g.id} game={g} home={teamById.get(g.home_team_id)} away={teamById.get(g.away_team_id)} leagueId={leagueId} highlightTeamId={me.team_id} />
            ))}
          </div>
        </section>
      )}

      {rated.length > 0 && (
        <section>
          <SectionHeader title="League leaders" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {leaders.map(({ label, l }) => (
              <div key={label} className="card p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div>
                {l ? (
                  <Link href={`${base}/players/${l.member.id}`} className="block mt-2">
                    <div className="display text-3xl tabular">{l.value}</div>
                    <div className="text-xs truncate mt-0.5 hover:underline">{l.member.display_name}</div>
                  </Link>
                ) : (
                  <div className="display text-3xl text-muted mt-2">—</div>
                )}
              </div>
            ))}
          </div>
          <div className="card divide-y divide-line">
            {rated.map(({ m, ovr }, i) => {
              const team = m.team_id ? teamById.get(m.team_id) : null;
              return (
                <Link key={m.id} href={`${base}/players/${m.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors">
                  <span className="w-5 text-center text-muted text-sm tabular">{i + 1}</span>
                  <Avatar member={m} color={team?.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-sm">{m.display_name}</div>
                    <div className="text-xs text-muted truncate">{team?.name ?? "Free Agent"}</div>
                  </div>
                  <OvrBadge ovr={ovr} size="sm" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="League news"
          action={
            me.is_commissioner ? (
              <Link href={`${base}/manage#news`} className="text-xs font-semibold text-muted hover:text-text">
                Post update
              </Link>
            ) : undefined
          }
        />
        {news.length === 0 ? <EmptyState title="No news yet" /> : <NewsFeed items={news} />}
      </section>
    </div>
  );
}
