"use client";

import { useEffect, useState } from "react";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TimelineStep, TimelineEvent } from "@/lib/activity";

/** Sent → opened → replied → clicked → signed up. Reached steps show what happened and when; later steps stay muted. */
export function LeadTimeline({ slug }: { slug: string }) {
  return <Timeline key={slug} slug={slug} />;
}
function Timeline({ slug }: { slug: string }) {
  const [state, setState] = useState<{ steps: TimelineStep[]; events?: TimelineEvent[]; syncedAt: string | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/leads/${encodeURIComponent(slug)}/activity`, { cache: "no-store", signal: abort.signal })
      .then(r => { if (!r.ok) throw new Error("failed"); return r.json(); })
      .then(setState).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, [slug,attempt]);
  return <section className="gg-drawer-section" aria-labelledby={`activity-${slug}`}>
    <h3 id={`activity-${slug}`}>Activity {state?.syncedAt && <span className="gg-fresh"><RelTime value={state.syncedAt} prefix="Synced " /></span>}</h3>
    {failed ? <div className="gg-muted" role="alert"><p>Couldn&apos;t load this lead&apos;s activity.</p><button className="gg-button gg-secondary" onClick={() => {setFailed(false);setState(null);setAttempt(n=>n+1);}}>Retry lead activity</button></div>
      : !state ? <div className="gg-timeline-skeleton" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="gg-sk-hero-rest" />)}</div>
      : <ol className="gg-timeline">{state.steps.map(step => <li key={step.key} className={step.done ? "gg-tl-done" : "gg-tl-todo"}>
        <span className="gg-tl-dot" aria-hidden="true" />
        <span className="gg-tl-body"><strong>{step.label}<span className="gg-sr-only">{step.done ? " — reached" : " — not yet"}</span></strong><small>{step.detail}{step.done && step.at ? <> · <RelTime value={step.at} /></> : null}</small></span>
      </li>)}</ol>}
    {state?.events?.length ? <><h4>History</h4><ol className="gg-timeline">{state.events.map(event=><li key={event.ref} className="gg-tl-done"><span className="gg-tl-dot" aria-hidden="true"/><span className="gg-tl-body"><strong>{event.kind==="sent"?"Email sent":event.kind==="replied"?"Human reply":event.kind==="opened"?"Open reported":event.kind==="bounced"?"Email bounced":"Click reported"}</strong><small><RelTime value={event.at}/></small></span></li>)}</ol></> : null}
  </section>;
}
