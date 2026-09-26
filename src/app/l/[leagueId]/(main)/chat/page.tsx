import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getLeagueContext, rosterOf } from "@/lib/league";
import { TeamChat } from "@/components/team-chat";
import { TeamTheme } from "@/components/team-theme";
import { EmptyState, TeamBadge } from "@/components/ui";
import { FREE_AGENTS_ID } from "@/lib/constants";
import type { TeamMessage } from "@/lib/types";

export const metadata = { title: "Team chat" };

export default async function ChatPage({ params }: PageProps<"/l/[leagueId]/chat">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { me, myTeam, members, supabase } = ctx;

  if (!myTeam) {
    return (
      <div className="animate-fade-up pt-6">
        <EmptyState
          title="No team chat yet"
          body="Team chat unlocks once you're on a team. Captains can draft you from Free Agents."
          action={
            <Link href={`/l/${leagueId}/teams/${FREE_AGENTS_ID}`} className="btn btn-secondary btn-sm">
              See Free Agents
            </Link>
          }
        />
      </div>
    );
  }

  const { data } = await supabase
    .from("team_messages")
    .select("*")
    .eq("team_id", myTeam.id)
    .order("created_at", { ascending: false })
    .limit(150);
  const initial = ((data ?? []) as TeamMessage[]).reverse();
  const roster = rosterOf(ctx, myTeam.id);

  return (
    <div>
      <TeamTheme color={myTeam.color} />
      <div className="flex items-center gap-3 pb-3 mb-2 border-b border-line">
        <TeamBadge team={myTeam} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="display text-2xl truncate">{myTeam.name}</h1>
          <p className="text-xs text-muted truncate">
            <MessageCircle size={11} className="inline -mt-0.5 mr-1" />
            Team chat · {roster.map((m) => m.display_name.split(" ")[0]).join(", ")}
          </p>
        </div>
      </div>
      <TeamChat
        leagueId={leagueId}
        teamId={myTeam.id}
        teamColor={myTeam.color}
        meId={me.id}
        members={members.map((m) => ({ id: m.id, display_name: m.display_name, avatar_url: m.avatar_url }))}
        initial={initial}
      />
    </div>
  );
}
