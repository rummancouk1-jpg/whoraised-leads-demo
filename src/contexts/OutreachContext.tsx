"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_WEIGHTS, exportCsv, suggestedWeights } from "@/lib/outreach";
import type { Lead, Stage } from "@/types/outreach";
import { navigateSession } from "@/lib/session-navigation";
import { summarizeLeads, type LeadSummary } from "@/lib/summary";
import { useToast } from "./ToastContext";
type Patch = Partial<Pick<Lead, "stage" | "notes" | "signups" | "last_touch">> & { expectedStage?: Stage };
type Undo = { slug: string; name: string; from: Stage; to: Stage };
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (response.status === 401) { navigateSession("/login"); throw new Error("Session expired. Please log in."); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Shared workspace could not be loaded.");
  return result;
}
function useWorkspace(initialSummary: LeadSummary | null, initialLeads: Lead[] | null) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(initialLeads ?? []);
  const [clicks, setClicks] = useState<{ leads: { slug: string; clicks: number }[]; groups: { group: string; clicks: number }[]; dailyBySlug: { slug: string; day: string; clicks: number }[]; daily: { day: string; clicks: number }[]; tests: { slug: string; clicks: number }[] } | null>(null);
  const [loading, setLoading] = useState(initialLeads === null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading shared workspace…");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [clicksAt, setClicksAt] = useState<number | null>(null);
  const [useSuggested, setUseSuggested] = useState(false);
  const pending = useRef<Record<string, Patch>>({});
  const saving = useRef(false);
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requests = useRef<AbortController | null>(null);
  const leadsRef = useRef<Lead[]>(initialLeads ?? []);
  const versions = useRef(new Map((initialLeads ?? []).map(l => [l.tracked_slug, l.version])));
  const undoStack = useRef<Undo[]>([]);
  const retry = useRef<() => void>(() => {});
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  const refresh = useCallback(async () => {
    const requestedRevision = revision.current;
    try {
      const result = await request("/api/leads", { signal: requests.current?.signal });
      setClicksAt(Date.now());
      setClicks(old => JSON.stringify(old) === JSON.stringify(result.clicks) ? old : result.clicks);
      if (requestedRevision === revision.current && !saving.current && !Object.keys(pending.current).length) { versions.current = new Map((result.leads as Lead[]).map(l => [l.tracked_slug, l.version])); setLeads(old => JSON.stringify(old) === JSON.stringify(result.leads) ? old : result.leads); setError(""); setSaveStatus("All edits saved to the shared workspace."); setSavedAt(Date.now()); }
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
        try { const result = await request(`/api/leads/${encodeURIComponent(slug)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...patch, expectedVersion: versions.current.get(slug) }) }); versions.current.set(slug, result.lead.version); setLeads(old => old.map(l => l.tracked_slug === slug ? { ...l, version: result.lead.version } : l)); revision.current++; }
        catch(e) { pending.current[slug] = { ...patch, ...pending.current[slug] }; throw e; }
      }
      setError(""); setSaveStatus("All edits saved to the shared workspace."); setSavedAt(Date.now());
    } catch(e) {
      setError((e as Error).message); setSaveStatus("Unsaved edits. Keep this tab open and retry saving.");
      toast({ message: "Couldn't save your last change. It is still on screen.", actionLabel: "Retry", onAction: () => retry.current(), tone: "error", duration: 12000 });
    }
    finally { saving.current = false; }
  }, [toast]);
  useEffect(() => { retry.current = () => void flush(); }, [flush]);
  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    const cancelReads = () => controller.abort();
    window.addEventListener("pagehide", cancelReads);
    const initial = setTimeout(() => void refresh(), 0);
    // Quiet tabs do not poll; coming back to the tab refreshes immediately.
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 3000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (saving.current || Object.keys(pending.current).length) e.preventDefault(); else cancelReads(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(interval); if (timer.current) clearTimeout(timer.current); document.removeEventListener("visibilitychange", visible); window.removeEventListener("pagehide", cancelReads); window.removeEventListener("beforeunload", beforeUnload); };
  }, [refresh]);
  const suggestion = useMemo(() => suggestedWeights(leads), [leads]);
  // Counts come with the first HTML; once the full list has loaded they are recomputed from it (same function).
  const summary = useMemo(() => (!loading || leads.length) && !(error && !leads.length) ? summarizeLeads(leads) : initialSummary, [leads, loading, error, initialSummary]);
  /** Optimistic: the screen changes at once and the save follows 400 ms later. */
  const update = useCallback((slug: string, patch: Patch) => {
    revision.current++;
    pending.current[slug] = { ...pending.current[slug], ...patch };
    setLeads(old => old.map(l => l.tracked_slug === slug ? { ...l, ...patch } : l));
    setSaveStatus("Saving edits…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 400);
  }, [flush]);
  const undoMove = useCallback((entry: Undo) => {
    const current = leadsRef.current.find(l => l.tracked_slug === entry.slug);
    if (!current || current.stage !== entry.to) { toast({ message: "This lead has changed since that move. Refresh it before undoing.", tone: "error" }); return; }
    undoStack.current = undoStack.current.filter(e => e !== entry);
    update(entry.slug, { stage: entry.from, expectedStage: entry.to });
    toast({ message: `Restoring ${entry.name} to ${entry.from}…`, duration: 4000 });
  }, [update, toast]);
  /** A stage change with an undo toast. Used by the board, the drawer and the card stage menu. */
  const moveStage = useCallback((slug: string, stage: Stage) => {
    const lead = leadsRef.current.find(l => l.tracked_slug === slug);
    if (!lead || lead.stage === stage) return;
    const entry: Undo = { slug, name: lead.name, from: lead.stage, to: stage };
    undoStack.current = [...undoStack.current.slice(-9), entry];
    update(slug, { stage });
    toast({ message: `Moved ${lead.name} to ${stage}`, actionLabel: "Undo", onAction: () => undoMove(entry) });
  }, [update, toast, undoMove]);
  const undoLast = useCallback(() => {
    const entry = undoStack.current.at(-1);
    if (!entry) { toast({ message: "Nothing to undo", duration: 2500 }); return; }
    undoMove(entry);
  }, [undoMove, toast]);
  return {
    leads, clicks, clicksAt, loading, error, summary, saveStatus, savedAt, retrySave: flush, refresh, suggestion, useSuggested, setUseSuggested,
    weights: useSuggested && suggestion ? suggestion.weights : DEFAULT_WEIGHTS,
    update, moveStage, undoLast,
    importLeads: async (incoming: Lead[], replace: boolean, oneTime = false) => {
      if (saving.current || Object.keys(pending.current).length) throw new Error("Wait for edits to save before importing.");
      const result = await request("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: exportCsv(incoming), replace, oneTime }) });
      revision.current++;
      versions.current = new Map((result.leads as Lead[]).map(l => [l.tracked_slug, l.version]));
      setLeads(result.leads); setError("");
    },
  };
}
type Workspace = ReturnType<typeof useWorkspace>;
const Context = createContext<Workspace | null>(null);
export function OutreachProvider({ children, initialSummary = null, initialLeads = null }: { children: ReactNode; initialSummary?: LeadSummary | null; initialLeads?: Lead[] | null }) {
  const workspace = useWorkspace(initialSummary, initialLeads);
  return <Context.Provider value={workspace}>{children}</Context.Provider>;
}
export function useOutreach() {
  const context = useContext(Context);
  if (!context) throw new Error("OutreachProvider is required");
  return context;
}
