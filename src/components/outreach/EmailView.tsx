"use client";
import { useEffect } from "react";
import { useEmail } from "@/contexts/EmailContext";
import { sendingState } from "@/lib/email-state";
import { SyncBanner } from "@/components/shell/SyncBanner";
import { SyncDetail } from "./SyncDetail";
import { DigestPreview } from "./DigestPreview";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Ring } from "@/components/ui/R3";
import { BounceBrakeAlert } from "./BounceBrakeAlert";
import { tournamentFacts } from "@/config/tournament";
const value = (n: number | null | undefined) => n == null ? "Awaiting metrics" : n.toLocaleString();
function rate(n: number | null, denominator: number | null) { return n === null || !denominator ? "—" : (100 * n / denominator).toFixed(1) + "%"; }
export function EmailView() {
  const { data, snapshot, isLive, busy, error, refresh, brake } = useEmail();
  useEffect(() => { const t = setTimeout(() => void refresh(), 0); return () => clearTimeout(t); }, [refresh]);
  const campaign = snapshot?.campaign, history = data?.history ?? [];
  const facts = tournamentFacts();
  const end = snapshot?.day ?? history[0]?.day;
  const dates = end ? Array.from({ length: 14 }, (_, i) => new Date(Date.parse(end + "T00:00:00Z") - (13 - i) * 86400000).toISOString().slice(0, 10)) : [];
  const byDay = new Map(history.map(s => [s.day, s.metrics]));
  if (snapshot) byDay.set(snapshot.day, snapshot);
  const batches = [...new Map([...history.filter(s => s.metrics.campaign?.id === campaign?.id).flatMap(s => s.metrics.batches).reverse(), ...(snapshot?.batches ?? [])].map(b => [b.date, b])).values()].sort((a, b) => b.date.localeCompare(a.date));
  return <div className="gg-workspace r3-email"><main id="main" tabIndex={-1} aria-labelledby="page-title"><div className="gg-workspace-header"><div className="gg-container gg-header-content"><div><h1 id="page-title">Email</h1><p>Live sending, delivery, and bounce protection.</p></div><button className="gg-button gg-secondary" disabled={busy} onClick={() => void refresh()}>{busy ? "Reading metrics…" : "Refresh live data"}</button></div></div><div className="gg-container gg-email-main">
    <BounceBrakeAlert /><SyncBanner />{(error || data?.error) && <p role="alert" className="gg-error">{error || data?.error}</p>}
    <p className="gg-storage-note">{snapshot ? <>{isLive ? "Live data fetched " : "Saved snapshot from "}<RelTime value={snapshot.fetchedAt} /> · {snapshot.day} UTC</> : "Reading Instantly metrics…"} · Read-only</p>
    <section aria-labelledby="inboxes-title"><div className="r3-section-head"><h2 id="inboxes-title">Sending inboxes</h2><span className="gg-muted">{snapshot?.inboxes.length ?? "—"} connected</span></div><div className="grid inboxes">
      {!snapshot && Array.from({length:4}, (_, i) => <div className="card inbox" key={i} aria-hidden><Skeleton className="r3-sk-ring" /><div><Skeleton className="gg-sk-name" /><Skeleton className="gg-sk-line" /></div></div>)}
      {snapshot?.inboxes.map(inbox => <article key={inbox.email} className="card inbox"><Ring value={inbox.health} small label={inbox.email + ": health " + (inbox.health ?? "unknown") + " out of 100"} /><div><h3 className="addr" title={inbox.email}>{inbox.email}</h3><p className="st">{inbox.warmup === "Unavailable" ? "Awaiting warmup status" : inbox.warmup} · {inbox.health === null ? "Awaiting health" : inbox.health + " health"}</p><p className="st">Sent today: {inbox.sentToday === null ? sendingState(snapshot) : value(inbox.sentToday)} · Limit {value(inbox.dailyLimit)}</p></div></article>)}
      {snapshot && !snapshot.inboxes.length && <p className="gg-muted">No sending inboxes connected. Connect accounts in Instantly, then refresh.</p>}
    </div></section>
    <section className="card" aria-labelledby="campaign-title">
      {!campaign ? <div className="campaign-wait"><div><span className="chip"><span className="gg-dot gg-dot-warn" aria-hidden />{snapshot ? snapshot.campaignMessage : "Awaiting campaign data"}</span><h2 id="campaign-title">{sendingState(snapshot, brake)}</h2><p>Sending inboxes and campaign results appear here when live campaign data is available.</p><p className="r3-email-note">{facts.entry} · {facts.range} · {facts.eligibility}</p><p>{facts.close}.</p></div><ol className="seq" aria-label="Planned three-email sequence">{[["Invitation", "Day 0", "Planned"], ["Reminder", "Day 3", "Planned"], ["Last nudge", "Day 7", "Planned"]].map(([title, detail, day], i) => <li className="step" key={title}><span className="k">{i + 1}</span><div><span className="t">{title}</span><p className="d">{detail}</p></div><span className="d">{day}</span></li>)}</ol></div>
      : <><div className="card-h"><h2 id="campaign-title">{campaign.name}</h2><span className="meta">{sendingState(snapshot!, brake)}</span></div><div className="gg-email-metrics gg-campaign-summary">{[
        { label: "Sent today", value: campaign.sentToday?.toLocaleString() ?? "—", detail: "Instantly · Eastern day" },
        { label: "Total sent", value: campaign.sent?.toLocaleString() ?? "—", detail: "Campaign lifetime" },
        { label: "Bounce %", value: rate(campaign.bounced, campaign.sent), detail: `${value(campaign.bounced)} bounced / ${value(campaign.sent)} sent` },
        { label: "Brake last checked", value: brake?.lastSuccess?.at ? <RelTime value={brake.lastSuccess.at} /> : "Unavailable", detail: brake?.lastSuccess?.at ? "Successful production check" : "No successful check recorded" },
      ].map(metric => <div key={metric.label}><h3>{metric.label}</h3><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}</div><p className="card-b gg-email-note">Opened {value(campaign.opened)} · Replied {value(campaign.replied)} · Unsubscribed {value(campaign.unsubscribed)}. Rates divide unique leads by {value(campaign.contacted)} contacted leads; replies exclude automatic replies.</p></>}
    </section>
    {campaign && <section className="card" aria-label="Campaign setup"><div className="card-h"><h2>{campaign.leadsCount == null ? "Lead count unavailable" : `${value(campaign.leadsCount)} leads`} · {campaign.steps == null ? "Steps unavailable" : `${campaign.steps.length} steps`}</h2><a className="meta r3-link" href={`https://app.instantly.ai/app/campaign/${encodeURIComponent(campaign.id)}/analytics`} target="_blank" rel="noreferrer">Review in Instantly →</a></div><div className="card-b"><p>{facts.close}. Tournament runs {facts.range}. {facts.entry} · {facts.dailyPick} · Longest streak wins {facts.prize} · {facts.eligibility} · Register any time.</p>{campaign.steps && <ol className="seq" aria-label="Saved campaign sequence">{campaign.steps.map((step, i) => <li className="step" key={i}><span className="k">{i + 1}</span><div><span className="t">{step.subject}</span><p className="d">Day {step.day}</p></div></li>)}</ol>}</div></section>}
    <section className="card" aria-labelledby="warmup-title"><div className="card-h"><h2 id="warmup-title">14-day warmup health</h2><span className="meta">Real daily snapshots · UTC</span></div><div className="card-b">
      {data?.historyError && <p role="alert" className="gg-error">{data.historyError}</p>}
      {dates.length && snapshot?.inboxes.length ? <><div className="r3-heat-scroll" role="region" aria-label="Warmup health heatmap" tabIndex={0}><div className="heat"><span className="who">Inbox</span>{dates.map(date => <span key={date} title={date}>{date.slice(8)}</span>)}{snapshot.inboxes.map(inbox => <div className="r3-heat-row" key={inbox.email}><span className="who" title={inbox.email}>{inbox.email}</span>{dates.map(date => { const measured = byDay.get(date)?.inboxes.find(i => i.email === inbox.email), health = measured?.health; return <span className={"c " + (health == null ? "n" : health < 90 ? "l" : "")} key={date} role="img" aria-label={inbox.email + ", " + date + ": " + (health == null ? "No snapshot" : health + " health, " + measured?.warmup)} title={date + ": " + (health == null ? "No snapshot" : health + "/100 · " + measured?.warmup)} />; })}</div>)}</div></div><div className="r3-heat-legend"><span>● 90–100 healthy</span><span>◐ Below 90</span><span>○ No recorded metric</span></div></> : <p className="gg-muted">No daily snapshots yet. The daily job records real inbox metrics; failed reads create no snapshot.</p>}
      <p className="gg-email-note">Health is Instantly’s warmup score. Each saved snapshot is immutable for its UTC day. Sent counts reflect capture time.</p>
    </div></section>
    {campaign && <details><summary>Send batches & campaign snapshot trends</summary><section className="card"><div className="card-h"><h2>Send batch comparison</h2><span className="meta">UTC send days</span></div><div className="card-b">{!batches.length ? <p>No send batches recorded yet.</p> : <div className="gg-table-scroll" role="region" aria-label="Send batch comparison" tabIndex={0}><table className="gg-table"><thead><tr>{["Send day", "Sent", "Contacted", "Unique opens", "Unique replies", "Replies / contacted"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{batches.map(b => <tr key={b.date}><td>{b.date}</td><td>{value(b.sent)}</td><td>{value(b.contacted)}</td><td>{value(b.opened)}</td><td>{value(b.replied)}</td><td>{rate(b.replied,b.contacted)}</td></tr>)}</tbody></table></div>}<p className="gg-email-note">Opens and replies are observed on that day, not attributed to that day’s recipients.</p><h3>Campaign snapshot trends</h3><ul>{history.filter(s => s.metrics.campaign).map(s => <li key={s.day}>{s.day} · {s.metrics.campaign?.name} · Sent {value(s.metrics.campaign?.sent)} · Opened {value(s.metrics.campaign?.opened)} · Replied {value(s.metrics.campaign?.replied)} · Bounced {value(s.metrics.campaign?.bounced)} · Unsubscribed {value(s.metrics.campaign?.unsubscribed)}</li>)}</ul></div></section></details>}
    <details><summary>Sync details & weekly digest</summary><SyncDetail /><DigestPreview /></details>
  </div></main></div>;
}
