"use client";

import { useRef, useState } from "react";
import { useUIState, sameView, DEFAULT_VIEW } from "@/contexts/UIContext";
import { CloseIcon } from "@/components/ui/Icons";

/** Saved filter sets: built-in views plus the viewer's own, kept in this browser. */
export function SavedViews() {
  const { views, view, activeView, applyView, saveView, deleteView } = useUIState();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dirty = !activeView && !sameView(view, DEFAULT_VIEW);
  const submit = () => { if (saveView(name)) { setNaming(false); setName(""); setTimeout(() => trigger.current?.focus(), 0); } };
  return <div className="gg-views" role="group" aria-label="Saved views">
    <div className="gg-view-chips">{views.map(v => <span key={v.id} className={`gg-view ${activeView?.id === v.id ? "gg-view-on" : ""}`}>
      <button className="gg-view-btn" aria-pressed={activeView?.id === v.id} onClick={() => applyView(v.id)}>{v.name}</button>
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
