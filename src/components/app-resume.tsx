"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Home-screen apps have no pull-to-refresh and iOS keeps them paused in the
 * background, so pull fresh data whenever the app comes back after a while.
 */
export function AppResume() {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 20_000) router.refresh();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [router]);
  return null;
}
