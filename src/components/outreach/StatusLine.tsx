"use client";

import { useOutreach } from "@/contexts/OutreachContext";
import { useEmail } from "@/contexts/EmailContext";
import { buildStatusLine } from "@/lib/status-line";
import { SyncPill } from "@/components/shell/SyncBanner";
import { RelTime } from "@/components/ui/RelTime";
import { Skeleton } from "@/components/ui/Skeleton";

/** The one-sentence answer to "where does the campaign stand?" — built only from live data (see lib/status-line). */
export function StatusLine({ compact = false }: { compact?: boolean }) {
  const { summary, error } = useOutreach();
  const { data, error: emailError, snapshot, isLive } = useEmail();
  const line = buildStatusLine({
    leadsLoading: !summary && !error, leadsFailed: !!error && !summary, queued: summary?.queued ?? 0, total: summary?.total ?? 0,
    email: snapshot ? "ready" : emailError || data ? "unavailable" : "loading", snapshot,
  });
  const Heading = compact ? "p" : "h1";
  return <section className={`gg-hero ${compact ? "gg-hero-compact" : ""}`} aria-label="Campaign status" aria-busy={line.text === null}>
    <p className="gg-hero-kicker"><span className={`gg-dot gg-dot-${line.tone}`} aria-hidden="true" />Campaign status
      {snapshot && <span className="gg-hero-fresh"> · <RelTime value={snapshot.fetchedAt} prefix={isLive ? "updated " : "saved snapshot from "} /></span>}
      <span className="gg-hero-fresh"> · <SyncPill /></span>
    </p>
    <Heading className="gg-hero-line" id={compact ? undefined : "page-title"}>
      {!compact && <span className="gg-sr-only">GG Outreach. </span>}
      {line.main ? <span className="gg-hero-main">{line.main}</span> : <><Skeleton className="gg-sk-hero" /><span className="gg-sr-only">Loading shared workspace…</span></>}
      {line.rest ? <span className="gg-hero-rest"><span className="gg-sep"> · </span>{line.rest.join(" · ")}</span> : <><Skeleton className="gg-sk-hero-rest" /><span className="gg-sr-only">Reading inbox status…</span></>}
    </Heading>
  </section>;
}
