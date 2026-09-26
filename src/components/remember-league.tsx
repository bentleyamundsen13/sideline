"use client";

import { useEffect } from "react";
import { LAST_LEAGUE_COOKIE } from "@/lib/constants";

/** Remembers the league you're in so the home-screen app reopens straight into it. */
export function RememberLeague({ leagueId }: { leagueId: string }) {
  useEffect(() => {
    document.cookie = `${LAST_LEAGUE_COOKIE}=${leagueId}; path=/; max-age=31536000; samesite=lax`;
  }, [leagueId]);
  return null;
}
