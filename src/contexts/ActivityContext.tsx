"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { navigateSession } from "@/lib/session-navigation";
import { STALE_AFTER_MIN, SYNC_INTERVAL_MIN, type ActivityResponse } from "@/lib/activity";

type ActivityState = {
  data: ActivityResponse | null;
  /** When this tab last read the activity endpoint successfully (ms). */
  fetchedAt: number | null;
  /** The activity read itself failed (not a failed Instantly sync, which is part of `data.sync`). */
  error: string;
  syncing: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
};
const Context = createContext<ActivityState | null>(null);

/**
 * Lead activity from Instantly (sent, opens, replies, bounces), the "needs action" queue, attribution and sync health.
 * The server syncs Instantly every 15 minutes; an open tab also asks for a sync when the last good one is older than
 * that, so a missed cron run is visible and self-heals while someone is looking.
 */
export function ActivityProvider({ children, initial = null }: { children: ReactNode; initial?: ActivityResponse | null }) {
  const [data, setData] = useState<ActivityResponse | null>(initial);
  const [fetchedAt, setFetchedAt] = useState<number | null>(initial ? Date.parse(initial.generatedAt) : null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const lastNudge = useRef(0);

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    const read = async (nudge: boolean): Promise<void> => {
      const response = await fetch("/api/activity", { cache: "no-store", signal: controller.current?.signal });
      if (response.status === 401) { navigateSession("/login"); return; }
      if (!response.ok) throw new Error("Activity could not be loaded.");
      const next = await response.json() as ActivityResponse;
      setData(next); setFetchedAt(Date.now()); setError("");
      const okAt = next.sync.lastOkAt ? Date.parse(next.sync.lastOkAt) : 0;
      // Behind schedule: ask the server to sync (it ignores the request if a good run is under 14 minutes old).
      const attemptedAt = next.sync.lastAttemptAt ? Date.parse(next.sync.lastAttemptAt) : 0;
      if (nudge && Date.now() - okAt > SYNC_INTERVAL_MIN * 60_000 && Date.now() - attemptedAt > SYNC_INTERVAL_MIN * 60_000 && Date.now() - lastNudge.current > 5 * 60_000) {
        lastNudge.current = Date.now();
        const sync = await fetch("/api/sync", { method: "POST", signal: controller.current?.signal });
        const outcome = await sync.json();
        if (!sync.ok || typeof outcome.ok !== "boolean") throw new Error("The latest sync could not finish. Previous data may be out of date.");
        await read(false);
      }
    };
    inflight.current = (async () => {
      try { await read(true); }
      catch (e) { if (!controller.current?.signal.aborted) setError((e as Error).message || "Activity could not be loaded."); }
      finally { inflight.current = null; }
    })();
    return inflight.current;
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync?manual=1", { method: "POST", signal: controller.current?.signal });
      const outcome = await response.json();
      if (!response.ok || typeof outcome.ok !== "boolean") throw new Error("The latest sync could not finish. Previous data may be out of date.");
      await refresh();
    }
    catch (e) { if (!controller.current?.signal.aborted) setError(e instanceof Error ? e.message : "Sync could not finish."); }
    finally { setSyncing(false); }
  }, [refresh]);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const cancel = () => abort.abort();
    window.addEventListener("pagehide", cancel);
    window.addEventListener("beforeunload", cancel);
    const initialRead = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    const age = setInterval(() => setClock(Date.now()),15000);
    const offline = () => setError("You are offline. The action queue may be out of date.");
    window.addEventListener("offline",offline);
    window.addEventListener("online",refresh);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { abort.abort(); clearTimeout(initialRead); clearInterval(timer); clearInterval(age); document.removeEventListener("visibilitychange", visible); window.removeEventListener("offline",offline); window.removeEventListener("online",refresh); window.removeEventListener("pagehide", cancel); window.removeEventListener("beforeunload", cancel); };
  }, [refresh]);

  const visibleData = useMemo(() => {
    if (!data) return null;
    const sync = {...data.sync};
    if (error) { sync.state="failing"; sync.lastError=error; }
    else if((sync.state==="ok" || sync.state==="waiting") && (!sync.lastOkAt || clock-Date.parse(sync.lastOkAt)>STALE_AFTER_MIN*60000)) sync.state="stale";
    return {...data,sync};
  },[data,error,clock]);
  const value = useMemo<ActivityState>(() => ({ data:visibleData, fetchedAt, error, syncing, refresh, syncNow }), [visibleData, fetchedAt, error, syncing, refresh, syncNow]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useActivity() {
  const context = useContext(Context);
  if (!context) throw new Error("ActivityProvider is required");
  return context;
}
