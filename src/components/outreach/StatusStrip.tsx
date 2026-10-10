"use client";

import { useOutreach } from "@/contexts/OutreachContext";
import { useEmail } from "@/contexts/EmailContext";
import { WAITING_FOR_CAMPAIGN } from "@/lib/activity";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";

/** The four numbers behind the status line. Each tile: label, figure, one honest line of context. */
export function StatusStrip() {
  const { summary, error, clicks, clicksAt, savedAt } = useOutreach();
  const { data, error: emailError, snapshot, isLive } = useEmail();
  const failed = !!emailError;
  const warming = snapshot?.inboxes.filter(i => i.warmup === "Active");
  const health = warming?.flatMap(i => i.health === null ? [] : [i.health]) ?? [];
  const status = snapshot?.campaign?.status;
  const labels: Record<string, string> = { "0": "Draft", "1": "Active", "2": "Paused", "3": "Completed", "4": "Running subsequences" };
  const emailPending = !snapshot && !failed && !data;
  const sk = <><Skeleton className="gg-sk-figure" /><span className="gg-sr-only">Loading…</span></>;
  return <section className="gg-status-strip" aria-label="Outreach status" aria-busy={!summary || emailPending}>
    <div><p>Inboxes warming</p><strong>{warming ? warming.length : failed || data ? "Awaiting data" : sk}</strong><small>{health.length ? `${Math.round(health.reduce((a, b) => a + b, 0) / health.length)}% average health · ${health.length}/${warming?.length} measured` : "Awaiting health metrics"}{snapshot && ` · ${isLive ? "Instantly" : "Saved snapshot"}`}</small><span className="gg-fresh">{snapshot && <RelTime value={snapshot.fetchedAt} prefix={isLive ? "Updated " : "Saved "} />}</span></div>
    <div><p>Outreach queued</p><strong>{summary ? summary.queued : error ? "Awaiting data" : sk}</strong><small>{summary ? `Priority: ${summary.priority} · Long tail: ${summary.longTail} · ${summary.groups.join(" · ")}` : "Awaiting shared workspace"}</small><span className="gg-fresh">{summary && savedAt && <RelTime value={savedAt} prefix="Updated " />}</span></div>
    <div><p>Tracked clicks</p><strong>{clicks ? clicks.groups.reduce((n, g) => n + g.clicks, 0) : sk}</strong><small>Creator link visits</small><span className="gg-fresh">{clicks && clicksAt && <RelTime value={clicksAt} prefix="Updated " />}</span></div>
    <div><p>Campaign</p><strong>{snapshot ? snapshot.campaign ? labels[String(status)] ?? (status === undefined ? "Awaiting status" : `Status ${status}`) : snapshot.campaignMessage.startsWith("Multiple") ? "Selection required" : WAITING_FOR_CAMPAIGN : failed || data ? "Awaiting data" : sk}</strong><small>{snapshot?.campaign?.name ?? (snapshot ? "Instantly snapshot" : "Awaiting Instantly data")}</small><span className="gg-fresh">{snapshot && <RelTime value={snapshot.fetchedAt} prefix={isLive ? "Updated " : "Saved "} />}</span></div>
  </section>;
}
