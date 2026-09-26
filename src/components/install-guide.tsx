"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Ellipsis, Share, SquarePlus, X } from "lucide-react";
import { Logo } from "./ui";

const DISMISS_KEY = "sideline-install-dismissed-at";
const SNOOZE_MS = 3 * 24 * 3600_000;
export const OPEN_INSTALL_GUIDE = "sideline:open-install-guide";

/** True only in iPhone/iPad Safari itself, not the installed app or other browsers. */
function isIosSafariTab() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Chrome, Firefox, Edge, Google app, and in-app browsers (Instagram, Snapchat, TikTok...).
  const notSafari = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\/|FBAN|FBAV|Instagram|Snapchat|musical_ly|TikTok|Line\//i.test(ua);
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  const forced = new URLSearchParams(location.search).get("install-guide") === "preview";
  return forced || (iOS && !notSafari && !installed);
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};

export function useCanInstall() {
  return useSyncExternalStore(noSubscribe, isIosSafariTab, () => false);
}

export function InstallGuide() {
  const canInstall = useCanInstall();
  const wasSnoozed = useSyncExternalStore(noSubscribe, snoozed, () => true);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_INSTALL_GUIDE, onOpen);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, onOpen);
  }, []);

  function snooze() {
    setBannerClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: it just shows again next time
    }
  }

  if (!canInstall) return null;
  const showBanner = !wasSnoozed && !bannerClosed && !open;

  return (
    <>
      {showBanner && (
        <div
          className="fixed inset-x-3 z-[60] animate-fade-up"
          style={{ bottom: "calc(12px + env(safe-area-inset-bottom))", animationDelay: "1.2s" }}
          role="dialog"
          aria-label="Add Sideline to your home screen"
        >
          <div className="mx-auto max-w-md card !bg-surface-2 shadow-2xl shadow-black/60 p-3 flex items-center gap-3">
            <Logo size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Get the app</div>
              <div className="text-xs text-muted">Put Sideline on your home screen.</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
              Show me
            </button>
            <button className="btn btn-ghost btn-sm !px-2" onClick={snooze} aria-label="Not now">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {open &&
        createPortal(
          <GuideSheet
            onClose={() => {
              setOpen(false);
              snooze();
            }}
          />,
          document.body,
        )}
    </>
  );
}

function Step({ n, title, children, visual }: { n: number; title: string; children?: React.ReactNode; visual: React.ReactNode }) {
  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 rounded-full bg-brand text-bg display text-xl inline-flex items-center justify-center">{n}</span>
        <div className="min-w-0 pt-1">
          <h3 className="font-bold text-lg leading-tight">{title}</h3>
          {children && <p className="text-sm text-muted mt-1">{children}</p>}
        </div>
      </div>
      <div className="mt-4">{visual}</div>
    </li>
  );
}

/** Blue iOS-style highlight ring so people know exactly what to tap. */
const tapRing = "ring-2 ring-[#0a84ff] ring-offset-2 ring-offset-[#1c1c1e] animate-pulse";

function GuideSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-bg/95 backdrop-blur-sm overflow-y-auto animate-fade-up" role="dialog" aria-modal="true" aria-label="How to add Sideline to your home screen">
      <div className="mx-auto max-w-md px-4 pt-safe pb-safe">
        <div className="flex justify-end">
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="text-center -mt-2">
          <div className="inline-block">
            <Logo size={64} />
          </div>
          <h2 className="display text-4xl mt-4">Put Sideline on your home screen</h2>
          <p className="text-muted mt-2">3 quick taps. Then it opens like a real app.</p>
        </div>

        <ol className="mt-7 space-y-3">
          <Step
            n={1}
            title="Tap the Share button"
            visual={
              <div className="rounded-2xl bg-[#1c1c1e] px-5 py-3 flex items-center justify-around text-[#0a84ff]">
                <span className="opacity-40 text-2xl">‹</span>
                <span className="opacity-40 text-2xl">›</span>
                <span className={`rounded-lg p-1.5 ${tapRing}`}>
                  <Share size={26} />
                </span>
                <span className="opacity-40 text-xl">⧉</span>
              </div>
            }
          >
            It&apos;s the square with an arrow pointing up, at the bottom of Safari.
            <span className="block mt-2 text-text">
              Don&apos;t see it? Tap <Ellipsis size={16} className="inline -mt-0.5 mx-0.5" /> first, then tap <b>Share</b>.
            </span>
          </Step>

          <Step
            n={2}
            title="Tap “Add to Home Screen”"
            visual={
              <div className="rounded-2xl bg-[#1c1c1e] overflow-hidden text-sm">
                <div className="px-4 py-3 border-b border-white/10 text-white/40">Add to Favorites</div>
                <div className={`px-4 py-3 flex items-center justify-between text-white rounded-xl m-1 ${tapRing}`}>
                  Add to Home Screen <SquarePlus size={20} />
                </div>
                <div className="px-4 py-3 text-white/40">Find on Page</div>
              </div>
            }
          >
            Scroll down the list if you don&apos;t see it right away.
          </Step>

          <Step
            n={3}
            title="Tap “Add”"
            visual={
              <div className="rounded-2xl bg-[#1c1c1e] px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-[#0a84ff]/50">Cancel</span>
                <span className="font-semibold text-white">Add to Home Screen</span>
                <span className={`text-[#0a84ff] font-semibold rounded-md px-1.5 ${tapRing}`}>Add</span>
              </div>
            }
          >
            Top right corner. If you see <b className="text-text">Open as Web App</b>, leave it turned on.
          </Step>
        </ol>

        <div className="card p-4 mt-3 text-center">
          <p className="font-bold text-lg">Now open Sideline from your home screen 🏈</p>
          <p className="text-sm text-muted mt-1">Look for this icon. You&apos;ll sign in one more time inside the app.</p>
          <div className="mt-3 inline-flex flex-col items-center gap-1">
            <span className="rounded-[14px] overflow-hidden">
              <Logo size={56} />
            </span>
            <span className="text-xs">Sideline</span>
          </div>
        </div>

        <button className="btn btn-primary w-full mt-6 !py-3.5 text-base" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
