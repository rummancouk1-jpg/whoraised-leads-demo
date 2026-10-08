import "server-only";
import { database, initializeDatabase } from "./db";
import { getLeads } from "./leads";
import { latestSnapshot } from "./snapshots";
import { loadAttribution, loadStats } from "./activity";
import { currentSyncHealth } from "./sync";
import { buildQueue } from "@/lib/activity";
import { buildStatusLine } from "@/lib/status-line";
import { isExample } from "@/lib/outreach";
import { nextMondayNineET, renderDigest, type DigestModel, type DigestSendState } from "@/lib/digest";

const DAY = 86_400_000;

export async function buildDigest(now = new Date()): Promise<DigestModel> {
  const leads = (await getLeads()).filter(l => !isExample(l));
  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  await initializeDatabase();
  const [stats, snapshot, attribution, sync, weekClicks] = await Promise.all([
    loadStats(), latestSnapshot().catch(() => null), loadAttribution(leads), currentSyncHealth(),
    database()`SELECT slug, count(*)::int AS n FROM gg_clicks WHERE NOT is_test AND NOT is_example AND clicked_at >= ${since}::timestamptz GROUP BY slug`,
  ]);
  const queue = buildQueue(leads, stats, now.getTime());
  const line = buildStatusLine({ leadsLoading: false, leadsFailed: false, queued: leads.filter(l => l.stage === "New").length, total: leads.length, email: snapshot ? "ready" : "unavailable", snapshot });
  const campaign = snapshot?.campaign;
  const num = (v: number | null | undefined) => v == null ? "—" : v.toLocaleString();
  const clicksByLead = new Map(weekClicks.map(r => [r.slug as string, r.n as number]));
  // Only leads still on the list: click history for a removed slug is kept in the database but is not reported.
  const visits = leads.reduce((n, l) => n + (clicksByLead.get(l.tracked_slug) ?? 0), 0);
  const attributed = new Map(attribution.rows.map(r => [r.slug, r.signups]));
  const topCreators = leads
    .map(l => ({ name: l.name, platform: l.platform, clicks: clicksByLead.get(l.tracked_slug) ?? 0, signups: attribution.live ? attributed.get(l.tracked_slug) ?? 0 : null }))
    .filter(c => c.clicks > 0).sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name)).slice(0, 5);
  const replies = Object.values(stats)
    .filter(s => s.lastInboundAt && s.lastInboundAt >= since)
    .map(s => ({ name: leads.find(l => l.tracked_slug === s.slug)?.name ?? "", at: s.lastInboundAt!, waiting: queue.some(q => q.slug === s.slug && q.kind === "reply") }))
    .filter(r => r.name).sort((a, b) => b.at.localeCompare(a.at));
  const sent = campaign?.sent ?? null;
  return {
    generatedAt: now.toISOString(), weekStart: since, weekEnd: now.toISOString(),
    subject: `GG Outreach weekly — ${line.text ?? "status"}`.slice(0, 150),
    status: line.text ?? "Campaign status is not available yet.",
    numbers: [
      { label: "Emails sent", value: num(sent), note: sent === null ? "Awaiting campaign data" : "campaign total" },
      { label: "Opened", value: num(campaign?.opened), note: sent && campaign?.opened != null ? `${Math.round(100 * campaign.opened / sent)}% of sent` : "after sending starts" },
      { label: "Replied", value: num(campaign?.replied), note: `${replies.length} reply thread${replies.length === 1 ? "" : "s"} this week` },
      { label: "Bounced", value: num(campaign?.bounced), note: "campaign total" },
      { label: "Link visits (7 days)", value: visits.toLocaleString(), note: "creator links, real visits only" },
      { label: "Signups from creators", value: attribution.live ? attribution.signups.toLocaleString() : "—", note: attribution.live ? "attributed to a creator link" : "starts when the signup link is live" },
    ],
    topCreators, topNote: "No creator link visits yet this week.", replies,
    needs: { replies: queue.filter(q => q.kind === "reply").length, bounces: queue.filter(q => q.kind === "bounce").length, followups: queue.filter(q => q.kind === "followup").length },
    freshness: `Instantly figures from ${snapshot ? new Date(snapshot.fetchedAt).toUTCString() : "no snapshot yet"}; lead activity last synced ${sync.lastOkAt ? new Date(sync.lastOkAt).toUTCString() : "never"}.`,
  };
}

export async function digestState(): Promise<DigestSendState> {
  await initializeDatabase();
  const missing = ["RESEND_API_KEY", "DIGEST_FROM", "DIGEST_RECIPIENTS"].filter(k => !process.env[k]?.trim());
  const rows = await database()`SELECT kind, max(recorded_at) AS at FROM gg_internal_audit WHERE kind IN ('digest-sent','digest-skipped') GROUP BY kind`;
  const at = (kind: string) => { const r = rows.find(x => x.kind === kind); return r?.at ? new Date(r.at).toISOString() : null; };
  return { enabled: process.env.DIGEST_SEND_ENABLED === "true", ready: !missing.length, missing, recipients: (process.env.DIGEST_RECIPIENTS ?? "").split(",").filter(s => s.trim()).length, nextSendAt: nextMondayNineET(), lastSentAt: at("digest-sent"), lastSkipped: at("digest-skipped") };
}

/** Sends only when DIGEST_SEND_ENABLED=true and the mail settings exist; otherwise it records that it was skipped. */
export async function sendDigest(): Promise<{ sent: boolean; reason?: string }> {
  await initializeDatabase();
  const state = await digestState();
  if (!state.enabled) {
    await database()`INSERT INTO gg_internal_audit(kind,data) VALUES ('digest-skipped',${JSON.stringify({ reason: "sending is off" })}::jsonb)`;
    return { sent: false, reason: "Sending is off." };
  }
  if (!state.ready) return { sent: false, reason: `Missing ${state.missing.join(", ")}.` };
  // Once per week however many triggers land in the window (Vercel's cron, the GitHub schedule, a retry).
  if (state.lastSentAt && Date.now() - Date.parse(state.lastSentAt) < 5 * DAY) return { sent: false, reason: "Already sent this week." };
  const model = await buildDigest();
  const { html, text } = renderDigest(model);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.DIGEST_FROM, to: process.env.DIGEST_RECIPIENTS!.split(",").map(s => s.trim()).filter(Boolean), subject: model.subject, html, text }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Digest mail failed (HTTP ${response.status}).`);
  await database()`INSERT INTO gg_internal_audit(kind,data) VALUES ('digest-sent',${JSON.stringify({ recipients: state.recipients })}::jsonb)`;
  return { sent: true };
}
