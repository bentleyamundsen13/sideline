"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function LeagueCodeCard({ code, leagueName }: { code: string; leagueName: string }) {
  const [copied, setCopied] = useState(false);

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  async function share() {
    const text = `Join ${leagueName} on Sideline with code ${code}`;
    const url = `${window.location.origin}/join`;
    if (navigator.share) {
      try {
        await navigator.share({ title: leagueName, text, url });
      } catch {
        // share sheet dismissed
      }
    } else {
      await navigator.clipboard.writeText(`${text}: ${url}`);
      flash();
    }
  }

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">League code</div>
        <div className="display text-3xl tracking-[0.2em] mt-1">{code}</div>
      </div>
      <button
        className="btn btn-secondary btn-sm"
        aria-label="Copy code"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          flash();
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button className="btn btn-primary btn-sm" onClick={share}>
        <Share2 size={15} /> Invite
      </button>
    </div>
  );
}
