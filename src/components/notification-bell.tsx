"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Bell, Crown, UserPlus, Megaphone, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import type { Notification } from "@/lib/types";

function KindIcon({ kind }: { kind: string }) {
  if (kind.startsWith("trade") || kind === "traded") return <ArrowLeftRight size={16} />;
  if (kind === "captain") return <Crown size={16} />;
  if (kind === "drafted" || kind === "assigned" || kind === "member_joined") return <UserPlus size={16} />;
  return <Megaphone size={16} />;
}

function fetchRecent(leagueId: string) {
  return createClient()
    .from("notifications")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(20)
    .then(({ data }) => (data ?? []) as Notification[]);
}

export function NotificationBell({ userId, leagueId }: { userId: string; leagueId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetchRecent(leagueId).then(setItems);
  }, [leagueId]);

  useEffect(() => {
    fetchRecent(leagueId).then(setItems);
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification;
          if (n.league_id !== leagueId) return;
          setItems((prev) => [n, ...prev].slice(0, 20));
          setRing(true);
          setTimeout(() => setRing(false), 1200);
          // Something changed about you (drafted, traded...). Pull fresh data.
          router.refresh();
        },
      )
      .subscribe();
    window.addEventListener("sideline:notifications-read", load);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("sideline:notifications-read", load);
    };
  }, [userId, leagueId, load, router]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids);
  }

  return (
    <div ref={panel} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 inline-flex items-center justify-center rounded-xl hover:bg-surface-2 transition-colors"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell size={21} className={ring ? "animate-bounce" : ""} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center tabular">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 card shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="display text-lg">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => markRead(items.filter((n) => !n.read_at).map((n) => n.id))}>
                  <Check size={14} /> Mark all read
                </button>
              )}
              <button className="btn btn-ghost btn-sm sm:hidden" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <p className="text-sm text-muted text-center py-10">You&apos;re all caught up.</p>}
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onClick={() => {
                  markRead([n.id]);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <Link
            href={`/l/${leagueId}/notifications`}
            onClick={() => setOpen(false)}
            className="block text-center text-sm font-semibold py-3 border-t border-line hover:bg-surface-2"
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationItem({ n, onClick }: { n: Notification; onClick?: () => void }) {
  const content = (
    <div className={`flex gap-3 px-4 py-3 ${n.read_at ? "" : "bg-accent/5"} hover:bg-surface-2 transition-colors`}>
      <span
        className={`w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center ${
          n.read_at ? "bg-surface-2 text-muted" : "bg-brand text-bg"
        }`}
      >
        <KindIcon kind={n.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${n.read_at ? "text-muted" : "font-semibold"}`}>{n.title}</p>
        {n.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>}
        <p className="text-[11px] text-muted mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read_at && <span className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" aria-label="Unread" />}
    </div>
  );
  return n.link ? (
    <Link href={n.link} onClick={onClick} className="block">
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}
