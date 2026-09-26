"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Temporary: on-device layout measurements, switched on from /screen-check.
export const DEBUG_OVERLAY_KEY = "sideline-debug-overlay";
export const DEBUG_OVERLAY_EVENT = "sideline:debug-overlay";

function readEnabled() {
  try {
    return localStorage.getItem(DEBUG_OVERLAY_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(DEBUG_OVERLAY_EVENT, cb);
  return () => window.removeEventListener(DEBUG_OVERLAY_EVENT, cb);
}

export function useDebugOverlay() {
  return useSyncExternalStore(subscribe, readEnabled, () => false);
}

export function setDebugOverlay(on: boolean) {
  try {
    localStorage.setItem(DEBUG_OVERLAY_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(DEBUG_OVERLAY_EVENT));
}

export function DebugOverlay() {
  const enabled = useDebugOverlay();
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);

    const rect = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el || getComputedStyle(el).display === "none") return "hidden";
      const r = el.getBoundingClientRect();
      return `top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} h ${Math.round(r.height)}`;
    };
    const read = () => {
      const vv = window.visualViewport;
      const cs = getComputedStyle(probe);
      setLines([
        `screen ${screen.height} · inner ${innerHeight} · outer ${outerHeight}`,
        `vv h ${vv ? Math.round(vv.height) : "-"} top ${vv ? Math.round(vv.offsetTop) : "-"} · scrollY ${Math.round(scrollY)}`,
        `doc h ${document.documentElement.scrollHeight} · body h ${Math.round(document.body.getBoundingClientRect().height)}`,
        `safe top ${cs.paddingTop} bottom ${cs.paddingBottom}`,
        `nav: ${rect(".bottom-nav")}`,
        `chat box: ${rect(".chat-composer")}`,
        `standalone ${String((navigator as Navigator & { standalone?: boolean }).standalone)} · ${location.pathname.split("/").slice(-1)[0] || "/"}`,
      ]);
    };
    const raf = requestAnimationFrame(read);
    const t = setInterval(read, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
      probe.remove();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div className="fixed left-2 right-2 z-[100] rounded-lg bg-black/85 text-[10px] leading-tight font-mono text-lime-300 p-2 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top) + 60px)" }}>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      {/* Where iOS puts bottom: 0 */}
      <div className="fixed inset-x-0 bottom-0 h-1 bg-fuchsia-500 z-[100] pointer-events-none" />
    </>
  );
}
