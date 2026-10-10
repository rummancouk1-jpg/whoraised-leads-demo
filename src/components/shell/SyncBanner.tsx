"use client";

import { useActivity } from "@/contexts/ActivityContext";
import { RelTime } from "@/components/ui/RelTime";
import { STALE_AFTER_MIN, WAITING_FOR_CAMPAIGN } from "@/lib/activity";

/** A visible warning whenever Instantly data cannot be trusted to be current. Silent when sync is healthy. */
export function SyncBanner() {
  const { data, syncing, syncNow } = useActivity();
  const sync = data?.sync;
  if (!sync || (sync.state !== "failing" && sync.state !== "stale")) return null;
  const failing = sync.state === "failing";
  return <div className="gg-sync-banner" role="alert">
    <span className="gg-dot gg-dot-warn" aria-hidden="true" />
    <p>
      <strong>{failing ? "Instantly sync is failing." : `Instantly hasn't synced in over ${STALE_AFTER_MIN} minutes.`}</strong>{" "}
      Email figures and the action queue may be out of date. {sync.lastOkAt ? <>Last good sync <RelTime value={sync.lastOkAt} />.</> : "There has been no good sync yet."}
      {failing && sync.lastError ? <> {sync.lastError}</> : null}
    </p>
    <button className="gg-button gg-secondary" disabled={syncing} onClick={() => void syncNow()}>{syncing ? "Syncing…" : "Sync now"}</button>
  </div>;
}

/** One-line sync health for the status line: a dot and plain words, with the time of the last good sync. */
export function SyncPill() {
  const { data } = useActivity();
  const sync = data?.sync;
  if (!sync) return null;
  const tone = sync.state === "ok" || sync.state === "waiting" ? "ok" : sync.state === "never" ? "idle" : "warn";
  return <span className="gg-sync-pill"><span className={`gg-dot gg-dot-${tone}`} aria-hidden="true" />
    {sync.state === "waiting" ? WAITING_FOR_CAMPAIGN : sync.state === "never" ? "Instantly not synced yet" : sync.state === "failing" ? <>Sync failing · last good <RelTime value={sync.lastOkAt} fallback="never" /></> : sync.state === "stale" ? <>Sync behind · last good <RelTime value={sync.lastOkAt} /></> : <>Synced <RelTime value={sync.lastOkAt} /></>}
  </span>;
}
