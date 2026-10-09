"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastOptions = { message: string; actionLabel?: string; onAction?: () => void; tone?: "default" | "error"; duration?: number };
type Toast = ToastOptions & { id: number };
type ToastApi = { toast: (options: ToastOptions) => number; dismiss: (id: number) => void };
const Context = createContext<ToastApi | null>(null);

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const onDismiss = useCallback(() => dismiss(toast.id), [dismiss, toast.id]);
  const remaining = useRef(toast.duration ?? 8000);
  const started = useRef(0);
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(1500, remaining.current - (Date.now() - started.current)); };
  }, [paused, onDismiss]);
  return <div className={`gg-toast ${toast.tone === "error" ? "gg-toast-error" : ""}`} role={toast.tone === "error" ? "alert" : "status"}
    onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <span className="gg-toast-message">{toast.message}</span>
    {toast.actionLabel && <button className="gg-toast-action" onClick={() => { toast.onAction?.(); onDismiss(); }}>{toast.actionLabel}</button>}
    <button className="gg-toast-close" aria-label="Dismiss notification" onClick={onDismiss}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg></button>
  </div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts(old => old.filter(t => t.id !== id)), []);
  const toast = useCallback((options: ToastOptions) => { const id = next.current++; setToasts(old => [...old.slice(-2), { ...options, id }]); return id; }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <Context.Provider value={api}>{children}
    {/* data-modal-safe: stays interactive (Undo) while a drawer or dialog makes the rest of the page inert. */}
    <div className="gg-toasts" data-modal-safe="" aria-label="Notifications" role="region">{toasts.map(t => <ToastItem key={t.id} toast={t} dismiss={dismiss} />)}</div>
  </Context.Provider>;
}
export function useToast() {
  const context = useContext(Context);
  if (!context) throw new Error("ToastProvider is required");
  return context;
}
