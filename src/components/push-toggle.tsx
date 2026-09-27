"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { getPushState, turnOffPush, turnOnPush, type PushState } from "@/lib/push-client";
import { errorMessage } from "@/lib/format";
import { OPEN_INSTALL_GUIDE } from "./install-guide";

/**
 * Notifications status on the You tab: on/off, blocked, or "add to home screen
 * first". The first tap in the app already asks (see AutoPushPrompt); this is
 * for turning them off, or trying again after declining.
 */
export function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (!state || state === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      setState(state === "on" ? await turnOffPush() : await turnOnPush());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    on: { icon: BellRing, title: "Notifications are on", sub: "Trades, drafts, chat and game reminders.", action: "Turn off" },
    off: { icon: Bell, title: "Turn on notifications", sub: "Get a ping for trades, drafts, chat and games.", action: "Turn on" },
    blocked: { icon: BellOff, title: "Notifications are blocked", sub: "Turn them on in Settings > Notifications > Sideline.", action: null },
    "install-first": { icon: Bell, title: "Want notifications?", sub: "Add Sideline to your home screen first. iPhones only allow them there.", action: "Show me" },
  }[state];
  const Icon = copy.icon;
  const highlight = state === "off" || state === "install-first";

  return (
    <div className={`card p-3.5 flex items-center gap-3 ${highlight ? "!border-brand/50 bg-brand/5" : ""}`}>
      <span className={`w-9 h-9 shrink-0 rounded-xl inline-flex items-center justify-center ${highlight ? "bg-brand text-bg" : "bg-surface-2 text-muted"}`}>
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{copy.title}</div>
        <div className="text-xs text-muted">{error ?? copy.sub}</div>
      </div>
      {copy.action && (
        <button
          className={`btn btn-sm ${highlight ? "btn-primary" : "btn-ghost"}`}
          disabled={busy}
          onClick={() => (state === "install-first" ? window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE)) : toggle())}
        >
          {busy ? "…" : copy.action}
        </button>
      )}
    </div>
  );
}
