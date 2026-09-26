"use client";

import { useEffect } from "react";

/**
 * iOS home-screen apps have two keyboard bugs that leave bottom-pinned bars
 * (the tab bar) floating with a dead band underneath once the keyboard closes:
 *
 *  1. On a scrolled page, iOS leaves the page shifted (visualViewport.offsetTop
 *     doesn't reset). Jumping to the top and straight back makes it re-anchor.
 *  2. On some versions the page shrinks and never grows back. Briefly hiding and
 *     re-showing the page makes iOS re-measure the screen.
 *     https://dev.to/cederhook/fixing-the-ios-standalone-pwa-keyboard-bug-that-shrinks-your-viewport-for-good-63d
 *
 * Runs after any text box loses focus, app-wide.
 */
export function ViewportHeal() {
  useEffect(() => {
    let tallest = window.innerHeight;
    const onResize = () => {
      tallest = Math.max(tallest, window.innerHeight);
    };

    const heal = () => {
      // Moved from one field to the next: the keyboard is still up.
      if (isTextField(document.activeElement)) return;
      const x = window.scrollX;
      const y = window.scrollY;
      if (tallest - window.innerHeight > 4) {
        const body = document.body;
        body.style.display = "none";
        void body.offsetHeight; // force a re-layout at the real screen size
        body.style.display = "";
      }
      // A 1px nudge does nothing at the bottom of a page, so jump to the top and back.
      window.scrollTo(x, 0);
      window.scrollTo(x, y);
    };

    const timers: number[] = [];
    const onFocusOut = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      // Once right after the keyboard starts closing, once after its animation ends.
      timers.push(window.setTimeout(heal, 150), window.setTimeout(heal, 500));
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("focusout", onFocusOut);
      timers.forEach(clearTimeout);
    };
  }, []);
  return null;
}

function isTextField(el: EventTarget | Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement || el.isContentEditable) return true;
  return el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "range", "color", "file"].includes(el.type);
}
