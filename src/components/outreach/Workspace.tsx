"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useOutreach } from "@/contexts/OutreachContext";
import { audienceBand, conversionPriority, fitScore, isExample, leadGroup, leadTier } from "@/lib/outreach";
import { GROUP_NAMES, KINDS, NICHES, PLATFORMS, STAGES, US_FOCUS, type Lead } from "@/types/outreach";
import { ImportDialog, ExportDialog } from "./DataDialogs";
import { LeadDrawer } from "./LeadDrawer";
import { ConversionLoop } from "./ConversionLoop";
import { ClickAnalytics } from "./ClickAnalytics";
const Board = dynamic(() => import("./Board").then(module => module.Board));
import { StatusStrip } from "./StatusStrip";

const initialFilters = { platform: "", niche: "", stage: "", kind: "", us_focus: "", band: "", minScore: "0" };
export function Workspace({ pipeline = false }: { pipeline?: boolean }) {
  const { leads, clicks, error, loading, saveStatus, retrySave, refresh, weights, useSuggested, suggestion } = useOutreach();
  const [dialog, setDialog] = useState<"import" | "export" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState("fit");
  const [showLongTail, setShowLongTail] = useState(false);
  const tierLeads = leads.filter(l => showLongTail || leadTier(l) === "priority");
  const longTailCount = leads.filter(l => !isExample(l) && leadTier(l) === "long-tail").length;
  const visible = tierLeads.filter(l => {
    const query = search.trim().toLowerCase();
    return (!isExample(l) || !!query) && (!query || [l.name, l.handle, l.tracked_slug, l.notes].some(v => v.toLowerCase().includes(query))) && (!filters.platform || l.platform === filters.platform) && (!filters.niche || l.niche === filters.niche) && (!filters.stage || l.stage === filters.stage) && (!filters.kind || l.kind === filters.kind) && (!filters.us_focus || l.us_focus === filters.us_focus) && (!filters.band || audienceBand(l.audience_size) === filters.band) && fitScore(l, weights).score >= Number(filters.minScore);
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "signups" ? b.signups - a.signups : (useSuggested && suggestion ? conversionPriority(b, leads) - conversionPriority(a, leads) : 0) || (b.priority_score ?? fitScore(b, weights).score) - (a.priority_score ?? fitScore(a, weights).score) || a.name.localeCompare(b.name));
  const selectedLead = leads.find(l => l.tracked_slug === selected);
  const clicksBySlug = new Map(clicks?.leads.map(c => [c.slug, c.clicks]));
  const real = tierLeads.filter(l => !isExample(l));
  const joined = real.filter(l => l.stage === "Joined").length;
  const summary = [{ label: "Qualified leads", value: real.length, note: "Creators & communities" }, { label: "Signups", value: real.reduce((sum, l) => sum + l.signups, 0), note: "Manual · awaiting prereg data" }, { label: "Joined", value: joined, note: "Creators & communities" }, { label: "Joined rate", value: real.length ? `${Math.round(joined / real.length * 100)}%` : "—", note: `${joined} / ${real.length} real leads` }];
  const selectFilters = [{ key: "platform", label: "Platform", options: PLATFORMS }, { key: "niche", label: "Niche", options: NICHES }, { key: "stage", label: "Stage", options: STAGES }, { key: "kind", label: "Group", options: KINDS }, { key: "us_focus", label: "U.S. focus", options: US_FOCUS }, { key: "band", label: "Audience band", options: ["Under 5K", "5K–100K", "Over 100K"] }] as const;
  const openLead = (l: Lead) => setSelected(l.tracked_slug);
  return <div className="gg-workspace"><header className="gg-workspace-header"><div className="gg-container gg-header-content"><div><p className="gg-eyebrow">Gap Gambler / Earnings Tournament</p><h1>{pipeline ? "Pipeline" : "GG Outreach"}</h1><p>Recruit finance creators and trading communities.</p></div><div className="gg-actions"><button className="gg-button" onClick={() => setDialog("import")}>Import CSV</button><button className="gg-button gg-dark-secondary" onClick={() => setDialog("export")}>Export CSV</button></div></div></header>
    <main className="gg-container"><div className="gg-tournament" role="note"><strong>Oct 19 – Nov 13</strong><span>Free entry · One daily pick · Longest streak wins $1,000 · U.S. 18+</span></div>
      {error && <div className="gg-error" role="alert">{error} <button onClick={() => { void retrySave(); void refresh(); }}>Retry connection / saving</button></div>}
      <p className="gg-load-status" role="status">{loading ? "Loading shared workspace…" : ""}</p>
      <StatusStrip />
      {!pipeline && <div className="gg-summary" aria-busy={loading}>{summary.map((s, i) => <section className={`gg-summary-card gg-summary-${i}`} key={s.label}><p>{s.label}</p><strong>{loading ? "…" : error ? "—" : s.value}</strong><small>{s.note}</small></section>)}</div>}
      <section className={`gg-lead-panel ${pipeline ? "gg-dark-panel" : ""}`} aria-label="Lead workspace"><div className="gg-list-heading"><h2>{pipeline ? "Outreach pipeline" : "Lead list"}</h2><span>{visible.length} of {real.length} qualified leads · {useSuggested && suggestion ? "Suggested priorities" : "Reach × fit × earnings × route"}</span></div>
        <div className="gg-filters"><label className="gg-toggle"><input type="checkbox" checked={showLongTail} onChange={e => setShowLongTail(e.target.checked)} />Show long tail ({longTailCount})</label><div className="gg-search-row"><label className="gg-field gg-search">Search leads<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, handle, slug or notes" /></label><label className="gg-field">Sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="fit">{useSuggested && suggestion ? "Conversion priority, then fit" : "Highest outreach priority"}</option><option value="name">Name A–Z</option><option value="signups">Most signups</option></select></label><button className="gg-button gg-secondary gg-reset" onClick={() => { setFilters(initialFilters); setSearch(""); setSort("fit"); setShowLongTail(false); }}>Reset filters</button></div>
          <div className="gg-filter-grid">{selectFilters.map(f => <label className="gg-field" key={f.key}>{f.label}<select value={filters[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}><option value="">All {f.label.toLowerCase()}</option>{f.options.map(o => <option key={o} value={o}>{f.key === "kind" ? GROUP_NAMES[o as keyof typeof GROUP_NAMES] : o}</option>)}</select></label>)}<label className="gg-field">Minimum fit score<input type="number" min="0" max="100" value={filters.minScore} onChange={e => setFilters({ ...filters, minScore: String(Math.max(0, Math.min(100, Number(e.target.value)))) })} /></label></div>
        </div>
        {loading || (error && !leads.length) ? <div className="gg-empty"><h3>{loading ? "Loading shared leads…" : "Connection interrupted"}</h3><p>{loading ? "Fetching the latest saved workspace." : "Retry the connection to see saved leads. No records have been removed."}</p></div> : !leads.length ? <div className="gg-empty"><span className="gg-empty-icon" aria-hidden>↥</span><h3>Build your outreach list</h3><p>Import a CSV of finance creators, trading communities and newsletters. Start with the blank template and add your real leads.</p><button className="gg-button" onClick={() => setDialog("import")}>Import your first CSV</button><a href="/gg-outreach-template.csv" download>Download blank template</a></div> : !visible.length ? <div className="gg-empty"><h3>No matching leads</h3><p>Reset your filters, or import a CSV with leads that match these criteria.</p></div> : pipeline ? <><p className="gg-board-hint">Drag the grip to change stage. Scroll sideways for all columns. Keyboard: focus a grip, Space, arrow keys, Space. Click a name for details.</p><Board leads={visible} onOpen={openLead} /></> : <div className="gg-table-scroll" role="region" aria-label="Lead records" tabIndex={0}><table className="gg-table"><thead><tr>{["Name / handle", "Priority score", "Platform", "Group", "Audience", "Niche", "U.S. focus", "Stage", "Clicks", "Signups (manual)", "Last touch", "Draft"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map(l => <tr key={l.tracked_slug}><td><button className="gg-name-button" onClick={() => openLead(l)}>{l.name}<small>{l.handle}</small></button></td><td><span className="gg-score">{l.priority_score ?? fitScore(l, weights).score}</span></td><td>{l.platform}</td><td>{leadGroup(l)}</td><td>{l.audience_size.toLocaleString()}</td><td>{l.niche}</td><td>{l.us_focus}</td><td><span className={`gg-stage-badge gg-stage-${l.stage.toLowerCase()}`}>{l.stage}</span></td><td>{clicks ? clicksBySlug.get(l.tracked_slug) ?? 0 : "—"}</td><td>{l.signups}</td><td>{l.last_touch || "—"}</td><td><button className="gg-button gg-secondary gg-small" onClick={() => openLead(l)} aria-label={`Draft for ${l.name}`}>Draft ↗</button></td></tr>)}</tbody></table></div>}
      </section>
      {!pipeline && <><ClickAnalytics scopedLeads={real} /><ConversionLoop scopedLeads={real} /></>}
      <p className="gg-storage-note" role="status">{saveStatus} Other viewers receive changes within a few seconds. Export CSV for a backup.</p>
    </main>
    {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}{dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}{selectedLead && <LeadDrawer key={selectedLead.tracked_slug} lead={selectedLead} onClose={() => setSelected(null)} />}
  </div>;
}
