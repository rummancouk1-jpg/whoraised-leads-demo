"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink as Link } from "@/components/ui/AccessibleLink";
import { Avatar, Count, Ring, ScoreBar } from "@/components/ui/R3";
import { useOutreach } from "@/contexts/OutreachContext";
import { useEmail } from "@/contexts/EmailContext";
import { useActivity } from "@/contexts/ActivityContext";
import { INITIAL_FILTERS, useUIState } from "@/contexts/UIContext";
import { fitScore, isExample } from "@/lib/outreach";
import { GROUP_NAMES, KINDS } from "@/types/outreach";
import { useNow } from "@/components/ui/RelTime";
import { StatusLine } from "./StatusLine";
import { StatusStrip } from "./StatusStrip";
import { NeedsAction } from "./NeedsAction";
import { PipelineGlance } from "./PipelineGlance";
import { ClickAnalytics } from "./ClickAnalytics";
import { Attribution } from "./Attribution";
import { ConversionLoop } from "./ConversionLoop";
import { SyncBanner } from "@/components/shell/SyncBanner";

type Visit = { partners: number; joined: number; clicks: number; day: string };
function Changes() {
  const { leads, loading, clicks } = useOutreach(); const { snapshot } = useEmail();
  const baseline = useRef<Visit | null | undefined>(undefined); const [line, setLine] = useState("Comparing your latest workspace snapshot…");
  useEffect(() => {
    if (loading || !clicks || !snapshot) return;
    const real = leads.filter(l => !isExample(l));
    const now: Visit = { partners: real.length, joined: real.filter(l => l.stage === "Joined").length, clicks: clicks.groups.reduce((n, g) => n + g.clicks, 0), day: snapshot.day };
    let text = "Your first visit snapshot is saved. Changes will appear when you return.";
    try {
      if (baseline.current === undefined) baseline.current = JSON.parse(localStorage.getItem("gg-visit-r3") ?? "null");
      const old = baseline.current;
      if (old && [old.partners, old.joined, old.clicks].every(Number.isFinite)) {
        const delta = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
        text = now.partners === old.partners && now.joined === old.joined && now.clicks === old.clicks ? "No changes since your last visit." : `Since your last visit: ${delta(now.partners - old.partners)} partners · ${delta(now.joined - old.joined)} joined · ${delta(now.clicks - old.clicks)} tracked clicks.`;
      }
      localStorage.setItem("gg-visit-r3", JSON.stringify(now));
    } catch { text = "Visit snapshots are unavailable in this browser."; }
    const timer = setTimeout(() => setLine(text), 0); return () => clearTimeout(timer);
  }, [leads, loading, clicks, snapshot]);
  return <p className="r3-changes">{line}</p>;
}
export function LaunchChecklist() {
  const { summary, loading } = useOutreach(); const { snapshot } = useEmail(); const { data } = useActivity();
  const vetted = summary?.total ?? 0;
  const warmed = snapshot?.inboxes.filter(i => i.warmup === "Active" && i.health !== null && i.health >= 90).length ?? 0;
  const live = !!data?.attribution.live;
  const rows = [
    { label: "Inboxes warmed", done: !!snapshot?.inboxes.length && warmed === snapshot.inboxes.length, detail: snapshot ? `${warmed} / ${snapshot.inboxes.length} ready` : "Awaiting inbox data" },
    { label: "Partner list vetted", done: vetted > 0, detail: loading && !summary ? "Reading list" : `${vetted} / ${vetted} verified` },
    { label: "Preregistration link", done: live, detail: live ? "Live" : "Pending" },
    { label: "First campaign", done: !!snapshot?.campaign && ["1", "3", "4"].includes(String(snapshot.campaign.status)), detail: snapshot?.campaign ? ({ "0": "Draft", "1": "Live", "2": "Paused", "3": "Completed", "4": "Live" }[String(snapshot.campaign.status)] ?? "Awaiting status") : "Waiting" },
  ];
  return <ul className="checklist" aria-label="Launch checklist">{rows.map(row => <li key={row.label}><span className={`tick ${row.done ? "" : "pending"}`} aria-label={row.done ? "Complete" : "Pending"}>{row.done ? "✓" : "·"}</span><b>{row.label}</b><span className="when">{row.detail}</span></li>)}</ul>;
}
export function HomeDashboard() {
  const { leads, weights, loading, error, retrySave } = useOutreach(); const { setView, go } = useUIState();
  const now = useNow();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const real = leads.filter(l => !isExample(l));
  const top = [...real].sort((a, b) => (b.priority_score ?? fitScore(b, weights).score) - (a.priority_score ?? fitScore(a, weights).score) || a.name.localeCompare(b.name)).slice(0, 5);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const days = Math.max(0, Math.ceil((Date.parse("2026-10-19T00:00:00Z") - Date.parse(`${date}T00:00:00Z`)) / 86400000));
  const chooseGroup = (kind: string) => { setView({ search: "", showLongTail: true, filters: { ...INITIAL_FILTERS, kind } }); go("/pipeline"); };
  return <div className="gg-workspace r3-home"><main id="main" tabIndex={-1} aria-labelledby="page-title"><div className="gg-container">
    <SyncBanner /><div className="hero"><div><StatusLine /><p className="r3-hero-description">Creators, newsletters, communities and sponsors, ready for the tournament. Replies, follow-ups and signups appear as sending begins.</p><Changes /></div><div className="card countdown"><Ring value={Math.min(100, Math.max(0, Math.round((30 - days) / 30 * 100)))} display={days} label={`${days} days to October 19 kickoff`} /><div><div className="lbl">Days to kickoff</div><div className="big num">Oct 19 – Nov 13</div><div className="lbl">Longest streak wins $1,000</div></div></div></div>
    <StatusStrip /><div className="card facts" role="note"><span><b>Oct 19 – Nov 13</b></span><span>Free entry</span><span>One daily pick</span><span>Longest streak wins <b>$1,000</b></span><span>U.S. 18+</span></div>
    {error && <div className="gg-error" role="alert">{error}<button className="btn" onClick={() => void retrySave()}>Retry saving</button></div>}
    <div className="grid home-grid"><div className="r3-stack"><div className="card r3-action"><NeedsAction /><div className="card-b"><LaunchChecklist /></div></div><section className="card"><div className="card-h"><h2>Top priority</h2><Link className="meta r3-link" href="/pipeline">View all →</Link></div><div className="card-b"><ul className="leadlist">{top.map(lead => <li key={lead.tracked_slug}><Link className="leadrow" href="/pipeline" onClick={() => { setView({ search: lead.tracked_slug, showLongTail: true, filters: { ...INITIAL_FILTERS } }); }}><Avatar lead={lead} /><span className="r3-min"><span className="nm">{lead.name}</span><span className="hd">{lead.handle} · {lead.platform}</span></span><span className="chip">{GROUP_NAMES[lead.kind]}</span><ScoreBar score={lead.priority_score ?? fitScore(lead, weights).score} /></Link></li>)}</ul>{!top.length && <p className="gg-muted">{loading ? "Reading partner priorities…" : "Import partners in Pipeline to see your top five."}</p>}</div></section></div>
    <div className="r3-stack"><PipelineGlance real={real} /><section className="card"><div className="card-h"><h2>By group</h2><span className="meta">Qualified partners</span></div><div className="card-b grid groups">{KINDS.map(kind => { const rows = real.filter(l => l.kind === kind); return <button className="group" key={kind} onClick={() => chooseGroup(kind)}><span className="gn">{GROUP_NAMES[kind]}</span><span className="gv"><Count value={rows.length} /></span><span className="gs">{rows.reduce((n, l) => n + l.signups, 0)} signups · {rows.filter(l => l.stage === "Joined").length} joined</span></button>; })}</div></section></div></div>
    <details className="card r3-analytics" onToggle={e => setAnalyticsOpen(e.currentTarget.open)}><summary><span>Click analytics, attribution & conversion priorities</span><span className="r3-analytics-chevron" aria-hidden="true">⌄</span></summary>{analyticsOpen && <div className="card-b r3-stack"><ClickAnalytics scopedLeads={real} /><Attribution /><ConversionLoop scopedLeads={real} /></div>}</details>
  </div></main></div>;
}


