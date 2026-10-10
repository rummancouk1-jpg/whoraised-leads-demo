"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let lastTrigger: HTMLElement | null = null;
/** Touch engines can blur the opener before effects mount. Capture it before the click. */
export function trackDialogTriggers() {
  let pointerActive = false;
  const reveal = (target: HTMLElement) => requestAnimationFrame(() => {
    if (!target.isConnected || target.closest('.gg-topbar,.gg-tabbar,[data-modal-safe]')) return;
    const rect = target.getBoundingClientRect();
    const modal = target.closest('[role="dialog"]');
    const top = modal ? 0 : document.querySelector('.gg-topbar')?.getBoundingClientRect().bottom ?? 0;
    const bar = document.querySelector('.gg-tabbar')?.getBoundingClientRect();
    const bottom = !modal && bar?.height ? bar.top : innerHeight;
    // WebKit focuses the scroll region on pointer-down. Centering a tall board
    // here would move the pressed card away before its click is delivered.
    if (rect.height > bottom - top - 16) return;
    if (rect.top < top + 8 || rect.bottom > bottom - 8) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });
  const remember = (event: Event) => {
    if (event.type === "pointerdown") pointerActive = true;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(FOCUSABLE) : null;
    if (target && !target.closest('[role="dialog"]')) lastTrigger = target;
    if (target && event.type === 'focusin' && !pointerActive) reveal(target);
  };
  const release = () => { pointerActive = false; };
  document.addEventListener("pointerdown",remember,true);
  document.addEventListener("click",remember,true);
  document.addEventListener("pointerup",release,true);
  document.addEventListener("pointercancel",release,true);
  document.addEventListener("focusin",remember,true);
  return () => { document.removeEventListener("pointerdown",remember,true); document.removeEventListener("click",remember,true); document.removeEventListener("pointerup",release,true); document.removeEventListener("pointercancel",release,true); document.removeEventListener("focusin",remember,true); lastTrigger=null; };
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
    const leadSlug = previouslyFocused?.closest<HTMLElement>("[data-lead]")?.dataset.lead;

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
      queueMicrotask(() => {
        const replacement = leadSlug ? [...document.querySelectorAll<HTMLElement>("[data-lead]")].find(el => el.dataset.lead === leadSlug)?.querySelector<HTMLElement>(".gg-card-name,.gg-name-button") : null;
        const trigger = previouslyFocused?.isConnected ? previouslyFocused : replacement;
        if (trigger && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true });
      });
    };
  }, [active, containerRef]);
}
