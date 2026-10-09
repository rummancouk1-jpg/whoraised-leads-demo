"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { exactTime, parseTime, relativeTime, type TimeInput } from "@/lib/time";

const listeners = new Set<() => void>();
let tick = Date.now();
let interval: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval) interval = setInterval(() => { tick = Date.now(); listeners.forEach(l => l()); }, 30000);
  return () => { listeners.delete(listener); if (!listeners.size && interval) { clearInterval(interval); interval = undefined; } };
}
/** A shared 30-second clock so every relative time on screen stays current without one timer each. */
// The server snapshot is 0 so server-rendered markup never bakes in a stale "x minutes ago"; the client replaces it at hydration.
export function useNow() { return useSyncExternalStore(subscribe, () => tick, () => 0); }

/**
 * "4 minutes ago" with the exact time on hover, keyboard focus, tap, or a long press on touch screens.
 * The full time is also in the accessible name, so nothing depends on pointer hover.
 */
export function RelTime({ value, prefix = "", fallback = "—", plain = false }: { value: TimeInput | null | undefined; prefix?: string; fallback?: string; plain?: boolean }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (press.current) clearTimeout(press.current); if (hide.current) clearTimeout(hide.current); }, []);
  const parsed = parseTime(value);
  if (!parsed) return <span>{fallback}</span>;
  // The server and viewer can have different time zones. Hydration must start
  // with the same text; local exact times appear with the shared client clock.
  const exact = now === 0 ? "Exact time loads with the workspace" : exactTime(value);
  const text = now === 0 ? "recently" : relativeTime(value, now);
  // Inside a button or link the time must not be interactive (a tap on it would swallow the click and nest focusable controls).
  if (plain) return <time dateTime={parsed.dateOnly ? String(value) : parsed.date.toISOString()}>{prefix}{text}<span className="gg-sr-only">, {exact}</span></time>;
  const show = (autoHide = false) => { setOpen(true); if (hide.current) clearTimeout(hide.current); if (autoHide) hide.current = setTimeout(() => setOpen(false), 3500); };
  return <time className="gg-reltime" dateTime={parsed.dateOnly ? String(value) : parsed.date.toISOString()} tabIndex={0} data-open={open || undefined}
    onPointerEnter={e => { if (e.pointerType === "mouse") show(); }}
    onPointerLeave={e => { if (e.pointerType === "mouse") setOpen(false); }}
    onPointerDown={e => { if (e.pointerType !== "mouse") press.current = setTimeout(() => show(true), 450); }}
    onPointerUp={() => { if (press.current) clearTimeout(press.current); }}
    onPointerCancel={() => { if (press.current) clearTimeout(press.current); }}
    onClick={e => { e.stopPropagation(); if (open) setOpen(false); else show(true); }}
    onContextMenu={e => e.preventDefault()}
    onFocus={() => show()} onBlur={() => setOpen(false)}
    onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
    <span aria-hidden="true">{prefix}{text}</span><span className="gg-sr-only">{prefix}{text}, {exact}</span>
    <span role="tooltip" className="gg-reltime-tip" hidden={!open} aria-hidden="true">{exact}</span>
  </time>;
}
