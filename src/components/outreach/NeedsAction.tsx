"use client";

import { useState } from "react";
import { useActivity } from "@/contexts/ActivityContext";
import { useUIState } from "@/contexts/UIContext";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowIcon } from "@/components/ui/Icons";
import type { QueueItem, QueueKind } from "@/lib/activity";

const KIND: Record<QueueKind, { label: string; tone: string }> = { reply: { label: "Reply", tone: "ok" }, bounce: { label: "Bounce", tone: "bad" }, followup: { label: "Follow up", tone: "warn" } };
const VISIBLE = 5;
const count = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The work comes to you: replies waiting for an answer, bounces to fix, follow-ups that are due. One tap opens the lead. */
export function NeedsAction() {
  const { data, fetchedAt, error } = useActivity();
  const { openLead } = useUIState();
  const [all, setAll] = useState(false);
  const queue: QueueItem[] = data?.queue ?? [];
  const shown = all ? queue : queue.slice(0, VISIBLE);
  const tally = (["reply", "bounce", "followup"] as const).map(k => [k, queue.filter(q => q.kind === k).length] as const).filter(([, n]) => n);
  const summary = tally.map(([k, n]) => k === "reply" ? count(n, "reply", "replies") + " to answer" : k === "bounce" ? count(n, "bounce", "bounces") + " to fix" : count(n, "follow-up", "follow-ups") + " due").join(" · ");
  const sentSomething = Object.values(data?.stats ?? {}).some(s => s.sent > 0);
  return <section className="gg-needs" aria-labelledby="needs-title" aria-busy={!data && !error}>
    <div className="gg-needs-head">
      <h2 id="needs-title">Needs action today{queue.length > 0 && <span className="gg-count" aria-label={`${queue.length} items`}>{queue.length}</span>}</h2>
      <span className="gg-fresh">{data ? <RelTime value={fetchedAt ?? data.generatedAt} prefix="Updated " /> : null}</span>
    </div>
    {!data ? (error ? <p className="gg-needs-empty" role="alert">Couldn&apos;t read the action queue. It will retry shortly.</p> : <div className="gg-needs-skeleton" aria-hidden="true"><Skeleton className="gg-sk-hero-rest" /><Skeleton className="gg-sk-hero-rest" /></div>)
      : !queue.length ? <p className="gg-needs-empty">{sentSomething || data.sync.state === "ok" && data.sync.counts && Number(data.sync.counts.matched) > 0 ? "You're clear. No replies waiting, nothing bounced, no follow-ups due." : "Nothing yet. Replies, bounces and follow-ups appear here once sending starts."}</p>
      : <>
        <p className="gg-needs-summary">{summary}</p>
        <ul className="gg-needs-list">{shown.map(q => <li key={q.slug + q.kind}>
          <button className="gg-needs-item" onClick={() => openLead(q.slug)} aria-label={`${KIND[q.kind].label}: ${q.name}. ${q.reason}. Open lead`}>
            <span className={`gg-needs-kind gg-needs-${KIND[q.kind].tone}`}><span className="gg-dot" aria-hidden="true" />{KIND[q.kind].label}</span>
            <span className="gg-needs-main"><strong>{q.name}</strong><small>{q.reason} · <RelTime value={q.since} /></small></span>
            <ArrowIcon />
          </button>
        </li>)}</ul>
        {queue.length > VISIBLE && <button className="gg-button gg-secondary gg-needs-more" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? "Show fewer" : `Show all ${queue.length}`}</button>}
      </>}
  </section>;
}
