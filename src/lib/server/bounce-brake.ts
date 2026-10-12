import "server-only";
import { GG_CAMPAIGN_ID, bounceCounts, type BounceBrakeStatus } from "@/lib/bounce-brake";
import { database, initializeDatabase } from "./db";
import { api, withInstantlyDeadline } from "./instantly";
import { acquireLease, releaseLease } from "./lease";

const RUN = "gg-bounce-brake-run", ALERT = "gg-bounce-brake-alert";
export async function bounceBrakeStatus(): Promise<BounceBrakeStatus> {
  await initializeDatabase();
  const [alerts, runs, successes] = await Promise.all([
    database()`SELECT recorded_at AS at, data FROM gg_internal_audit WHERE kind=${ALERT} AND data->>'campaign'=${GG_CAMPAIGN_ID} ORDER BY id DESC LIMIT 1`,
    database()`SELECT recorded_at AS at, data FROM gg_internal_audit WHERE kind=${RUN} AND data->>'campaign'=${GG_CAMPAIGN_ID} ORDER BY id DESC LIMIT 1`,
    database()`SELECT recorded_at AS at, data FROM gg_internal_audit WHERE kind=${RUN} AND data->>'campaign'=${GG_CAMPAIGN_ID} AND data->>'ok'='true' ORDER BY id DESC LIMIT 1`,
  ]);
  return { alert: alerts[0] ? { ...alerts[0].data, at: new Date(alerts[0].at).toISOString() } : null, lastCheck: runs[0] ? { ...runs[0].data, at: new Date(runs[0].at).toISOString() } : null, lastSuccess: successes[0] ? { ...successes[0].data, at: new Date(successes[0].at).toISOString() } : null };
}
export async function runBounceBrake(trigger: string, runId: string, provePausedAuth = false) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") throw new Error("Bounce brake requires production.");
  if (process.env.INSTANTLY_CAMPAIGN_ID !== GG_CAMPAIGN_ID) throw new Error("Bounce brake campaign configuration mismatch.");
  const key = "bounce-brake:" + GG_CAMPAIGN_ID, owner = await acquireLease(key, 120);
  if (!owner) return { ok: true, ran: false, reason: "Another bounce check is running." };
  const sql = database(); let alertId: number | undefined;
  try {
    // Under the lease: a retry cannot race a successful run or refresh its timestamp.
    if (!provePausedAuth) {
      if (runId) {
        const duplicate = await sql`SELECT data FROM gg_internal_audit WHERE kind=${RUN} AND data->>'campaign'=${GG_CAMPAIGN_ID} AND data->>'ok'='true' AND data->>'trigger'=${trigger} AND data->>'runId'=${runId} ORDER BY id DESC LIMIT 1`;
        if (duplicate[0]) return { ...duplicate[0].data, ran: false, reason: "Run already checked." };
      }
      const recent = await sql`SELECT recorded_at AS at FROM gg_internal_audit WHERE kind=${RUN} AND data->>'campaign'=${GG_CAMPAIGN_ID} AND data->>'ok'='true' AND recorded_at>now()-interval '60 seconds' ORDER BY id DESC LIMIT 1`;
      if (recent[0]) return { ok: true, ran: false, reason: "Checked within the last minute.", lastChecked: new Date(recent[0].at).toISOString() };
    }
    const result = await withInstantlyDeadline(async () => {
      const [overview, campaign] = await Promise.all([
        api("campaigns/analytics/overview", new URLSearchParams({ id: GG_CAMPAIGN_ID })),
        api(`campaigns/${GG_CAMPAIGN_ID}`),
      ]);
      if (typeof campaign.status !== "number") throw new Error("Campaign status is unavailable.");
      const counts = bounceCounts(overview.emails_sent_count, overview.bounced_count);
      let paused = false;
      let authProof = false;
      if (provePausedAuth) {
        if (campaign.status !== 2) throw new Error("Auth proof is allowed only on the already-paused campaign.");
        const kind = "gg-bounce-brake-auth-proof";
        const previous = await sql`SELECT data FROM gg_internal_audit WHERE kind=${kind} AND data->>'campaign'=${GG_CAMPAIGN_ID} ORDER BY id DESC LIMIT 1`;
        if (previous[0]) {
          if (previous[0].data.status !== "confirmed") throw new Error("Inspect the previous pause proof before retrying.");
          authProof = true;
        } else {
          const proof = await sql`INSERT INTO gg_internal_audit(kind,data) VALUES (${kind},${JSON.stringify({ campaign: GG_CAMPAIGN_ID, status: "requested" })}::jsonb) RETURNING id`;
          await api(`campaigns/${GG_CAMPAIGN_ID}/pause`, new URLSearchParams(), {});
          if ((await api(`campaigns/${GG_CAMPAIGN_ID}`)).status !== 2) throw new Error("Pause proof was not confirmed.");
          await sql`UPDATE gg_internal_audit SET data=data || '{"status":"confirmed"}'::jsonb WHERE id=${proof[0].id}`;
          authProof = true;
        }
      }
      if (counts.breach) {
        const last = await sql`SELECT data FROM gg_internal_audit WHERE kind=${ALERT} AND data->>'campaign'=${GG_CAMPAIGN_ID} ORDER BY id DESC LIMIT 1`;
        if (campaign.status === 2 && last[0]?.data.status === "paused" && last[0].data.sent === counts.sent && last[0].data.bounced === counts.bounced) paused = true;
        else {
          const data = { campaign: GG_CAMPAIGN_ID, ...counts, status: "pause-requested", trigger, runId };
          const rows = await sql`INSERT INTO gg_internal_audit(kind,data) VALUES (${ALERT},${JSON.stringify(data)}::jsonb) RETURNING id`;
          alertId = rows[0].id;
          if (campaign.status !== 2) {
            await api(`campaigns/${GG_CAMPAIGN_ID}/pause`, new URLSearchParams(), {});
            const after = await api(`campaigns/${GG_CAMPAIGN_ID}`);
            if (after.status !== 2) throw new Error("Campaign pause was not confirmed.");
          }
          await sql`UPDATE gg_internal_audit SET data=data || '{"status":"paused"}'::jsonb WHERE id=${alertId}`;
          paused = true;
        }
      }
      return { ok: true, ran: true, campaign: GG_CAMPAIGN_ID, campaignStatus: paused ? 2 : campaign.status, ...counts, paused, authProof, trigger, runId };
    });
    await sql`INSERT INTO gg_internal_audit(kind,data) VALUES (${RUN},${JSON.stringify(result)}::jsonb)`;
    console.info("GG bounce brake", JSON.stringify(result));
    return result;
  } catch (error) {
    if (alertId !== undefined) await sql`UPDATE gg_internal_audit SET data=data || '{"status":"pause-unconfirmed"}'::jsonb WHERE id=${alertId}`;
    await sql`INSERT INTO gg_internal_audit(kind,data) VALUES (${RUN},${JSON.stringify({ campaign: GG_CAMPAIGN_ID, ok: false, trigger, runId })}::jsonb)`;
    throw error;
  } finally { await releaseLease(key, owner); }
}
