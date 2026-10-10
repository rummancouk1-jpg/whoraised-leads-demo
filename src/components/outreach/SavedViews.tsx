"use client";

import { useRef, useState } from "react";
import { useUIState, sameView, DEFAULT_VIEW } from "@/contexts/UIContext";
import { CloseIcon } from "@/components/ui/Icons";
import { useOutreach } from "@/contexts/OutreachContext";
import { audienceBand, fitScore, isExample, leadTier } from "@/lib/outreach";

/** Saved filter sets: built-in views plus the viewer's own, kept in this browser. */
export function SavedViews() {
  const { views, view, activeView, applyView, saveView, deleteView } = useUIState();
  const { leads, weights } = useOutreach();
  const counts = new Map(views.map(v => [v.id, leads.filter(l => {
    const s = v.state, f = s.filters, q = s.search.trim().toLowerCase();
    return !isExample(l) && (s.showLongTail || leadTier(l) === "priority") && (!q || [l.name, l.handle, l.tracked_slug, l.notes].some(t => t.toLowerCase().includes(q))) && (!f.platform || l.platform === f.platform) && (!f.niche || l.niche === f.niche) && (!f.kind || l.kind === f.kind) && (!f.stage || l.stage === f.stage) && (!f.us_focus || l.us_focus === f.us_focus) && (!f.band || audienceBand(l.audience_size) === f.band) && fitScore(l, weights).score >= Number(f.minScore);
  }).length]));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dirty = !activeView && !sameView(view, DEFAULT_VIEW);
  const submit = () => { if (saveView(name)) { setNaming(false); setName(""); setTimeout(() => trigger.current?.focus(), 0); } };
  return <div className="gg-views" role="group" aria-label="Saved views">
    <div className="gg-view-chips">{views.map(v => <span key={v.id} className={`gg-view ${activeView?.id === v.id ? "gg-view-on" : ""}`}>
      <button className="gg-view-btn" aria-pressed={activeView?.id === v.id} onClick={() => applyView(v.id)}>{v.name}<span className="r3-view-count">{counts.get(v.id)}</span></button>
      {!v.builtin && <button className="gg-view-del" aria-label={`Delete view ${v.name}`} onClick={() => deleteView(v.id)}><CloseIcon /></button>}
    </span>)}</div>
    {naming
      ? <form className="gg-view-form" onSubmit={e => { e.preventDefault(); submit(); }}>
          <label className="gg-sr-only" htmlFor="view-name">View name</label>
          <input id="view-name" autoFocus maxLength={40} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setNaming(false); setTimeout(() => trigger.current?.focus(), 0); } }} placeholder="Name this view" />
          <button className="gg-button" type="submit" disabled={!name.trim()}>Save</button>
          <button className="gg-button gg-secondary" type="button" onClick={() => { setNaming(false); setTimeout(() => trigger.current?.focus(), 0); }}>Cancel</button>
        </form>
      : <button ref={trigger} className="gg-button gg-secondary gg-save-view" disabled={!dirty} onClick={() => setNaming(true)} title={dirty ? "Save the current filters as a view" : "Change a filter to save it as a view"}>Save view</button>}
  </div>;
}
