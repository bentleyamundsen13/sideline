"use client";

import Link from "next/link";
import { useUnreadChats } from "@/lib/use-unread-chat";

/** Team | League switch at the top of Chat, each with its own unread badge. */
export function ChatTabs({
  leagueId,
  teamId,
  meId,
  active,
  teamLabel,
}: {
  leagueId: string;
  teamId: string | null;
  meId: string;
  active: "team" | "league";
  teamLabel: string;
}) {
  const unread = useUnreadChats(leagueId, teamId, meId);
  const base = `/l/${leagueId}/chat`;
  const tabs = [
    { key: "team" as const, label: teamLabel, href: `${base}?c=team`, count: unread.team },
    { key: "league" as const, label: "League", href: `${base}?c=league`, count: unread.league },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2 border border-line" role="tablist" aria-label="Chats">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            replace
            role="tab"
            aria-selected={on}
            className={`relative h-9 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
              on ? "bg-bg text-text shadow" : "text-muted"
            }`}
          >
            <span className="truncate max-w-[70%]">{t.label}</span>
            {/* The chat you're looking at is being read, so only badge the other one. */}
            {!on && t.count > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center tabular">
                {t.count > 9 ? "9+" : t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
