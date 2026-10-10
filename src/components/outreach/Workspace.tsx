"use client";
import { Anchor } from "@/components/ui/AccessibleLink";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useOutreach } from "@/contexts/OutreachContext";
import { INITIAL_FILTERS, useUIState, type Filters } from "@/contexts/UIContext";
import { audienceBand, conversionPriority, downloadCsv, exportCsv, fitScore, isExample, leadGroup, leadTier } from "@/lib/outreach";
import { GROUP_NAMES, KINDS, NICHES, PLATFORMS, STAGES, US_FOCUS, type Lead } from "@/types/outreach";
import { SavedViews } from "./SavedViews";
import { SyncBanner } from "@/components/shell/SyncBanner";
import { HomeDashboard } from "./HomeDashboard";
import { Avatar, ScoreBar } from "@/components/ui/R3";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { CloseIcon, FilterIcon } from "@/components/ui/Icons";
import { BoardSkeleton } from "./BoardSkeleton";
const Board = dynamic(() => import("./Board").then(module => module.Board), { loading: () => <BoardSkeleton /> });

const FILTER_LABELS: Record<keyof Filters, string> = { platform: "Platform", niche: "Niche", stage: "Stage", kind: "Group", us_focus: "U.S. focus", band: "Audience band", minScore: "Min fit" };

function TableSkeleton() {
  return <div className="gg-skel-table" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <div key={i} className="gg-skel-row"><Skeleton className="gg-sk-name" /><Skeleton className="gg-sk-chip" /><Skeleton className="gg-sk-chip gg-sk-hide-sm" /></div>)}</div>;
}

