"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_WEIGHTS, exportCsv, suggestedWeights } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";
import { navigateSession } from "@/lib/session-navigation";
type Patch = Partial<Pick<Lead, "stage" | "notes" | "signups" | "last_touch">>;
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (response.status === 401) { navigateSession("/login"); throw new Error("Session expired. Please log in."); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Shared workspace could not be loaded.");
  return result;
}
function useWorkspace() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clicks, setClicks] = useState<{ leads: { slug: string; clicks: number }[]; groups: { group: string; clicks: number }[]; dailyBySlug: { slug: string; day: string; clicks: number }[]; daily: { day: string; clicks: number }[]; tests: { slug: string; clicks: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading shared workspace…");
  const [useSuggested, setUseSuggested] = useState(false);
  const pending = useRef<Record<string, Patch>>({});
  const saving = useRef(false);
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requests = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const requestedRevision = revision.current;
    try {
      const result = await request("/api/leads", { signal: requests.current?.signal });
      setClicks(old => JSON.stringify(old) === JSON.stringify(result.clicks) ? old : result.clicks);
      if (requestedRevision === revision.current && !saving.current && !Object.keys(pending.current).length) { setLeads(old => JSON.stringify(old) === JSON.stringify(result.leads) ? old : result.leads); setError(""); setSaveStatus("All edits saved to the shared workspace."); }
    } catch(e) { if (!requests.current?.signal.aborted) setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  const flush = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      while (Object.keys(pending.current).length) {
        const slug = Object.keys(pending.current)[0];
        const patch = pending.current[slug];
        delete pending.current[slug];
        try { await request(`/api/leads/${encodeURIComponent(slug)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); }
        catch(e) { pending.current[slug] = { ...patch, ...pending.current[slug] }; throw e; }
      }
      setError(""); setSaveStatus("All edits saved to the shared workspace.");
    } catch(e) { setError((e as Error).message); setSaveStatus("Unsaved edits. Keep this tab open and retry saving."); }
    finally { saving.current = false; }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    const cancelReads = () => controller.abort();
    window.addEventListener("pagehide", cancelReads);
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 3000);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (saving.current || Object.keys(pending.current).length) e.preventDefault(); else cancelReads(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(interval); if (timer.current) clearTimeout(timer.current); window.removeEventListener("pagehide", cancelReads); window.removeEventListener("beforeunload", beforeUnload); };
  }, [refresh]);
  const suggestion = useMemo(() => suggestedWeights(leads), [leads]);
  return {
    leads, clicks, loading, error, saveStatus, retrySave: flush, refresh, suggestion, useSuggested, setUseSuggested,
    weights: useSuggested && suggestion ? suggestion.weights : DEFAULT_WEIGHTS,
    update: (slug: string, patch: Patch) => {
      revision.current++;
      pending.current[slug] = { ...pending.current[slug], ...patch };
      setLeads(old => old.map(l => l.tracked_slug === slug ? { ...l, ...patch } : l));
      setSaveStatus("Saving edits…");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 400);
    },
    importLeads: async (incoming: Lead[], replace: boolean, oneTime = false) => {
      if (saving.current || Object.keys(pending.current).length) throw new Error("Wait for edits to save before importing.");
      const result = await request("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: exportCsv(incoming), replace, oneTime }) });
      revision.current++;
      setLeads(result.leads); setError("");
    },
  };
}
type Workspace = ReturnType<typeof useWorkspace>;
const Context = createContext<Workspace | null>(null);
export function OutreachProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return <Context.Provider value={workspace}>{children}</Context.Provider>;
}
export function useOutreach() {
  const context = useContext(Context);
  if (!context) throw new Error("OutreachProvider is required");
  return context;
}
