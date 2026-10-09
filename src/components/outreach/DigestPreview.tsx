"use client";

import { useEffect, useState } from "react";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DigestModel, DigestSendState } from "@/lib/digest";

type Payload = { model: DigestModel; state: DigestSendState; text: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" });

/** What David and Ian would receive on Monday 9:00 AM ET, rendered from live data. Sending is controlled on the server and is off by default. */
export function DigestPreview() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/digest", { cache: "no-store", signal: abort.signal }).then(r => { if (!r.ok) throw new Error("failed"); return r.json(); }).then(setPayload).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, [attempt]);
  const m = payload?.model, s = payload?.state;
  return <section className="gg-lead-panel" aria-labelledby="digest-title">
    <div className="gg-list-heading"><h2 id="digest-title">Weekly digest</h2><span>Mondays 9:00 AM ET · David and Ian</span></div>
    {failed ? <div className="gg-error" role="alert"><p>The digest preview couldn&apos;t be built.</p><button className="gg-button gg-secondary" onClick={() => {setFailed(false);setPayload(null);setAttempt(n=>n+1);}}>Retry digest preview</button></div> : !m || !s ? <div aria-hidden="true"><Skeleton className="gg-sk-hero-rest" /><Skeleton className="gg-sk-hero-rest" /></div> : <>
      <p className="gg-digest-state" role="status"><span className={`gg-dot ${s.enabled && s.ready ? "gg-dot-ok" : "gg-dot-idle"}`} aria-hidden="true" /><strong>{s.enabled ? "Sending is on" : "Sending is off"}</strong> · {s.enabled ? s.ready ? `next send ${when(s.nextSendAt)}` : "email delivery setup needs attention; no digest will be sent yet" : `nothing is sent until you enable it. Next scheduled slot: ${when(s.nextSendAt)}`}</p>
      <article className="gg-digest" aria-label="Digest preview">
        <p className="gg-digest-subject"><span className="gg-muted">Subject</span> {m.subject}</p>
        <p className="gg-digest-status">{m.status}</p>
        <dl className="gg-digest-numbers">{m.numbers.map(n => <div key={n.label}><dt>{n.label}</dt><dd>{n.value}</dd><dd className="gg-digest-note">{n.note}</dd></div>)}</dl>
        <h3>Top creators this week</h3>
        {m.topCreators.length ? <ul>{m.topCreators.map(c => <li key={c.name}>{c.name} <span className="gg-muted">· {c.platform}</span><span>{c.clicks} visit{c.clicks === 1 ? "" : "s"}{c.signups === null ? "" : ` · ${c.signups} signup${c.signups === 1 ? "" : "s"}`}</span></li>)}</ul> : <p className="gg-muted">{m.topNote}</p>}
        <h3>Replies</h3>
        {m.replies.length ? <ul>{m.replies.map(r => <li key={r.name + r.at}>{r.name}<span><RelTime value={r.at} />{r.waiting ? " · waiting" : ""}</span></li>)}</ul> : <p className="gg-muted">No replies this week.</p>}
        <p className="gg-muted">{m.needs.replies} to answer · {m.needs.followups} follow-ups due · {m.needs.bounces} bounces to fix</p>
        <p className="gg-fresh">Built <RelTime value={m.generatedAt} />. {m.freshness}</p>
      </article>
      <p><a className="gg-link" href="/api/digest?format=html" target="_blank" rel="noreferrer">Open the exact email in a new tab</a></p>
    </>}
  </section>;
}
