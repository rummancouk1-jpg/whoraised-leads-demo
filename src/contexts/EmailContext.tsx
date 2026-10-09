"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EmailMetrics, EmailResponse } from "@/types/email";
import { navigateSession } from "@/lib/session-navigation";

type EmailState = {
  data: EmailResponse | null;
  busy: boolean;
  /** A failed read of /api/email itself (not a provider error carried inside a successful response). */
  error: string;
  refresh: () => Promise<void>;
  /** Live Instantly metrics when available, otherwise the newest saved daily snapshot. */
  snapshot: EmailMetrics | null;
  isLive: boolean;
};
const Context = createContext<EmailState | null>(null);

/** One shared, polite poll of /api/email for the status line, the number tiles and the Email view. */
export function EmailProvider({ children, initialSnapshot = null }: { children: ReactNode; initialSnapshot?: EmailMetrics | null }) {
  const [data, setData] = useState<EmailResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    setBusy(true);
    inflight.current = (async () => {
      try {
        const response = await fetch("/api/email", { cache: "no-store", signal: controller.current?.signal });
        if (response.status === 401) { navigateSession("/login"); return; }
        if (!response.ok) throw new Error("Email view could not be loaded.");
        setData(await response.json()); setError("");
      } catch (e) { if (!controller.current?.signal.aborted) setError((e as Error).message || "Email view could not be loaded."); }
      finally { setBusy(false); inflight.current = null; }
    })();
    return inflight.current;
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const cancelReads = () => abort.abort();
    window.addEventListener("pagehide", cancelReads);
    window.addEventListener("beforeunload", cancelReads);
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { abort.abort(); clearTimeout(initial); clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("pagehide", cancelReads); window.removeEventListener("beforeunload", cancelReads); };
  }, [refresh]);
  const value = useMemo<EmailState>(() => ({ data, busy, error, refresh, snapshot: data?.live ?? data?.history[0]?.metrics ?? initialSnapshot, isLive: !!data?.live }), [data, busy, error, refresh, initialSnapshot]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useEmail() {
  const context = useContext(Context);
  if (!context) throw new Error("EmailProvider is required");
  return context;
}
