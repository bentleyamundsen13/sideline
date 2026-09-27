"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, BellRing, CalendarCheck, MessageCircle } from "lucide-react";
import { getPushState, turnOnPush } from "@/lib/push-client";
import { errorMessage } from "@/lib/format";

const SNOOZE_KEY = "sideline-push-modal-snoozed-at";
const SNOOZE_MS = 3 * 24 * 3600_000;

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Full-screen "turn on notifications" popup for the installed app. Shows until
 * the person answers: Turn on (Apple's prompt appears right away, since it's a
 * direct tap) or Not now (comes back in 3 days). Never shows once they're on,
 * once they've blocked it, or in Safari (the install guide covers that).
 */
export function PushPromptModal() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then((state) => {
      if (state === "off" && !snoozed()) setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      await turnOnPush(); // asks Apple's permission first, inside this tap
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // private mode: it'll just ask again next launch
    }
    setOpen(false);
  }

  const perks = [
    { icon: ArrowLeftRight, text: "Trade offers, drafts and captain news" },
    { icon: MessageCircle, text: "Messages from your team chat" },
    { icon: CalendarCheck, text: "Game reminders and your stats nudge" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
    >
      <div className="w-full max-w-sm card !bg-surface p-6 text-center shadow-2xl shadow-black/60 mb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand text-bg inline-flex items-center justify-center">
          <BellRing size={30} className="animate-[splash-pop_500ms_ease-out]" />
        </div>
        <h2 id="push-modal-title" className="display text-3xl mt-5">
          Turn on notifications
        </h2>
        <p className="text-sm text-muted mt-2">Don&apos;t miss what&apos;s happening in your league.</p>

        <ul className="text-left space-y-3 mt-6">
          {perks.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-surface-2 text-brand inline-flex items-center justify-center">
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-danger mt-4">{error}</p>}
        <button className="btn btn-primary w-full mt-6 !py-3.5 text-base" onClick={turnOn} disabled={busy}>
          {busy ? "One sec…" : "Turn on notifications"}
        </button>
        <p className="text-xs text-muted mt-3">Then tap &ldquo;Allow&rdquo; on the next popup.</p>
        <button className="text-sm text-muted font-semibold mt-4 py-1 hover:text-text" onClick={notNow} disabled={busy}>
          Not now
        </button>
      </div>
    </div>,
    document.body,
  );
}
