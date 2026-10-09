import "server-only";
import { equal } from "./auth";
import { database, initializeDatabase, withDatabaseDeadline } from "./db";
import { RELEASE_SHA, recentErrors } from "./errors";
import { currentSyncHealth } from "./sync";
import { STALE_AFTER_MIN } from "@/lib/activity";

const STARTED = new Date().toISOString();
export function ohqAuthorized(request: Request) {
  const token = process.env.OHQ_TOKEN;
  return !!token && equal(request.headers.get("authorization") ?? "", `Bearer ${token}`);
}
async function dbCheck() {
  try { await withDatabaseDeadline(async () => { await initializeDatabase(); await database()`SELECT 1`; }); return { ok: true, checked_at: new Date().toISOString() }; }
  catch { return { ok: false, checked_at: new Date().toISOString() }; }
}
/** GET /api/ohq/health — the OHQ Watch contract: JSON, bearer-only, counts-only, quick. */
export async function ohqHealth() {
  const [db, sync] = await Promise.all([dbCheck(), currentSyncHealth().catch(() => null)]);
  return { ok: db.ok && sync?.state === "ok", app: "gg-outreach", release: RELEASE_SHA, checks: { db, instantly_sync: sync ? { ok: sync.state === "ok", state: sync.state, last_ok_at: sync.lastOkAt, consecutive_failures: sync.consecutiveFailures } : { ok: false, state: "unreadable" } } };
}
/** GET /api/ohq/watch — release, health, counts-only errors and alerts, plus the sync and digest sections. */
export async function ohqWatch() {
  const [db, sync, errors] = await Promise.all([dbCheck(), currentSyncHealth().catch(() => null), recentErrors(24).catch(() => [])]);
  const alerts: { severity: "critical" | "warning"; reason: string; since: string }[] = [];
  if (!db.ok) alerts.push({ severity: "critical", reason: "Database unreachable", since: db.checked_at });
  if (sync?.state === "failing" && sync.consecutiveFailures >= 2) alerts.push({ severity: "warning", reason: `Instantly sync failing (${sync.consecutiveFailures} runs in a row)`, since: sync.failedSince ?? db.checked_at });
  if (sync?.state === "stale") alerts.push({ severity: "warning", reason: `Instantly sync older than ${STALE_AFTER_MIN} minutes`, since: sync.lastOkAt ?? db.checked_at });
  // The canary proves capture works; it is counted in errors_24h but never raises an alert.
  const fresh = errors.filter(e => e.name !== "MonitoringCanary" && e.first_seen > new Date(Date.now() - 3_600_000).toISOString());
  if (fresh.length) alerts.push({ severity: "warning", reason: `${fresh.length} new error type${fresh.length === 1 ? "" : "s"} in the last hour`, since: fresh[fresh.length - 1].first_seen });
  return {
    contract: "1",
    release: { sha: RELEASE_SHA, deployed_at: STARTED, worker_head: null, mismatch: null },
    deploy_truth: { deployedSha: RELEASE_SHA, inSync: null },
    checks: { db: { ok: db.ok, checked_at: db.checked_at }, instantly_sync: sync ? { state: sync.state, last_ok_at: sync.lastOkAt, consecutive_failures: sync.consecutiveFailures } : null },
    health: { ok: db.ok && sync?.state === "ok", db, instantly_sync: sync ? { state: sync.state, last_ok_at: sync.lastOkAt } : null },
    errors_24h: errors.map(e => ({ fingerprint: e.fingerprint, name: e.name, surface: e.surface, route: e.route, release_sha: e.release_sha, role: "admin", count: e.count, first_seen: new Date(e.first_seen).toISOString(), last_seen: new Date(e.last_seen).toISOString(), status: "new" })),
    new_fingerprints_since_deploy: errors.filter(e => e.release_sha === RELEASE_SHA).map(e => e.fingerprint),
    alerts,
  };
}