export function Workspace({ pipeline = false }: { pipeline?: boolean }) {
  return pipeline ? <PipelineWorkspace /> : <HomeDashboard />;
}
function PipelineWorkspace() {
  const { leads, clicks, error, loading, saveStatus, savedAt, retrySave, refresh, weights, useSuggested, suggestion } = useOutreach();
  const { view, setView, setFilter, resetView, openLead, setDialog, pipelineMode: mode, setPipelineMode: setMode } = useUIState();
  const { search, filters, sort, showLongTail } = view;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [descending, setDescending] = useState(false);
  const tierLeads = leads.filter(l => showLongTail || leadTier(l) === "priority");
  const longTailCount = leads.filter(l => !isExample(l) && leadTier(l) === "long-tail").length;
  const visible = tierLeads.filter(l => {
    const query = search.trim().toLowerCase();
    return !isExample(l) && (!query || [l.name, l.handle, l.tracked_slug, l.notes].some(v => v.toLowerCase().includes(query))) && (!filters.platform || l.platform === filters.platform) && (!filters.niche || l.niche === filters.niche) && (!filters.stage || l.stage === filters.stage) && (!filters.kind || l.kind === filters.kind) && (!filters.us_focus || l.us_focus === filters.us_focus) && (!filters.band || audienceBand(l.audience_size) === filters.band) && fitScore(l, weights).score >= Number(filters.minScore);
  }).sort((a, b) => {
    const values: Record<string, number> = { name: a.name.localeCompare(b.name), signups: b.signups - a.signups, audience: b.audience_size - a.audience_size, platform: a.platform.localeCompare(b.platform), kind: a.kind.localeCompare(b.kind), niche: a.niche.localeCompare(b.niche), us_focus: a.us_focus.localeCompare(b.us_focus), stage: STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage), clicks: (clicks?.leads.find(c => c.slug === b.tracked_slug)?.clicks ?? 0) - (clicks?.leads.find(c => c.slug === a.tracked_slug)?.clicks ?? 0), last_touch: b.last_touch.localeCompare(a.last_touch) };
    const result = values[sort] ?? ((useSuggested && suggestion ? conversionPriority(b, leads) - conversionPriority(a, leads) : 0) || (b.priority_score ?? fitScore(b, weights).score) - (a.priority_score ?? fitScore(a, weights).score) || a.name.localeCompare(b.name));
    return descending ? -result : result;
  });
  const clicksBySlug = new Map(clicks?.leads.map(c => [c.slug, c.clicks]));
  const real = tierLeads.filter(l => !isExample(l));
  const selectFilters = [{ key: "platform", label: "Platform", options: PLATFORMS }, { key: "niche", label: "Niche", options: NICHES }, { key: "stage", label: "Stage", options: STAGES }, { key: "kind", label: "Group", options: KINDS }, { key: "us_focus", label: "U.S. focus", options: US_FOCUS }, { key: "band", label: "Audience band", options: ["Under 5K", "5K–100K", "Over 100K"] }] as const;
  const active = (Object.keys(INITIAL_FILTERS) as (keyof Filters)[]).filter(k => filters[k] !== INITIAL_FILTERS[k]);
  const chipText = (k: keyof Filters) => k === "kind" ? GROUP_NAMES[filters.kind as keyof typeof GROUP_NAMES] : k === "minScore" ? `Min fit ${filters.minScore}` : filters[k];
  const open = (l: Lead) => openLead(l.tracked_slug);
  const sortColumn = (key: string) => { setDescending(sort === key ? !descending : false); setView({ sort: key }); };
  return <div className="gg-workspace r3-pipeline">
    <main id="main" tabIndex={-1} aria-labelledby="page-title">
    <div className="gg-workspace-header"><div className="gg-container gg-header-content"><div><p className="gg-eyebrow">Gap Gambler / Earnings Tournament</p><h1 id="page-title">Pipeline</h1><p>Your partners, from first hello to tournament kickoff.</p></div><div className="seg" aria-label="Pipeline display"><button aria-pressed={mode === "board"} onClick={() => setMode("board")}>Board</button><button aria-pressed={mode === "table"} onClick={() => setMode("table")}>Table</button></div></div></div>
    <div className="gg-container">
      <SyncBanner />
      {error && <div className="gg-error" role="alert">{error} <button onClick={() => { void retrySave(); void refresh(); }}>Retry connection / saving</button></div>}
      <p className="gg-load-status gg-sr-only" role="status">{loading ? "Loading shared workspace…" : ""}</p>
      <section id="lead-list" className="gg-lead-panel r3-pipeline-panel" aria-label="Lead workspace">
        <div className="gg-list-heading"><h2 className="gg-sr-only">Outreach pipeline</h2><span>{loading ? "Loading leads…" : <>{visible.length} of {real.length} qualified leads · {useSuggested && suggestion ? "Suggested priorities" : "Reach × fit × earnings × route"}</>}</span>
          <div className="gg-list-actions"><button className="gg-button gg-secondary" onClick={() => setDialog("import")}>Import CSV</button><button className="gg-button gg-secondary" onClick={() => downloadCsv(exportCsv(visible), "gg-current-view.csv")}>Export current view</button><button className="gg-button gg-secondary" onClick={() => setDialog("export")}>Full backup</button></div></div>
        <div className="gg-filters">
          <SavedViews />
          <div className="gg-search-row">
            <label className="gg-field gg-search">Search leads<input id="lead-search" type="search" value={search} onChange={e => setView({ search: e.target.value })} placeholder="Name, handle, slug or notes" aria-keyshortcuts="/" /></label>
            <button className={`gg-button gg-secondary gg-filter-toggle ${active.length ? "gg-has-filters" : ""}`} aria-expanded={filtersOpen} aria-controls="filter-panel" onClick={() => setFiltersOpen(o => !o)}><FilterIcon />Filters{active.length > 0 && <span className="gg-count">{active.length}</span>}</button>
          </div>
          <label className="gg-toggle"><input type="checkbox" checked={showLongTail} onChange={e => setView({ showLongTail: e.target.checked })} />Show long tail ({longTailCount})</label>
          {filtersOpen && <div id="filter-panel" className="gg-filter-grid">
            {selectFilters.map(f => <label className="gg-field" key={f.key}>{f.label}<select value={filters[f.key]} onChange={e => setFilter(f.key, e.target.value)}><option value="">All {f.label.toLowerCase()}</option>{f.options.map(o => <option key={o} value={o}>{f.key === "kind" ? GROUP_NAMES[o as keyof typeof GROUP_NAMES] : o}</option>)}</select></label>)}
            <label className="gg-field">Minimum fit score<input type="number" inputMode="numeric" min="0" max="100" value={filters.minScore} onChange={e => setFilter("minScore", String(Math.max(0, Math.min(100, Number(e.target.value)))))} /></label>
            <label className="gg-field">Sort<select value={sort} onChange={e => setView({ sort: e.target.value })}><option value="fit">{useSuggested && suggestion ? "Conversion priority, then fit" : "Highest outreach priority"}</option><option value="name">Name A–Z</option><option value="signups">Most signups</option></select></label>
            <button className="gg-button gg-secondary gg-reset" onClick={resetView}>Reset filters</button>
          </div>}
          {(active.length > 0 || search.trim()) && <ul className="gg-chips" aria-label="Active filters">
            {search.trim() && <li><button className="gg-chip" onClick={() => setView({ search: "" })}>Search “{search.trim()}”<CloseIcon /><span className="gg-sr-only"> remove</span></button></li>}
            {active.map(k => <li key={k}><button className="gg-chip" onClick={() => setFilter(k, INITIAL_FILTERS[k])}>{FILTER_LABELS[k] === chipText(k) ? FILTER_LABELS[k] : `${FILTER_LABELS[k]}: ${chipText(k)}`}<CloseIcon /><span className="gg-sr-only"> remove</span></button></li>)}
            <li><button className="gg-chip gg-chip-clear" onClick={resetView}>Clear all</button></li>
          </ul>}
        </div>
        {loading ? (mode === "board" ? <BoardSkeleton /> : <TableSkeleton />)
          : error && !leads.length ? <div className="gg-empty"><h3>Connection interrupted</h3><p>Retry the connection to see saved leads. No records have been removed.</p></div>
          : !leads.length ? <div className="gg-empty"><span className="gg-empty-icon" aria-hidden>↥</span><h3>Build your outreach list</h3><p>Import a CSV of finance creators, trading communities and newsletters. Start with the blank template and add your real leads.</p><button className="gg-button" onClick={() => setDialog("import")}>Import your first CSV</button><Anchor href="/gg-outreach-template.csv" download>Download blank template</Anchor></div>
          : !visible.length ? <div className="gg-empty"><h3>No matching leads</h3><p>Reset your filters, or import a CSV with leads that match these criteria.</p><button className="gg-button gg-secondary" onClick={resetView}>Reset filters</button></div>
          : mode === "board" ? <><p className="gg-board-hint">Drag a grip to move stages. Keyboard: Space, arrows, Space. Or use the stage menu.</p><Board leads={visible} onOpen={open} /></>
          : <div className="gg-table-scroll" role="region" aria-label="Lead records" tabIndex={0}><table className="gg-table"><thead><tr>{[["Partner", "c-name", "name"], ["Score", "c-score", "fit"], ["Platform", "c-platform", "platform"], ["Group", "c-group", "kind"], ["Audience", "c-audience", "audience"], ["Niche", "c-niche", "niche"], ["U.S. focus", "c-us", "us_focus"], ["Stage", "c-stage", "stage"], ["Clicks", "c-clicks", "clicks"], ["Signups (manual)", "c-signups", "signups"], ["Last touch", "c-touch", "last_touch"], ["Draft", "c-draft", ""]].map(([h, c, key]) => <th key={h} scope="col" className={c} aria-sort={key && sort === key ? descending ? "descending" : "ascending" : undefined}>{key ? <button onClick={() => sortColumn(key)}>{h} {sort === key ? descending ? "↓" : "↑" : "↕"}</button> : h}</th>)}</tr></thead><tbody>{visible.map(l => <tr key={l.tracked_slug} data-lead={l.tracked_slug}><td className="c-name"><div className="r3-table-partner"><Avatar lead={l} /><button className="gg-name-button" onClick={() => open(l)}><span data-partner-name>{l.name}</span><small>{l.handle}</small></button></div></td><td className="c-score"><ScoreBar score={l.priority_score ?? fitScore(l, weights).score} /></td><td className="c-platform">{l.platform}</td><td className="c-group">{leadGroup(l)}</td><td className="c-audience">{l.audience_size.toLocaleString()}</td><td className="c-niche">{l.niche}</td><td className="c-us">{l.us_focus}</td><td className="c-stage"><span className={`gg-stage-badge gg-stage-${l.stage.toLowerCase()}`}><span className="gg-stage-dot" aria-hidden="true" />{l.stage}</span></td><td className="c-clicks">{clicks ? clicksBySlug.get(l.tracked_slug) ?? 0 : "—"}</td><td className="c-signups">{l.signups}</td><td className="c-touch">{l.last_touch ? <RelTime value={l.last_touch} /> : "—"}</td><td className="c-draft"><button className="gg-button gg-secondary gg-small" onClick={() => open(l)} aria-label={`Draft for ${l.name}`}>Draft ↗</button></td></tr>)}</tbody></table></div>}
      </section>
      <p className="gg-storage-note"><span role="status">{saveStatus}</span> {savedAt && !loading ? <>(checked <RelTime value={savedAt} />) </> : null}Other viewers receive changes within a few seconds. Export CSV for a backup.</p>
    </div>
    </main>
  </div>;
}
