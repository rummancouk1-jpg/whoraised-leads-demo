"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { Lead } from "@/types/outreach";

function useFirstView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.classList.add("r3-seen"); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { node.classList.add("r3-seen"); observer.disconnect(); }
    }, { threshold: .1 });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  return ref;
}

export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase(); }
export function Avatar({ lead, shared = false }: { lead: Lead; shared?: boolean }) {
  const hue = [...lead.tracked_slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  return <span className="av gg-avatar" data-avatar={lead.tracked_slug} aria-hidden style={{ background: `hsl(${hue} 34% 35%)`, viewTransitionName: shared ? "partner-avatar" : undefined }}>{initials(lead.name)}</span>;
}
/** The semantic value is stable; only the decorative number counts up. */
export function Count({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) { previous.current = value; return; }
    let frame = 0; const start = performance.now(), from = previous.current;
    previous.current = value;
    const tick = (now: number) => { const p = Math.min(1, (now - start) / 600); node.textContent = Math.round(from + (value - from) * (1 - (1 - p) ** 3)).toLocaleString(); if (p < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    const card = node.closest(".card");
    if (from !== value && card) { card.classList.remove("r3-updated"); requestAnimationFrame(() => card.classList.add("r3-updated")); }
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="num"><span className="gg-sr-only">{value.toLocaleString()}</span><span ref={ref} aria-hidden>{value.toLocaleString()}</span></span>;
}
export function Ring({ value, label, small = false, display }: { value: number | null; label: string; small?: boolean; display?: number }) {
  const ref = useFirstView<HTMLDivElement>();
  const progress = Math.max(0, Math.min(100, value ?? 0));
  return <div ref={ref} className={`r3-ring ${small ? "sm" : ""}`} role="img" aria-label={label}>
    <span className="r3-ring-track" /><span className="r3-ring-fill" style={{ "--progress": progress / 100 } as CSSProperties}><span /></span><b className="num">{display ?? value ?? "—"}</b>
  </div>;
}
export function ScoreBar({ score }: { score: number }) { const ref = useFirstView<HTMLSpanElement>(); return <span ref={ref} className="score num"><span className="bar"><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, score)) / 100})` }} /></span>{score}</span>; }
