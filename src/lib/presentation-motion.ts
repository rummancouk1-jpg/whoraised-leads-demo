import { flushSync } from "react-dom";

/** Snapshot positions before React moves cards between their stage parents. */
export function flipCards() {
  if (typeof document === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const before = new Map([...document.querySelectorAll<HTMLElement>("[data-lead]")].map(node => [node.dataset.lead, node.getBoundingClientRect()]));
  requestAnimationFrame(() => document.querySelectorAll<HTMLElement>("[data-lead]").forEach(node => {
    const old = before.get(node.dataset.lead); if (!old) return;
    const next = node.getBoundingClientRect(), x = old.left - next.left, y = old.top - next.top;
    if (x || y) node.animate([{ transform: `translate(${x}px, ${y}px)`, opacity: .65 }, { transform: "translate(0, 0)", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
  }));
}
export function transitionPartner(slug: string, change: () => void) {
  if (typeof document === "undefined" || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) { change(); return; }
  const card = document.querySelector(".gg-drawer") ? null : [...document.querySelectorAll<HTMLElement>("[data-lead]")].find(node => node.dataset.lead === slug);
  const avatar = card?.querySelector<HTMLElement>("[data-avatar]"), name = card?.querySelector<HTMLElement>("[data-partner-name]");
  if (avatar) avatar.style.viewTransitionName = "partner-avatar";
  if (name) name.style.viewTransitionName = "partner-name";
  const transition = document.startViewTransition(() => {
    if (avatar) avatar.style.viewTransitionName = "";
    if (name) name.style.viewTransitionName = "";
    flushSync(change);
  });
  void transition.finished.catch(() => {}).finally(() => { if (avatar) avatar.style.viewTransitionName = ""; if (name) name.style.viewTransitionName = ""; });
}
