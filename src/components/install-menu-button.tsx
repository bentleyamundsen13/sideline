"use client";

import { ChevronRight, Smartphone } from "lucide-react";
import { OPEN_INSTALL_GUIDE, useCanInstall } from "./install-guide";

/** "Add to Home Screen" row, shown only in iPhone/iPad Safari. */
export function InstallMenuButton() {
  const canInstall = useCanInstall();
  if (!canInstall) return null;
  return (
    <button
      className="card w-full flex items-center gap-3 p-3.5 text-left !border-brand/50 bg-brand/5 hover:bg-brand/10 transition-colors"
      onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE))}
    >
      <span className="w-9 h-9 rounded-xl bg-brand text-bg inline-flex items-center justify-center">
        <Smartphone size={18} />
      </span>
      <div className="flex-1">
        <div className="font-semibold text-sm">Add to Home Screen</div>
        <div className="text-xs text-muted">Use Sideline like a real app</div>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}
