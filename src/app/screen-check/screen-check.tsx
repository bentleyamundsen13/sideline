"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Reading = Record<string, string | number | boolean>;

/** Live screen measurements, to diagnose where iOS thinks the bottom of the screen is. */
export function ScreenCheck() {
  const [now, setNow] = useState<Reading | null>(null);
  const [first, setFirst] = useState<Reading | null>(null);
  const [copied, setCopied] = useState(false);
  const probes = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = (): Reading => {
      const p = probes.current!;
      const h = (sel: string) => Math.round((p.querySelector(sel) as HTMLElement).getBoundingClientRect().height);
      const pad = getComputedStyle(p.querySelector(".safe") as HTMLElement);
      const vv = window.visualViewport;
      return {
        "screen.height": screen.height,
        innerHeight: window.innerHeight,
        "vv.height": vv ? Math.round(vv.height) : "n/a",
        "vv.offsetTop": vv ? Math.round(vv.offsetTop) : "n/a",
        "100dvh": h(".dvh"),
        "100lvh": h(".lvh"),
        "100svh": h(".svh"),
        "safe top": pad.paddingTop,
        "safe bottom": pad.paddingBottom,
        "missing (screen − inner)": screen.height - window.innerHeight,
        "nav.standalone": (navigator as Navigator & { standalone?: boolean }).standalone ?? "n/a",
        "display-mode standalone": matchMedia("(display-mode: standalone)").matches,
        dpr: window.devicePixelRatio,
        ios: navigator.userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace("_", ".") ?? "n/a",
      };
    };
    const update = () => setNow(read());
    const raf = requestAnimationFrame(() => {
      const initial = read();
      setFirst(initial);
      setNow(initial);
    });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    const t = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      clearInterval(t);
    };
  }, []);

  const text = now ? Object.entries(now).map(([k, v]) => `${k}: ${v}${first && first[k] !== v ? ` (was ${first[k]})` : ""}`).join("\n") : "";

  return (
    <main className="mx-auto max-w-md px-4 pt-safe pb-40">
      <Link href="/" className="text-sm text-muted">
        ‹ Back
      </Link>
      <h1 className="display text-3xl mt-3">Screen check</h1>
      <ol className="text-sm text-muted mt-2 list-decimal pl-5 space-y-1">
        <li>Open this inside the home-screen app.</li>
        <li>Screenshot it.</li>
        <li>Tap the box below, then close the keyboard.</li>
        <li>Screenshot it again.</li>
      </ol>

      <input className="input mt-4" placeholder="Tap here to open the keyboard" aria-label="Test keyboard" />

      <pre className="card p-3 mt-4 text-xs leading-relaxed whitespace-pre-wrap tabular">{text}</pre>
      <button
        className="btn btn-secondary btn-sm mt-2"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy numbers"}
      </button>

      {/* Hidden probes that measure CSS viewport units and safe-area insets. */}
      <div ref={probes} aria-hidden="true" className="fixed left-0 top-0 w-0 invisible pointer-events-none">
        <div className="dvh" style={{ height: "100dvh" }} />
        <div className="lvh" style={{ height: "100lvh" }} />
        <div className="svh" style={{ height: "100svh" }} />
        <div className="safe" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }} />
      </div>

      {/* Where iOS thinks the bottom of the screen is. */}
      <div className="fixed inset-x-0 bottom-0 h-1.5 bg-danger z-50" />
      <div className="fixed right-2 bottom-3 z-50 text-[10px] font-bold text-danger">← iOS&apos;s &quot;bottom&quot;</div>
    </main>
  );
}
