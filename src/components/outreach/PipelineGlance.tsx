"use client";

import { AppLink as Link } from "@/components/ui/AccessibleLink";
import { useOutreach } from "@/contexts/OutreachContext";
import { INITIAL_FILTERS, useUIState } from "@/contexts/UIContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowIcon } from "@/components/ui/Icons";
import { STAGES, type Lead } from "@/types/outreach";
import { Count } from "@/components/ui/R3";

/** Where every lead stands, in one bar. Each stage is a shortcut into the list filtered to it. */
export function PipelineGlance({ real }: { real: Lead[] }) {
  const { loading, error } = useOutreach();
  const { setView, view, go } = useUIState();
  const counts = STAGES.map(stage => ({ stage, count: real.filter(l => l.stage === stage).length }));
  const joined = counts.find(c => c.stage === "Joined")?.count ?? 0;
  const signups = real.reduce((n, l) => n + l.signups, 0);
  const choose = (stage: string) => { setView({ search: "", showLongTail: true, filters: { ...INITIAL_FILTERS, stage } }); go("/pipeline"); };
  return <section className="gg-glance gg-summary" aria-labelledby="glance-title" aria-busy={loading}>
    <div className="gg-glance-head"><h2 id="glance-title">Pipeline</h2><Link className="gg-link" href="/pipeline" prefetch={false}>Open board <ArrowIcon /></Link></div>
    {loading ? <><Skeleton className="gg-sk-bar" /><span className="gg-sr-only">Loading shared workspace…</span></> : error && !real.length ? <p className="gg-muted">Stage counts will appear when the connection returns.</p> : <>
      <div className="gg-stagebar" role="img" aria-label={counts.map(c => `${c.stage} ${c.count}`).join(", ")}>{counts.filter(c => c.count).map(c => <span key={c.stage} className={`gg-stage-fill gg-fill-${c.stage.toLowerCase()}`} style={{ flexGrow: c.count }} />)}</div>
      <ul className="gg-stagelist">{counts.map(c => <li key={c.stage}><button className={`gg-stagechip ${view.filters.stage === c.stage ? "gg-stagechip-on" : ""}`} aria-pressed={view.filters.stage === c.stage} onClick={() => choose(c.stage)}><span className={`gg-stage-dot gg-stage-${c.stage.toLowerCase()}`} aria-hidden="true" /><span className="gg-stagechip-name">{c.stage}</span><strong><Count value={c.count} /></strong></button></li>)}</ul>
      <p className="gg-glance-note"><span><strong>{real.length}</strong> qualified leads</span><span><strong>{signups}</strong> signups <small>(manual)</small></span><span><strong>{joined}</strong> joined · {real.length ? Math.round(joined / real.length * 100) : 0}%</span></p>
    </>}
  </section>;
}
