"use client";

import { useEffect } from "react";

/**
 * iOS home-screen apps have a WebKit bug: the first time the keyboard opens the
 * page shrinks, and it never grows back until the app is force-quit. Anything
 * pinned to the bottom (the tab bar) then floats with a dead band underneath.
 *
 * Known fix: after the keyboard closes, briefly hide and re-show the page so
 * iOS re-measures the screen. Runs after any text box loses focus, app-wide.
 * https://dev.to/cederhook/fixing-the-ios-standalone-pwa-keyboard-bug-that-shrinks-your-viewport-for-good-63d
 */
export function ViewportHeal() {
  useEffect(() => {
    let tallest = window.innerHeight;
    const onResize = () => {
      tallest = Math.max(tallest, window.innerHeight);
    };

    const heal = () => {
      // A text box is still focused (e.g. moved from one field to the next): keyboard is still up.
      if (isTextField(document.activeElement)) return;
      if (tallest - window.innerHeight <= 4) return;
      const y = window.scrollY;
      const body = document.body;
      body.style.display = "none";
      void body.offsetHeight; // force iOS to lay out again with the real screen size
      body.style.display = "";
      window.scrollTo(window.scrollX, y);
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
