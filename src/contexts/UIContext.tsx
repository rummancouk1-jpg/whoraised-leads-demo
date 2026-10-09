"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastContext";
import { trackDialogTriggers } from "@/hooks/useFocusTrap";

export type Filters = { platform: string; niche: string; stage: string; kind: string; us_focus: string; band: string; minScore: string };
export type ViewState = { search: string; filters: Filters; sort: string; showLongTail: boolean };
export type SavedView = { id: string; name: string; state: ViewState; builtin?: boolean };
export type Theme = "system" | "light" | "dark";
export type DialogKind = "import" | "export" | "shortcuts" | null;

export const INITIAL_FILTERS: Filters = { platform: "", niche: "", stage: "", kind: "", us_focus: "", band: "", minScore: "0" };
export const DEFAULT_VIEW: ViewState = { search: "", filters: INITIAL_FILTERS, sort: "fit", showLongTail: false };
const withFilter = (patch: Partial<Filters>, rest: Partial<ViewState> = {}): ViewState => ({ ...DEFAULT_VIEW, ...rest, filters: { ...INITIAL_FILTERS, ...patch } });
export const BUILTIN_VIEWS: SavedView[] = [
  { id: "priority", name: "Priority", state: DEFAULT_VIEW, builtin: true },
  { id: "everyone", name: "Everyone", state: withFilter({}, { showLongTail: true }), builtin: true },
  { id: "to-contact", name: "To contact", state: withFilter({ stage: "New" }), builtin: true },
  { id: "waiting", name: "Waiting on reply", state: withFilter({ stage: "Contacted" }), builtin: true },
  { id: "replied", name: "Replied", state: withFilter({ stage: "Replied" }), builtin: true },
  { id: "joined", name: "Joined", state: withFilter({ stage: "Joined" }), builtin: true },
];
const VIEWS_KEY = "gg-views-v1", THEME_KEY = "gg-theme", RECENT_KEY = "gg-recent-v1";
export const sameView = (a: ViewState, b: ViewState) => a.search.trim() === b.search.trim() && a.sort === b.sort && a.showLongTail === b.showLongTail && (Object.keys(INITIAL_FILTERS) as (keyof Filters)[]).every(k => a.filters[k] === b.filters[k]);

function read<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode or blocked storage: the setting lasts for this visit only */ } }
function validView(v: unknown): v is SavedView {
  const s = v as SavedView;
  return !!s && typeof s.id === "string" && typeof s.name === "string" && !!s.state && typeof s.state.search === "string" && typeof s.state.sort === "string" && typeof s.state.showLongTail === "boolean" && !!s.state.filters && Object.keys(INITIAL_FILTERS).every(k => typeof (s.state.filters as Record<string, unknown>)[k] === "string");
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
function useUI() {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [palette, setPalette] = useState(false);
  const [view, setViewState] = useState<ViewState>(DEFAULT_VIEW);
  const [custom, setCustom] = useState<SavedView[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [theme, setThemeState] = useState<Theme>("system");
  const [installable, setInstallable] = useState(false);
  const installEvent = useRef<InstallEvent | null>(null);
  // Per-viewer conveniences live in this browser only; they are read after mount so server and client markup match.
  useEffect(() => {
    const t = setTimeout(() => {
      setCustom(read<unknown[]>(VIEWS_KEY, []).filter(validView));
      setRecent(read<string[]>(RECENT_KEY, []).filter(s => typeof s === "string").slice(0, 6));
      const stored = read<string>(THEME_KEY, "system");
      setThemeState(stored === "light" || stored === "dark" ? stored : "system");
    }, 0);
    const prompt = (e: Event) => { e.preventDefault(); installEvent.current = e as InstallEvent; setInstallable(true); };
    const installed = () => { installEvent.current = null; setInstallable(false); };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("appinstalled", installed); };
  }, []);
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme"); else root.dataset.theme = next;
    write(THEME_KEY, next);
    const dark = next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const meta = document.createElement("meta"); meta.name = "theme-color"; meta.content = dark ? "#0a0d12" : "#f6f7f9"; document.head.appendChild(meta);
  }, []);
  const cycleTheme = useCallback(() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system"), [theme, setTheme]);
  const openLead = useCallback((slug: string) => {
    setSelected(slug);
    setRecent(old => { const next = [slug, ...old.filter(s => s !== slug)].slice(0, 6); write(RECENT_KEY, next); return next; });
  }, []);
  const views = useMemo(() => [...BUILTIN_VIEWS, ...custom], [custom]);
  const activeView = useMemo(() => views.find(v => sameView(v.state, view)) ?? null, [views, view]);
  const setView = useCallback((patch: Partial<ViewState>) => setViewState(old => ({ ...old, ...patch })), []);
  const setFilter = useCallback((key: keyof Filters, value: string) => setViewState(old => ({ ...old, filters: { ...old.filters, [key]: value } })), []);
  const resetView = useCallback(() => setViewState(DEFAULT_VIEW), []);
  const applyView = useCallback((id: string) => { const found = views.find(v => v.id === id); if (found) setViewState({ ...found.state, filters: { ...found.state.filters } }); }, [views]);
  const saveView = useCallback((rawName: string) => {
    const name = rawName.trim().slice(0, 40);
    if (!name) return false;
    const saved: SavedView = { id: `v-${Date.now().toString(36)}`, name, state: { ...view, filters: { ...view.filters } } };
    setCustom(old => { const next = [...old.filter(v => v.name.toLowerCase() !== name.toLowerCase()), saved]; write(VIEWS_KEY, next); return next; });
    toast({ message: `Saved view “${name}”`, duration: 4000 });
    return true;
  }, [view, toast]);
  const deleteView = useCallback((id: string) => {
    const removed = custom.find(v => v.id === id);
    if (!removed) return;
    setCustom(old => { const next = old.filter(v => v.id !== id); write(VIEWS_KEY, next); return next; });
    toast({ message: `Deleted view “${removed.name}”`, actionLabel: "Undo", onAction: () => setCustom(old => { const next = [...old, removed]; write(VIEWS_KEY, next); return next; }) });
  }, [custom, toast]);
  const install = useCallback(async () => { const e = installEvent.current; if (!e) return; await e.prompt(); await e.userChoice; installEvent.current = null; setInstallable(false); }, []);
  const go = useCallback((path: "/" | "/pipeline" | "/email") => { setPalette(false); router.push(path); }, [router]);
  return { selected, openLead, closeLead: useCallback(() => setSelected(null), []), dialog, setDialog, palette, setPalette, view, setView, setFilter, resetView, applyView, saveView, deleteView, views, custom, activeView, recent, theme, setTheme, cycleTheme, installable, install, go };
}
type UI = ReturnType<typeof useUI>;
const Context = createContext<UI | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  useEffect(trackDialogTriggers, []);
  const ui = useUI();
  return <Context.Provider value={ui}>{children}</Context.Provider>;
}
export function useUIState() {
  const context = useContext(Context);
  if (!context) throw new Error("UIProvider is required");
  return context;
}
