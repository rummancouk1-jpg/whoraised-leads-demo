"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let lastTrigger: HTMLElement | null = null;
/** Touch engines can blur the opener before effects mount. Capture it before the click. */
export function trackDialogTriggers() {
  const reveal = (target: HTMLElement) => requestAnimationFrame(() => {
    if (!target.isConnected || target.closest('.gg-topbar,.gg-tabbar,[data-modal-safe]')) return;
    const rect = target.getBoundingClientRect();
    const modal = target.closest('[role="dialog"]');
    const top = modal ? 0 : document.querySelector('.gg-topbar')?.getBoundingClientRect().bottom ?? 0;
    const bar = document.querySelector('.gg-tabbar')?.getBoundingClientRect();
    const bottom = !modal && bar?.height ? bar.top : innerHeight;
    if (rect.top < top + 8 || rect.bottom > bottom - 8) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });
  const remember = (event: Event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(FOCUSABLE) : null;
    if (target && !target.closest('[role="dialog"]')) lastTrigger = target;
    if (target && event.type === 'focusin') reveal(target);
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
    const previouslyFocused = lastTrigger?.isConnected ? lastTrigger : focused && focused !== document.body && !focused.closest('[role="dialog"]') ? focused : null;

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
