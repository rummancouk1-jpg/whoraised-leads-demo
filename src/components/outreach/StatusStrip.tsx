"use client";

import { useOutreach } from "@/contexts/OutreachContext";
import { useEmail } from "@/contexts/EmailContext";
import { useActivity } from "@/contexts/ActivityContext";
import { WAITING_FOR_CAMPAIGN } from "@/lib/activity";
import { RelTime } from "@/components/ui/RelTime";
import { Count } from "@/components/ui/R3";
import { Skeleton } from "@/components/ui/Skeleton";

/** The four numbers behind the status line. Each tile: label, figure, one honest line of context. */
export function StatusStrip() {
  const { summary, error, clicks, clicksAt, savedAt } = useOutreach();
  const { data, error: emailError, snapshot, isLive } = useEmail();
  const { data: activity } = useActivity();
  const failed = !!emailError;
  const inboxes = snapshot?.inboxes ?? [];
  const health = inboxes.flatMap(i => i.health === null ? [] : [i.health]);
  const creatorClicks = clicks ? clicks.groups.filter(g => g.group !== "Email").reduce((n, g) => n + g.clicks, 0) : null;
  const activityStats = activity ? Object.values(activity.stats) : null;
  const emailClicks = activityStats?.some(s => s.clicked === null) ? null : activityStats?.reduce((n, s) => n + (s.clicked ?? 0), 0) ?? null;
  const totalClicks = creatorClicks === null || emailClicks === null ? null : creatorClicks + emailClicks;
  const status = snapshot?.campaign?.status;
  const labels: Record<string, string> = { "0": "Draft", "1": "Active", "2": "Paused", "3": "Completed", "4": "Running subsequences" };
  const emailPending = !snapshot && !failed && !data;
  const sk = <><Skeleton className="gg-sk-figure" /><span className="gg-sr-only">Loading…</span></>;
  return <section className="gg-status-strip" aria-label="Outreach status" aria-busy={!summary || emailPending}>
    <div className="card kpi"><p>Sending inboxes</p><strong>{snapshot ? <Count value={inboxes.length} /> : failed || data ? "Awaiting data" : sk}</strong><small>{health.length ? `${Math.round(health.reduce((a, b) => a + b, 0) / health.length)}% average health · ${health.length}/${inboxes.length} measured` : "Health unavailable"}{snapshot && ` · ${isLive ? "Instantly" : "Saved snapshot"}`}</small><span className="gg-fresh">{snapshot && <RelTime value={snapshot.fetchedAt} prefix={isLive ? "Updated " : "Saved "} />}</span></div>
    <div className="card kpi"><p>Outreach queued</p><strong>{summary ? <Count value={summary.queued} /> : error ? "Awaiting data" : sk}</strong><small>{summary ? `Priority: ${summary.priority} · Long tail: ${summary.longTail} · ${summary.groups.join(" · ")}` : "Awaiting shared workspace"}</small><span className="gg-fresh">{summary && savedAt && <RelTime value={savedAt} prefix="Updated " />}</span></div>
    <div className="card kpi"><p>Clicks · total</p><strong>{totalClicks === null ? clicks || activity ? "—" : sk : <Count value={totalClicks} />}</strong><small>Email clicks: {emailClicks?.toLocaleString() ?? "—"} · Creator clicks: {creatorClicks?.toLocaleString() ?? "—"}</small><span className="gg-fresh">{clicks && clicksAt && <RelTime value={clicksAt} prefix="Updated " />}</span></div>
    <div className="card kpi"><p>Campaign</p><strong>{snapshot ? snapshot.campaign ? labels[String(status)] ?? (status === undefined ? "Awaiting status" : `Status ${status}`) : snapshot.campaignMessage.startsWith("Multiple") ? "Selection required" : WAITING_FOR_CAMPAIGN : failed || data ? "Awaiting data" : sk}</strong><small>{snapshot?.campaign ? `Sent today ${snapshot.campaign.sentToday?.toLocaleString() ?? "—"} · Total ${snapshot.campaign.sent?.toLocaleString() ?? "—"} · Bounce ${snapshot.campaign.sent ? `${((snapshot.campaign.bounced ?? 0) / snapshot.campaign.sent * 100).toFixed(1)}%` : "—"}` : snapshot?.campaignMessage ?? "Awaiting Instantly data"}</small><span className="gg-fresh">{snapshot && <RelTime value={snapshot.fetchedAt} prefix={isLive ? "Updated " : "Saved "} />}</span></div>
  </section>;
}
