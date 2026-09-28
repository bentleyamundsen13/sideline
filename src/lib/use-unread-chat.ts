"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "./supabase/client";
import { CHAT_SEEN_EVENT, chatKey, getChatSeen, rememberChatSeen } from "./chat-seen";
import type { TeamMessage } from "./types";

/**
 * Unread message counts for your team chat and the league chat, kept live.
 * "Seen" comes from your account, so reading a chat on your phone clears it here too.
 */
export function useUnreadChats(leagueId: string, teamId: string | null, myMemberId: string) {
  const [counts, setCounts] = useState({ team: 0, league: 0 });
  const instance = useId();

  useEffect(() => {
    const supabase = createClient();
    const teamKey = teamId ? chatKey(leagueId, teamId) : null;
    const leagueKey = chatKey(leagueId, null);
    const base = () => supabase.from("team_messages").select("id", { count: "exact", head: true }).eq("league_id", leagueId);
    const countSince = (q: ReturnType<typeof base>, key: string) =>
      q.neq("member_id", myMemberId).gt("created_at", getChatSeen(key)).then(({ count }) => count ?? 0);

    const recount = () =>
      Promise.all([
        teamKey ? countSince(base().eq("team_id", teamId!), teamKey) : Promise.resolve(0),
        countSince(base().is("team_id", null), leagueKey),
      ]).then(([team, league]) => setCounts({ team, league }));

    // Pull what your other devices have read, then count.
    const sync = async () => {
      const { data } = await supabase.from("chat_reads").select("chat, seen_at").eq("member_id", myMemberId);
      for (const r of data ?? []) rememberChatSeen(r.chat as string, new Date(r.seen_at as string).toISOString());
      await recount();
    };
    sync();

    // Row-level security only delivers messages you're allowed to see: your team's and the league's.
    const channel = supabase
      .channel(`unread:${leagueId}:${instance}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `league_id=eq.${leagueId}` }, (p) => {
        const m = p.new as TeamMessage;
        if (m.member_id === myMemberId) return;
        if (m.team_id === null) setCounts((c) => ({ ...c, league: c.league + 1 }));
        else if (m.team_id === teamId) setCounts((c) => ({ ...c, team: c.team + 1 }));
      })
      // You read a chat on another device.
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads", filter: `member_id=eq.${myMemberId}` }, (p) => {
        const r = p.new as { chat?: string; seen_at?: string };
        if (!r.chat || !r.seen_at) return;
        rememberChatSeen(r.chat, new Date(r.seen_at).toISOString());
        recount();
      })
      .subscribe();

    // Coming back to the app (e.g. after reading on your phone): catch up.
    const onVisible = () => document.visibilityState === "visible" && sync();
    window.addEventListener(CHAT_SEEN_EVENT, recount);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(CHAT_SEEN_EVENT, recount);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [leagueId, teamId, myMemberId, instance]);

  return counts;
}
