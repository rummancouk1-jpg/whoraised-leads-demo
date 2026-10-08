import { ohqAuthorized } from "@/lib/server/ohq";
import { fetchEmailMetrics, fetchEmailSource } from "@/lib/server/instantly";
import { currentSyncHealth, runInstantlySync } from "@/lib/server/sync";
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
    const checks = reconcile(source as unknown as SourceView, live, sync.counts);
    return Response.json({ at: new Date().toISOString(), ok: checks.every(c => c.ok), sync_run: sync_run && { ran: sync_run.ran, ok: sync_run.ok, reason: sync_run.reason }, sync: { state: sync.state, lastOkAt: sync.lastOkAt, counts: sync.counts }, checks }, { headers });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error && /^(Instantly|Configured)/.test(e.message) ? e.message : "Reconciliation failed." }, { status: 502, headers });
  }
}
