"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeftRight,
  Bell,
  BarChart3,
  Check,
  Copy,
  Home,
  LayoutGrid,
  Menu,
  Pencil,
  Settings,
  Share2,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { OPEN_INSTALL_GUIDE, useCanInstall } from "./install-guide";
import { Avatar, OvrBadge } from "./ui";
import { SignOutButton } from "./sign-out-button";

type Props = {
  leagueId: string;
  leagueName: string;
  leagueCode: string;
  me: { id: string; display_name: string; avatar_url: string | null };
  teamName: string | null;
  teamColor: string | null;
  ovr: number | null;
  isCommish: boolean;
  captainOf: string | null;
  pendingTrades: number;
};

export function MenuDrawer(p: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const canInstall = useCanInstall();
  const base = `/l/${p.leagueId}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function share() {
    const text = `Join ${p.leagueName} on Sideline with code ${p.leagueCode}`;
    const url = `${window.location.origin}/join`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.leagueName, text, url });
      } catch {
        // user dismissed the share sheet
      }
    } else {
      await navigator.clipboard.writeText(`${text}: ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const links = [
    { href: base, label: "League Home", icon: Home },
    { href: `${base}/players/${p.me.id}`, label: "My Profile", icon: User },
    { href: `${base}/me/stats`, label: "Log My Stats", icon: BarChart3 },
    { href: `${base}/me/edit`, label: "Edit Profile", icon: Pencil },
    { href: `${base}/trades`, label: "Trades", icon: ArrowLeftRight, badge: p.pendingTrades },
    { href: `${base}/notifications`, label: "Notifications", icon: Bell },
    ...(p.isCommish ? [{ href: `${base}/manage`, label: "Manage League", icon: Settings }] : []),
    { href: "/", label: "Switch League", icon: LayoutGrid },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 inline-flex items-center justify-center rounded-xl hover:bg-surface-2 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {mounted &&
        createPortal(
          <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-xs bg-surface border-r border-line flex flex-col transition-transform duration-300 pt-[env(safe-area-inset-top)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => {
          // Close after tapping any link inside the drawer.
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-line">
          <span className="display text-lg truncate">{p.leagueName}</span>
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <Link
          href={`${base}/players/${p.me.id}`}
          className="m-3 p-3 rounded-2xl flex items-center gap-3 border border-line"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${p.teamColor ?? "#64748b"} 30%, transparent), transparent)`,
          }}
        >
          <Avatar member={p.me} color={p.teamColor} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{p.me.display_name}</div>
            <div className="text-xs text-muted truncate">
              {p.teamName ?? "Free Agent"}
              {p.captainOf && " · Captain"}
              {p.isCommish && " · Commish"}
            </div>
          </div>
          <OvrBadge ovr={p.ovr} />
        </Link>

        <nav className="flex-1 overflow-y-auto px-2">
          {links.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-surface-2 text-text" : "text-text/80 hover:bg-surface-2"
                }`}
              >
                <Icon size={18} className="text-muted" />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line space-y-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {canInstall && (
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold bg-brand text-bg"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE));
              }}
            >
              <Smartphone size={18} /> Add to Home Screen
            </button>
          )}
          <div className="rounded-xl bg-bg border border-line p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">League code</div>
            <div className="flex items-center justify-between mt-1">
              <span className="display text-3xl tracking-[0.2em]">{p.leagueCode}</span>
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label="Copy code"
                  onClick={async () => {
                    await navigator.clipboard.writeText(p.leagueCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button className="btn btn-ghost btn-sm" aria-label="Share invite" onClick={share}>
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
          <SignOutButton className="btn btn-ghost btn-sm w-full justify-start" />
        </div>
      </aside>
          </>,
          document.body,
        )}
    </>
  );
}
