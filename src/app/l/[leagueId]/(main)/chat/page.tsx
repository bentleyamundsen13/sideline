import Link from "next/link";
import { getLeagueContext, rosterOf } from "@/lib/league";
import { ChatRoom } from "@/components/chat-room";
import { ChatTabs } from "@/components/chat-tabs";
import { TeamTheme } from "@/components/team-theme";
import { EmptyState, TeamBadge } from "@/components/ui";
import { FREE_AGENTS_ID } from "@/lib/constants";
import type { TeamMessage } from "@/lib/types";

export const metadata = { title: "Chat" };

const BRAND = "#c8f135";

export default async function ChatPage({ params, searchParams }: PageProps<"/l/[leagueId]/chat">) {
  const { leagueId } = await params;
  const { c } = await searchParams;
  const ctx = await getLeagueContext(leagueId);
  const { me, myTeam, members, teamById, league, supabase } = ctx;

  // Team chat by default; the league chat if you pick it (or aren't on a team yet).
  const channel: "team" | "league" = c === "league" || !myTeam ? "league" : "team";
  const teamId = channel === "team" ? myTeam!.id : null;

  const tabs = (
    <ChatTabs leagueId={leagueId} teamId={myTeam?.id ?? null} meId={me.id} active={channel} teamLabel={myTeam?.name ?? "Team"} />
  );

  // Free agents can open the Team tab but there's nothing there yet.
  if (c === "team" && !myTeam) {
    return (
      <div className="animate-fade-up space-y-4">
        {tabs}
        <EmptyState
          title="No team chat yet"
          body="Team chat unlocks once you're on a team. The League chat is open to everyone."
          action={
            <Link href={`/l/${leagueId}/teams/${FREE_AGENTS_ID}`} className="btn btn-secondary btn-sm">
              See Free Agents
            </Link>
          }
        />
      </div>
    );
  }

  let query = supabase.from("team_messages").select("*").eq("league_id", leagueId);
  query = teamId ? query.eq("team_id", teamId) : query.is("team_id", null);
  const { data } = await query.order("created_at", { ascending: false }).limit(150);
  const initial = ((data ?? []) as TeamMessage[]).reverse();

  const roster = myTeam ? rosterOf(ctx, myTeam.id) : [];
  const leagueCount = members.filter((m) => m.onboarded).length;

  return (
    <>
      <TeamTheme color={channel === "team" ? myTeam!.color : null} />
      <ChatRoom
        key={channel}
        leagueId={leagueId}
        teamId={teamId}
        accent={channel === "team" ? myTeam!.color : BRAND}
        meId={me.id}
        canModerate={me.is_commissioner}
        members={members.map((m) => ({
          id: m.id,
          name: m.display_name,
          avatarUrl: m.avatar_url,
          color: m.team_id ? (teamById.get(m.team_id)?.color ?? null) : null,
        }))}
        initial={initial}
        placeholder={channel === "team" ? "Message your team" : "Message the league"}
        emptyBody={channel === "team" ? "Only your teammates can see this chat." : "Everyone in the league can see this chat."}
        header={
          <div className="space-y-3 pb-3 border-b border-line">
            {tabs}
            <div className="flex items-center gap-2.5">
              {channel === "team" ? <TeamBadge team={myTeam} size={30} /> : <TeamBadge team={{ abbr: "ALL", color: BRAND }} size={30} />}
              <p className="text-xs text-muted truncate">
                {channel === "team"
                  ? `Team chat · ${roster.map((m) => m.display_name.split(" ")[0]).join(", ")}`
                  : `League chat · everyone in ${league.name} (${leagueCount})`}
              </p>
            </div>
          </div>
        }
      />
    </>
  );
}
