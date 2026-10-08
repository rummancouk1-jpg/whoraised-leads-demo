"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useOutreach } from "@/contexts/OutreachContext";
import { INITIAL_FILTERS, useUIState, type Filters } from "@/contexts/UIContext";
import { audienceBand, conversionPriority, fitScore, isExample, leadGroup, leadTier } from "@/lib/outreach";
import { GROUP_NAMES, KINDS, NICHES, PLATFORMS, STAGES, US_FOCUS, type Lead } from "@/types/outreach";
import { ConversionLoop } from "./ConversionLoop";
import { ClickAnalytics } from "./ClickAnalytics";
import { SavedViews } from "./SavedViews";
import { StatusLine } from "./StatusLine";
import { StatusStrip } from "./StatusStrip";
import { PipelineGlance } from "./PipelineGlance";
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
  const { leads, clicks, error, loading, saveStatus, savedAt, retrySave, refresh, weights, useSuggested, suggestion } = useOutreach();
  const { view, setView, setFilter, resetView, openLead, setDialog } = useUIState();
  const { search, filters, sort, showLongTail } = view;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const tierLeads = leads.filter(l => showLongTail || leadTier(l) === "priority");
  const longTailCount = leads.filter(l => !isExample(l) && leadTier(l) === "long-tail").length;
  const visible = tierLeads.filter(l => {
    const query = search.trim().toLowerCase();
    return (!isExample(l) || !!query) && (!query || [l.name, l.handle, l.tracked_slug, l.notes].some(v => v.toLowerCase().includes(query))) && (!filters.platform || l.platform === filters.platform) && (!filters.niche || l.niche === filters.niche) && (!filters.stage || l.stage === filters.stage) && (!filters.kind || l.kind === filters.kind) && (!filters.us_focus || l.us_focus === filters.us_focus) && (!filters.band || audienceBand(l.audience_size) === filters.band) && fitScore(l, weights).score >= Number(filters.minScore);
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "signups" ? b.signups - a.signups : (useSuggested && suggestion ? conversionPriority(b, leads) - conversionPriority(a, leads) : 0) || (b.priority_score ?? fitScore(b, weights).score) - (a.priority_score ?? fitScore(a, weights).score) || a.name.localeCompare(b.name));
  const clicksBySlug = new Map(clicks?.leads.map(c => [c.slug, c.clicks]));
  const real = tierLeads.filter(l => !isExample(l));
  const selectFilters = [{ key: "platform", label: "Platform", options: PLATFORMS }, { key: "niche", label: "Niche", options: NICHES }, { key: "stage", label: "Stage", options: STAGES }, { key: "kind", label: "Group", options: KINDS }, { key: "us_focus", label: "U.S. focus", options: US_FOCUS }, { key: "band", label: "Audience band", options: ["Under 5K", "5K–100K", "Over 100K"] }] as const;
  const active = (Object.keys(INITIAL_FILTERS) as (keyof Filters)[]).filter(k => filters[k] !== INITIAL_FILTERS[k]);
  const chipText = (k: keyof Filters) => k === "kind" ? GROUP_NAMES[filters.kind as keyof typeof GROUP_NAMES] : k === "minScore" ? `Min fit ${filters.minScore}` : filters[k];
  const open = (l: Lead) => openLead(l.tracked_slug);
  const title = pipeline ? "Pipeline" : "Lead list";
  return <div className="gg-workspace">
    <main id="main" tabIndex={-1} aria-labelledby="page-title">
    {pipeline && <div className="gg-workspace-header"><div className="gg-container gg-header-content"><div><p className="gg-eyebrow">Gap Gambler / Earnings Tournament</p><h1 id="page-title">Pipeline</h1><p>Recruit finance creators and trading communities.</p></div></div></div>}
    <div className="gg-container">
      <StatusLine compact={pipeline} />
      {!pipeline && <StatusStrip />}
      <div className="gg-tournament" role="note"><strong>Oct 19 – Nov 13</strong><span>Free entry · One daily pick · Longest streak wins $1,000 · U.S. 18+</span></div>
      {error && <div className="gg-error" role="alert">{error} <button onClick={() => { void retrySave(); void refresh(); }}>Retry connection / saving</button></div>}
      <p className="gg-load-status gg-sr-only" role="status">{loading ? "Loading shared workspace…" : ""}</p>
      {!pipeline && <PipelineGlance real={real} />}
      <section id="lead-list" className={`gg-lead-panel ${pipeline ? "gg-dark-panel" : ""}`} aria-label="Lead workspace">
        <div className="gg-list-heading"><h2>{pipeline ? "Outreach pipeline" : title}</h2><span>{loading ? "Loading leads…" : <>{visible.length} of {real.length} qualified leads · {useSuggested && suggestion ? "Suggested priorities" : "Reach × fit × earnings × route"}</>}</span>
          <div className="gg-list-actions"><button className="gg-button gg-secondary" onClick={() => setDialog("import")}>Import CSV</button><button className="gg-button gg-secondary" onClick={() => setDialog("export")}>Export CSV</button></div></div>
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
        {loading ? (pipeline ? <><p className="gg-board-hint">Drag a card by its grip, or use the stage menu on each card. Keyboard: focus a grip, Space, arrow keys, Space. Scroll sideways for every column.</p><BoardSkeleton /></> : <TableSkeleton />)
          : error && !leads.length ? <div className="gg-empty"><h3>Connection interrupted</h3><p>Retry the connection to see saved leads. No records have been removed.</p></div>
          : !leads.length ? <div className="gg-empty"><span className="gg-empty-icon" aria-hidden>↥</span><h3>Build your outreach list</h3><p>Import a CSV of finance creators, trading communities and newsletters. Start with the blank template and add your real leads.</p><button className="gg-button" onClick={() => setDialog("import")}>Import your first CSV</button><a href="/gg-outreach-template.csv" download>Download blank template</a></div>
          : !visible.length ? <div className="gg-empty"><h3>No matching leads</h3><p>Reset your filters, or import a CSV with leads that match these criteria.</p><button className="gg-button gg-secondary" onClick={resetView}>Reset filters</button></div>
          : pipeline ? <><p className="gg-board-hint">Drag a card by its grip, or use the stage menu on each card. Keyboard: focus a grip, Space, arrow keys, Space. Scroll sideways for every column.</p><Board leads={visible} onOpen={open} /></>
          : <div className="gg-table-scroll" role="region" aria-label="Lead records" tabIndex={0}><table className="gg-table"><thead><tr>{[["Name / handle", "c-name"], ["Priority score", "c-score"], ["Platform", "c-platform"], ["Group", "c-group"], ["Audience", "c-audience"], ["Niche", "c-niche"], ["U.S. focus", "c-us"], ["Stage", "c-stage"], ["Clicks", "c-clicks"], ["Signups (manual)", "c-signups"], ["Last touch", "c-touch"], ["Draft", "c-draft"]].map(([h, c]) => <th key={h} scope="col" className={c}>{h}</th>)}</tr></thead><tbody>{visible.map(l => <tr key={l.tracked_slug}><td className="c-name"><button className="gg-name-button" onClick={() => open(l)}>{l.name}<small>{l.handle}</small></button></td><td className="c-score"><span className="gg-score">{l.priority_score ?? fitScore(l, weights).score}</span></td><td className="c-platform">{l.platform}</td><td className="c-group">{leadGroup(l)}</td><td className="c-audience">{l.audience_size.toLocaleString()}</td><td className="c-niche">{l.niche}</td><td className="c-us">{l.us_focus}</td><td className="c-stage"><span className={`gg-stage-badge gg-stage-${l.stage.toLowerCase()}`}><span className="gg-stage-dot" aria-hidden="true" />{l.stage}</span></td><td className="c-clicks">{clicks ? clicksBySlug.get(l.tracked_slug) ?? 0 : "—"}</td><td className="c-signups">{l.signups}</td><td className="c-touch">{l.last_touch ? <RelTime value={l.last_touch} /> : "—"}</td><td className="c-draft"><button className="gg-button gg-secondary gg-small" onClick={() => open(l)} aria-label={`Draft for ${l.name}`}>Draft ↗</button></td></tr>)}</tbody></table></div>}
      </section>
      {!pipeline && <><ClickAnalytics scopedLeads={real} /><ConversionLoop scopedLeads={real} /></>}
      <p className="gg-storage-note"><span role="status">{saveStatus}</span> {savedAt && !loading ? <>(checked <RelTime value={savedAt} />) </> : null}Other viewers receive changes within a few seconds. Export CSV for a backup.</p>
    </div>
    </main>
  </div>;
}
