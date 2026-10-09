"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let lastTrigger: HTMLElement | null = null;
/** Touch engines can blur the opener before effects mount. Capture it before the click. */
export function trackDialogTriggers() {
  const remember = (event: Event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(FOCUSABLE) : null;
    if (target && !target.closest('[role="dialog"]')) lastTrigger = target;
  };
  document.addEventListener("pointerdown",remember,true);
  document.addEventListener("focusin",remember,true);
  return () => { document.removeEventListener("pointerdown",remember,true); document.removeEventListener("focusin",remember,true); lastTrigger=null; };
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const root = containerRef.current;
    const focused = document.activeElement as HTMLElement | null;
    const previouslyFocused = focused && focused !== document.body && !focused.closest('[role="dialog"]') ? focused : lastTrigger;

    const getFocusable = () =>
      [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );

    const focusables = getFocusable();
    focusables[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusable();
      if (nodes.length === 0) return;

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", handleKeyDown);

    return () => {
      root.removeEventListener("keydown", handleKeyDown);
      // Dialog/palette effects remove background inertness during this same cleanup.
      queueMicrotask(() => { if (previouslyFocused?.isConnected && !previouslyFocused.closest("[inert]")) previouslyFocused.focus({preventScroll:true}); });
    };
  }, [active, containerRef]);
}
