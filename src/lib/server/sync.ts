import "server-only";
import { database, initializeDatabase } from "./db";
import { assertLeadScopes, fetchCampaignActivity, selectCampaignId, withInstantlyDeadline, type ActivityCheckpoint } from "./instantly";
import { acquireLease, releaseLease } from "./lease";
import { getLeads } from "./leads";
import { recordError } from "./errors";
import { mapInstantly } from "@/lib/instantly-map";
import { syncHealth, SYNC_INTERVAL_MIN, type SyncRun } from "@/lib/activity";

// Runs from a developer machine (stubbed or real) are labelled apart so they can never make a deployed app look freshly synced.
const SOURCE = process.env.VERCEL ? "instantly" : "instantly-local";
export type SyncOutcome = { ran: boolean; ok: boolean; reason?: string; counts?: Record<string, number | string> };

/**
 * One Instantly read: campaign leads + emails -> per-lead stats and timeline events. Every attempt leaves a row in
 * gg_sync_runs, success or failure, which is what the freshness indicator and the stale warning are computed from.
 * `minAgeMin` makes the call a no-op when a good run is recent (the on-screen nudge uses it; the cron does not).
 */
export async function runInstantlySync(trigger: "cron" | "manual" | "auto", minAgeMin = 0): Promise<SyncOutcome> {
  await initializeDatabase();
  const sql = database();
  const owner = await acquireLease("instantly-sync");
  if (!owner) return { ran: false, ok: true, reason: "A sync is already running." };
  let id: number | undefined;
  try {
  const recent = await sql`SELECT max(finished_at) AS last_ok FROM gg_sync_runs WHERE source=${SOURCE} AND ok`;
  if (minAgeMin > 0 && recent[0].last_ok && Date.now() - new Date(recent[0].last_ok).getTime() < minAgeMin * 60_000) return { ran: false, ok: true, reason: "Synced recently." };
  const run = await sql`INSERT INTO gg_sync_runs(source,trigger) VALUES (${SOURCE},${trigger}) RETURNING id`;
  id = run[0].id;
    if (!process.env.INSTANTLY_API_KEY) throw new Error("Instantly is not connected. Ask the workspace owner to connect it.");
    const campaign = await withInstantlyDeadline(async () => { await assertLeadScopes(); return selectCampaignId(); });
    let counts: Record<string, number | string> = { state: "WAITING", campaign: campaign.message || "none", matched: 0, sent: 0, opened: 0, replied: 0, bounced: 0 };
    if (!campaign.id) {
      // An authenticated, successful read with no selected campaign is healthy.
      // Keep historical activity intact, but mark this observation as waiting.
      const committed = await sql`UPDATE gg_sync_runs SET finished_at=now(), ok=true, counts=${JSON.stringify(counts)}::jsonb WHERE id=${id} AND EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now()) RETURNING id`;
      if (!committed.length) throw new Error("Instantly sync lease expired. Previous complete data is retained.");
    }
    if (campaign.id) {
      const leads = await getLeads();
      const checkpoint = await sql`SELECT state FROM gg_sync_checkpoints WHERE campaign=${campaign.id}`;
      const saved = checkpoint[0]?.state as ActivityCheckpoint | undefined;
      const { leads: remote, emails, observedFrom } = await withInstantlyDeadline(() => fetchCampaignActivity(campaign.id!, saved, async state => {
        await sql`INSERT INTO gg_sync_checkpoints(campaign,state) SELECT ${campaign.id},${JSON.stringify(state)}::jsonb
          WHERE EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now())
          ON CONFLICT(campaign) DO UPDATE SET state=EXCLUDED.state,updated_at=now()`;
      }));
      const mapped = mapInstantly(leads, remote, emails);
      const slugs = mapped.stats.map(s => s.slug);
      const queries = [
        // Hold the lease row through the entire commit. An expired lease cannot
        // be reassigned between the stats, events and successful-run writes.
        sql`SELECT owner FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now() FOR UPDATE`,
        sql`DELETE FROM gg_lead_stats WHERE NOT (slug = ANY(${slugs}::text[])) AND EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now())`,
        sql`INSERT INTO gg_lead_stats(slug,email,sent,opened,replied,clicked,bounced,unsubscribed,interest,last_outbound_at,last_inbound_at,last_open_at,last_click_at,synced_at,unknown_fields)
          SELECT x.slug,x.email,x.sent,coalesce(x.opened,0),x.replied,coalesce(x.clicked,0),x.bounced,x.unsubscribed,x.interest,x.last_outbound_at::timestamptz,x.last_inbound_at::timestamptz,x.last_open_at::timestamptz,x.last_click_at::timestamptz,now(),to_jsonb(array_remove(ARRAY[CASE WHEN x.opened IS NULL THEN 'opened' END,CASE WHEN x.clicked IS NULL THEN 'clicked' END],NULL))
          FROM jsonb_to_recordset(${JSON.stringify(mapped.stats)}::jsonb) AS x(slug text,email text,sent int,opened int,replied int,clicked int,bounced boolean,unsubscribed boolean,interest int,last_outbound_at text,last_inbound_at text,last_open_at text,last_click_at text)
          WHERE EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now())
          ON CONFLICT (slug) DO UPDATE SET email=EXCLUDED.email,sent=EXCLUDED.sent,opened=EXCLUDED.opened,replied=EXCLUDED.replied,clicked=EXCLUDED.clicked,bounced=EXCLUDED.bounced,unsubscribed=EXCLUDED.unsubscribed,interest=EXCLUDED.interest,last_outbound_at=EXCLUDED.last_outbound_at,last_inbound_at=EXCLUDED.last_inbound_at,last_open_at=EXCLUDED.last_open_at,last_click_at=EXCLUDED.last_click_at,synced_at=now(),unknown_fields=EXCLUDED.unknown_fields`,
        sql`INSERT INTO gg_lead_events(ref,slug,kind,at,n)
          SELECT x.ref,x.slug,x.kind,x.at::timestamptz,x.n FROM jsonb_to_recordset(${JSON.stringify(mapped.events)}::jsonb) AS x(ref text,slug text,kind text,at text,n int)
          WHERE EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now())
          ON CONFLICT (ref) DO UPDATE SET at=EXCLUDED.at, n=EXCLUDED.n`,
      ];
      counts = { campaign: "found", observedFrom, matched: mapped.stats.length, sent: mapped.stats.reduce((n, s) => n + s.sent, 0), opened: mapped.stats.reduce((n, s) => n + (s.opened ?? 0), 0), replied: mapped.stats.reduce((n, s) => n + s.replied, 0), bounced: mapped.stats.filter(s => s.bounced).length, instantlyLeads: remote.length, emails: emails.length };
      queries.push(sql`DELETE FROM gg_sync_checkpoints WHERE campaign=${campaign.id} AND EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now())`);
      queries.push(sql`UPDATE gg_sync_runs SET finished_at=now(), ok=true, counts=${JSON.stringify(counts)}::jsonb WHERE id=${id} AND EXISTS (SELECT 1 FROM gg_job_leases WHERE key='instantly-sync' AND owner=${owner} AND lease_until>now()) RETURNING id`);
      const committed = await sql.transaction(queries);
      if (!committed.at(-1)?.length) throw new Error("Instantly sync lease expired. Previous complete data is retained.");
    }
    return { ran: true, ok: true, counts };
  } catch (e) {
    // Provider text only: Instantly errors never contain the key. Anything else becomes a generic line.
    const message = e instanceof Error && /^(Instantly|Configured)/.test(e.message) ? e.message : "Instantly sync failed. The previous data is still shown.";
    if (id !== undefined) await sql`UPDATE gg_sync_runs SET finished_at=now(), ok=false, error=${message} WHERE id=${id}`.catch(() => {});
    await recordError({ surface: "server", name: "InstantlySyncFailed", message, route: "/api/cron/instantly-sync" });
    return { ran: true, ok: false, reason: message };
  } finally { await releaseLease("instantly-sync",owner).catch(() => {}); }
}

export async function recentSyncRuns(limit = 20): Promise<SyncRun[]> {
  await initializeDatabase();
  const sql = database();
  const [recent, lastGood] = await Promise.all([
    sql`SELECT started_at, finished_at, ok, error, trigger, counts FROM gg_sync_runs WHERE source=${SOURCE} ORDER BY started_at DESC LIMIT ${limit}`,
    sql`SELECT started_at, finished_at, ok, error, trigger, counts FROM gg_sync_runs WHERE source=${SOURCE} AND ok=true ORDER BY started_at DESC LIMIT 1`,
  ]);
  const rows = [...recent];
  if (lastGood.length && !rows.some(r => String(r.started_at) === String(lastGood[0].started_at) && r.ok === true)) rows.push(lastGood[0]);
  return rows.map(r => ({ startedAt: new Date(r.started_at).toISOString(), finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null, ok: r.ok, error: r.error, trigger: r.trigger, counts: r.counts }));
}
export async function currentSyncHealth() { return syncHealth(await recentSyncRuns()); }
export { SYNC_INTERVAL_MIN };
