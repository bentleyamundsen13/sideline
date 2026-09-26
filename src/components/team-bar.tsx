"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Home } from "lucide-react";
import { textOn } from "@/lib/format";
import { FREE_AGENT_COLOR, FREE_AGENTS_ID } from "@/lib/constants";

type BarTeam = { id: string; name: string; abbr: string; color: string };

export function TeamBar({ leagueId, teams, freeAgentCount }: { leagueId: string; teams: BarTeam[]; freeAgentCount: number }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);
  const base = `/l/${leagueId}`;

  const items = [
    ...teams.map((t) => ({ key: t.id, href: `${base}/teams/${t.id}`, label: t.name, abbr: t.abbr, color: t.color })),
    { key: FREE_AGENTS_ID, href: `${base}/teams/${FREE_AGENTS_ID}`, label: "Free Agents", abbr: String(freeAgentCount), color: FREE_AGENT_COLOR },
  ];

  useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>("[data-active=true]")
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [pathname]);

  const homeActive = pathname === base;

  return (
    <nav aria-label="Teams" className="relative">
      <div ref={scroller} className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3 pt-1 mx-auto max-w-3xl">
        <Link
          href={base}
          data-active={homeActive}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3.5 h-9 text-sm font-semibold border transition-colors ${
            homeActive ? "bg-text text-bg border-text" : "border-line text-muted hover:text-text bg-surface"
          }`}
        >
          <Home size={15} /> League
        </Link>
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.key}
              href={it.href}
              data-active={active}
              className="shrink-0 inline-flex items-center gap-2 rounded-full pl-1 pr-3.5 h-9 text-sm font-semibold border transition-colors"
              style={
                active
                  ? { background: it.color, borderColor: it.color, color: textOn(it.color) }
                  : { borderColor: "var(--line)", background: "var(--surface)" }
              }
            >
              <span
                className="w-7 h-7 rounded-full inline-flex items-center justify-center display text-[11px]"
                style={
                  active
                    ? { background: "rgba(0,0,0,.18)", color: textOn(it.color) }
                    : { background: it.color, color: textOn(it.color) }
                }
              >
                {it.abbr}
              </span>
              <span className={active ? "" : "text-text/85"}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
