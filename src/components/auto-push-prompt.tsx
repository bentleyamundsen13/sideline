"use client";

import { useEffect } from "react";
import { getPushState, turnOnPush } from "@/lib/push-client";

/**
 * Asks for notifications on the first tap anywhere in the app, so nobody has to
 * hunt for a button. iPhones only show Apple's "Allow notifications?" prompt in
 * response to a tap (never on page load), and only once per install; after
 * someone answers, iOS never shows it again. Mounted inside league pages.
 */
export function AutoPushPrompt() {
  useEffect(() => {
    let cancelled = false;
    let armed: ((e: Event) => void) | null = null;

    getPushState().then((state) => {
      // "off" = supported, not blocked, not yet subscribed on this device.
      if (cancelled || state !== "off") return;
      armed = () => {
        document.removeEventListener("click", armed!, true);
        // Must start inside the tap: turnOnPush asks permission as its first step.
        turnOnPush().catch(() => {
          // Declined or failed; the You tab card still lets them try again.
        });
      };
      document.addEventListener("click", armed, true);
    });

    return () => {
      cancelled = true;
      if (armed) document.removeEventListener("click", armed, true);
    };
  }, []);

  return null;
}
