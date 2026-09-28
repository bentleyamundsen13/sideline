"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Shield } from "lucide-react";
import { useUnreadChats } from "@/lib/use-unread-chat";
import { Avatar } from "./ui";

type Props = {
  base: string;
  leagueId: string;
  me: { id: string; display_name: string; avatar_url: string | null };
  teamId: string | null;
  teamColor: string | null;
  youBadge: number;
};

export function BottomNav({ base, leagueId, me, teamId, teamColor, youBadge }: Props) {
  const pathname = usePathname();
  const chats = useUnreadChats(leagueId, teamId, me.id);
  // Team + league chat together. On the Chat screen the tabs up top show each one instead.
  const unread = pathname === `${base}/chat` ? 0 : chats.team + chats.league;

  const isYou =
    pathname.startsWith(`${base}/me`) ||
    pathname === `${base}/players/${me.id}` ||
    pathname.startsWith(`${base}/trades`) ||
    pathname.startsWith(`${base}/manage`) ||
    pathname.startsWith(`${base}/notifications`);

  const tabs = [
    {
      href: base,
      label: "Home",
      active: pathname === base || ["schedule", "games", "leaders"].some((p) => pathname.startsWith(`${base}/${p}`)),
      icon: <Home size={22} />,
    },
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
      // Home-bar padding comes from --nav-pad (none in the installed app; see globals.css).
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 bg-bg border-t border-line pb-[var(--nav-pad)]"
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
