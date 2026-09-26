"use client";

import { useEffect } from "react";
import { textOn } from "@/lib/format";

/** Tints the whole screen with a team's color while this page is mounted. */
export function TeamTheme({ color }: { color: string | null }) {
  useEffect(() => {
    const root = document.documentElement;
    if (color) {
      root.style.setProperty("--accent", color);
      root.style.setProperty("--accent-text", textOn(color));
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-text");
    }
    return () => {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-text");
    };
  }, [color]);
  return null;
}
