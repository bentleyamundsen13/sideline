"use client";

import { useEffect, useState } from "react";
import { Logo } from "./ui";

const MIN_VISIBLE_MS = 900;
const FADE_MS = 350;

/**
 * Launch screen for the installed app. Server-rendered so it's on screen from
 * the very first frame, then fades out once the app is ready. Hidden in Safari
 * (see .splash in globals.css) so website visits don't flash it on every load.
 */
export function Splash() {
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    // Keep it up long enough to register, counting from when the page started loading.
    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const leave = setTimeout(() => setPhase("leaving"), wait);
    const gone = setTimeout(() => setPhase("gone"), wait + FADE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={`splash ${phase === "leaving" ? "splash-out" : ""}`} aria-hidden="true">
      <div className="splash-logo rounded-[22%] overflow-hidden shadow-[0_0_60px_-10px_var(--brand)]">
        <Logo size={96} />
      </div>
      <div className="splash-word display text-6xl tracking-wide mt-6">Sideline</div>
      <div className="splash-bar mt-8" />
    </div>
  );
}
