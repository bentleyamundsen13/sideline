"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, MessageCircle, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CHAT_SEEN_EVENT, getChatSeen } from "@/lib/chat-seen";
import type { TeamMessage } from "@/lib/types";
import { Avatar } from "./ui";

type Props = {
  base: string;
  me: { id: string; display_name: string; avatar_url: string | null };
  teamId: string | null;
  teamColor: string | null;
  youBadge: number;
};

export function BottomNav({ base, me, teamId, teamColor, youBadge }: Props) {
  const pathname = usePathname();
  const unread = useUnreadChat(teamId, me.id, pathname === `${base}/chat`);

  const isYou =
    pathname.startsWith(`${base}/me`) ||
    pathname === `${base}/players/${me.id}` ||
    pathname.startsWith(`${base}/trades`) ||
    pathname.startsWith(`${base}/manage`) ||
    pathname.startsWith(`${base}/notifications`);

  const tabs = [
    { href: base, label: "Home", active: pathname === base, icon: <Home size={22} /> },
    {
      href: `${base}/teams`,
      label: "Teams",
      active: pathname.startsWith(`${base}/teams`) || (pathname.startsWith(`${base}/players`) && !isYou),
      icon: <Shield size={22} />,
    },
    { href: `${base}/chat`, label: "Chat", active: pathname === `${base}/chat`, icon: <MessageCircle size={22} />, badge: unread },
    {
      href: `${base}/me`,
      label: "You",
      active: isYou,
      icon: <Avatar member={me} color={teamColor} size="xs" />,
      badge: youBadge,
    },
  ];

  return (
    <nav
      aria-label="Main"
      // Capped at the iPhone home-indicator inset: right after the keyboard closes,
      // iOS can briefly report a much larger value and double the bar's height.
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 bg-bg border-t border-line pb-[min(env(safe-area-inset-bottom),34px)]"
    >
      <div className="mx-auto max-w-3xl grid grid-cols-4">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold transition-colors ${
              t.active ? "text-text" : "text-muted"
            }`}
          >
            {t.active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" />}
            <span className={`relative ${t.active ? "" : "opacity-80"}`}>
              {t.icon}
              {!!t.badge && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center tabular">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Messages from teammates since you last opened the chat, kept live. */
function useUnreadChat(teamId: string | null, myMemberId: string, onChatPage: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!teamId) return;
    const supabase = createClient();
    const refresh = () =>
      supabase
        .from("team_messages")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .neq("member_id", myMemberId)
        .gt("created_at", getChatSeen(teamId))
        .then(({ count }) => setCount(count ?? 0));
    refresh();

    const channel = supabase
      .channel(`chat-badge:${teamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, (p) => {
        if ((p.new as TeamMessage).member_id !== myMemberId) setCount((c) => c + 1);
      })
      .subscribe();
    window.addEventListener(CHAT_SEEN_EVENT, refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(CHAT_SEEN_EVENT, refresh);
    };
  }, [teamId, myMemberId]);

  return teamId && !onChatPage ? count : 0;
}
