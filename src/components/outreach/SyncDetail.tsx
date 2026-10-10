"use client";

import { useActivity } from "@/contexts/ActivityContext";
import { RelTime } from "@/components/ui/RelTime";
import { SYNC_INTERVAL_MIN, WAITING_FOR_CAMPAIGN } from "@/lib/activity";

/** Data freshness, spelled out: what was last read from Instantly, whether the last attempt worked, and a way to retry. */
export function SyncDetail() {
  const { data, fetchedAt, syncing, syncNow } = useActivity();
  const sync = data?.sync;
  const c = sync?.counts;
  return <section className="gg-lead-panel" aria-labelledby="sync-title">
    <div className="gg-list-heading"><h2 id="sync-title">Instantly sync</h2><span>Every {SYNC_INTERVAL_MIN} minutes</span></div>
    {!sync ? <p className="gg-muted">Loading sync status…</p> : <>
      <dl className="gg-facts gg-sync-facts">
        <div><dt>Status</dt><dd>{sync.state === "waiting" ? WAITING_FOR_CAMPAIGN : sync.state === "ok" ? "Healthy" : sync.state === "never" ? "Not synced yet" : sync.state === "stale" ? "Behind schedule" : "Failing"}</dd></div>
        <div><dt>Last good sync</dt><dd>{sync.lastOkAt ? <RelTime value={sync.lastOkAt} /> : "Never"}</dd></div>
        <div><dt>Last attempt</dt><dd>{sync.lastAttemptAt ? <RelTime value={sync.lastAttemptAt} /> : "Never"}</dd></div>
        <div><dt>Page data read</dt><dd>{fetchedAt ? <RelTime value={fetchedAt} /> : "—"}</dd></div>
        {c && <div className="gg-facts-wide"><dt>Last good sync saw</dt><dd>{String(c.campaign) !== "found" ? String(c.campaign) : `${c.matched} of your leads in Instantly · ${c.sent} sent · ${c.opened} opened · ${c.replied} replied · ${c.bounced} bounced`}</dd></div>}
        {sync.lastError && <div className="gg-facts-wide"><dt>Error{sync.consecutiveFailures > 1 ? ` (${sync.consecutiveFailures} runs in a row)` : ""}</dt><dd>{sync.lastError}</dd></div>}
      </dl>
      <button className="gg-button gg-secondary gg-sync-action" disabled={syncing} onClick={() => void syncNow()}>{syncing ? "Syncing…" : "Sync now"}</button>
    </>}
  </section>;
}
