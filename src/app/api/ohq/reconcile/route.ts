import { ohqAuthorized } from "@/lib/server/ohq";
import { fetchEmailMetrics, fetchEmailSource } from "@/lib/server/instantly";
import { currentSyncHealth, runInstantlySync } from "@/lib/server/sync";
import { api, records } from "@/lib/server/instantly";
import { reconcile, type SourceView } from "@/lib/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
/**
 * On-demand reconciliation (not part of the 3-second Watch poll): the raw Instantly read against the model the UI renders
 * and what the per-lead sync stored. Bearer-only, counts-only (inboxes are numbered, never named).
 */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!ohqAuthorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    // ?sync=1 runs the real per-lead sync first, so the stored totals being compared are from this moment.
    const sync_run = new URL(request.url).searchParams.get("sync") === "1" ? await runInstantlySync("manual") : null;
    const [source, live, sync] = await Promise.all([fetchEmailSource(), fetchEmailMetrics(), currentSyncHealth()]);
    // Field-name contract with the provider: does a real lead / email row carry every field the mapper reads? (keys only, no values)
    const sample = async (path: string, wanted: string[], body?: unknown, query = new URLSearchParams({ limit: "5" })) => {
      const rows = records((await api(path, query, body)).items);
      const present = wanted.filter(k => rows.some(r => k in r));
      return { rows: rows.length, present, missing: wanted.filter(k => !present.includes(k)) };
    };
    const shape = {
      leads: await sample("leads/list", ["email", "status", "email_open_count", "email_reply_count", "email_click_count", "timestamp_last_open", "timestamp_last_reply", "timestamp_last_contact", "timestamp_last_click", "lt_interest_status"], { limit: 5 }, new URLSearchParams()),
      emails: await sample("emails", ["id", "lead", "ue_type", "timestamp_email", "is_auto_reply", "campaign_id"]),
    };
    const checks = reconcile(source as unknown as SourceView, live, sync.counts);
    return Response.json({ at: new Date().toISOString(), ok: checks.every(c => c.ok), sync_run: sync_run && { ran: sync_run.ran, ok: sync_run.ok, reason: sync_run.reason }, sync: { state: sync.state, lastOkAt: sync.lastOkAt, counts: sync.counts }, checks, shape }, { headers });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error && /^(Instantly|Configured)/.test(e.message) ? e.message : "Reconciliation failed." }, { status: 502, headers });
  }
}
