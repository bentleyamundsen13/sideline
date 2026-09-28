"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "./supabase/client";
import { CHAT_SEEN_EVENT, chatKey, getChatSeen } from "./chat-seen";
import type { TeamMessage } from "./types";

/** Unread message counts for your team chat and the league chat, kept live. */
export function useUnreadChats(leagueId: string, teamId: string | null, myMemberId: string) {
  const [counts, setCounts] = useState({ team: 0, league: 0 });
  const instance = useId();

  useEffect(() => {
    const supabase = createClient();
    const base = () => supabase.from("team_messages").select("id", { count: "exact", head: true }).eq("league_id", leagueId);
    const countSince = (q: ReturnType<typeof base>, key: string) =>
      q.neq("member_id", myMemberId).gt("created_at", getChatSeen(key)).then(({ count }) => count ?? 0);

    const refresh = () =>
      Promise.all([
        teamId ? countSince(base().eq("team_id", teamId), chatKey(leagueId, teamId)) : Promise.resolve(0),
        countSince(base().is("team_id", null), chatKey(leagueId, null)),
      ]).then(([team, league]) => setCounts({ team, league }));
    refresh();

    // Row-level security only delivers messages you're allowed to see: your team's and the league's.
    const channel = supabase
      .channel(`unread:${leagueId}:${instance}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `league_id=eq.${leagueId}` }, (p) => {
        const m = p.new as TeamMessage;
        if (m.member_id === myMemberId) return;
        if (m.team_id === null) setCounts((c) => ({ ...c, league: c.league + 1 }));
        else if (m.team_id === teamId) setCounts((c) => ({ ...c, team: c.team + 1 }));
      })
      .subscribe();
    window.addEventListener(CHAT_SEEN_EVENT, refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(CHAT_SEEN_EVENT, refresh);
    };
  }, [leagueId, teamId, myMemberId, instance]);

  return counts;
}
