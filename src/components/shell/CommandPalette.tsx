"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOutreach } from "@/contexts/OutreachContext";
import { useEmail } from "@/contexts/EmailContext";
import { useUIState } from "@/contexts/UIContext";
import { isExample } from "@/lib/outreach";
import { navigateSession } from "@/lib/session-navigation";
import { ArrowIcon, SearchIcon } from "@/components/ui/Icons";

type Item = { id: string; group: string; label: string; hint?: string; keywords?: string; run: () => void; icon?: ReactNode };

/** Subsequence match with a bonus for prefixes and word starts. Returns 0 for no match. */
function score(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase(), t = text.toLowerCase();
  const index = t.indexOf(q);
  if (index >= 0) return 1000 - index + (index === 0 ? 200 : t[index - 1] === " " ? 100 : 0);
  let i = 0, points = 0;
  for (const char of t) { if (char === q[i]) { points += 1; i++; if (i === q.length) return points; } }
  return 0;
}

export function CommandPalette() {
  const { palette, setPalette } = useUIState();
  return palette ? <PaletteDialog onClose={() => setPalette(false)} /> : null;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const ui = useUIState();
  const { leads, undoLast } = useOutreach();
  const { refresh } = useEmail();
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  useFocusTrap(ref, true);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = [...document.body.children].filter(el => !el.contains(ref.current) && !el.hasAttribute("data-modal-safe"));
    const was = background.map(el => el.hasAttribute("inert"));
    background.forEach(el => el.setAttribute("inert", ""));
    return () => { document.body.style.overflow = previous; background.forEach((el, i) => { if (!was[i]) el.removeAttribute("inert"); }); };
  }, []);

  const real = useMemo(() => leads.filter(l => !isExample(l)), [leads]);
  const close = (run: () => void) => () => { onClose(); setTimeout(run, 0); };
  const commands = useMemo<Item[]>(() => {
    const list: Item[] = [
      { id: "go-home", group: "Go to", label: "Home", hint: "G H", keywords: "dashboard status", run: close(() => ui.go("/")) },
      { id: "go-pipeline", group: "Go to", label: "Pipeline", hint: "G P", keywords: "board kanban stages", run: close(() => ui.go("/pipeline")) },
      { id: "go-email", group: "Go to", label: "Email", hint: "G E", keywords: "inboxes instantly warmup campaign", run: close(() => ui.go("/email")) },
      { id: "import", group: "Actions", label: "Import CSV…", keywords: "upload leads", run: close(() => ui.setDialog("import")) },
      { id: "export", group: "Actions", label: "Export CSV…", keywords: "download backup", run: close(() => ui.setDialog("export")) },
      { id: "refresh", group: "Actions", label: "Refresh email data", keywords: "instantly reload", run: close(() => void refresh()) },
      { id: "undo", group: "Actions", label: "Undo last stage move", hint: "⌘Z", run: close(() => undoLast()) },
      { id: "shortcuts", group: "Actions", label: "Keyboard shortcuts", hint: "?", keywords: "help keys", run: close(() => ui.setDialog("shortcuts")) },
      { id: "theme-system", group: "Appearance", label: "Appearance: follow system", keywords: "theme light dark", run: close(() => ui.setTheme("system")) },
      { id: "theme-light", group: "Appearance", label: "Appearance: light", keywords: "theme", run: close(() => ui.setTheme("light")) },
      { id: "theme-dark", group: "Appearance", label: "Appearance: dark", keywords: "theme night", run: close(() => ui.setTheme("dark")) },
      ...ui.views.map<Item>(v => ({ id: `view-${v.id}`, group: "Views", label: `View: ${v.name}`, keywords: "filter saved", run: close(() => { ui.applyView(v.id); ui.go("/"); }) })),
    ];
    if (ui.installable) list.push({ id: "install", group: "Actions", label: "Install app", keywords: "home screen pwa", run: close(() => void ui.install()) });
    list.push({ id: "logout", group: "Account", label: "Log out", keywords: "sign out", run: close(async () => { const r = await fetch("/api/auth", { method: "DELETE" }); if (r.ok) navigateSession("/login"); }) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.views, ui.installable, refresh, undoLast]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const leadItem = (l: (typeof real)[number]): Item => ({ id: `lead-${l.tracked_slug}`, group: q ? "Leads" : "Recent", label: l.name, hint: `${l.handle} · ${l.stage}`, run: close(() => ui.openLead(l.tracked_slug)) });
    if (!q) {
      const recent = ui.recent.flatMap(slug => real.filter(l => l.tracked_slug === slug)).slice(0, 4).map(leadItem);
      return [...recent, ...commands];
    }
    const matchedLeads = real.map(l => ({ l, s: Math.max(score(q, l.name), score(q, l.handle), score(q, l.tracked_slug) * .6, score(q, l.platform) * .4) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map(x => leadItem(x.l));
    const matchedCommands = commands.map(c => ({ c, s: Math.max(score(q, c.label), score(q, c.keywords ?? "") * .7) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.c);
    return [...matchedCommands.slice(0, 6), ...matchedLeads];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, real, commands, ui.recent]);

  useEffect(() => { list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(items.length - 1); }
    else if (event.key === "Enter") { event.preventDefault(); items[active]?.run(); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  };
  let lastGroup = "";
  return createPortal(<div className="gg-palette-backdrop" onClick={onClose}>
    <div ref={ref} className="gg-palette palette-enter" role="dialog" aria-modal="true" aria-label="Command palette" onClick={e => e.stopPropagation()} onKeyDown={onKey}>
      <div className="gg-palette-input"><SearchIcon />
        <input ref={input} autoFocus type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined} aria-autocomplete="list" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="Search leads, pages and commands" placeholder="Search leads, pages and commands" value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} />
        <button className="gg-palette-close" onClick={onClose} aria-label="Close command palette">Esc</button>
      </div>
      <ul id="palette-list" ref={list} role="listbox" aria-label="Results" className="gg-palette-list" hidden={!items.length}>
        {items.map((item, index) => {
          const header = item.group !== lastGroup; lastGroup = item.group;
          return <li key={item.id} role="presentation">
            {header && <p className="gg-palette-group" aria-hidden="true">{item.group}</p>}
            <div id={`palette-${item.id}`} role="option" aria-selected={index === active} data-index={index} className={`gg-palette-item ${index === active ? "gg-palette-active" : ""}`} onPointerMove={() => setActive(index)} onClick={item.run}>
              <span className="gg-palette-label">{item.label}</span>{item.hint && <span className="gg-palette-hint">{item.hint}</span>}<ArrowIcon />
            </div>
          </li>;
        })}
      </ul>
      {!items.length && <p className="gg-palette-empty" role="status">No matches for “{query}”. Try a name, a platform or a command.</p>}
      <p className="gg-palette-foot" aria-hidden="true"><span><kbd className="gg-kbd">↑↓</kbd> move</span><span><kbd className="gg-kbd">↵</kbd> open</span><span><kbd className="gg-kbd">esc</kbd> close</span></p>
    </div>
  </div>, document.body);
}
