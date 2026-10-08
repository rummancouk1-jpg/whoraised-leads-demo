import type { EmailMetrics } from "@/types/email";

type Rec = Record<string, unknown>;
export type SourceView = {
  day: string;
  accounts: Rec[];
  daily: Rec[];
  campaignRaw: Rec | null;
};
export type SyncCounts = Record<string, number | string> | null;
export type Check = { label: string; ok: boolean; provider?: unknown; app?: unknown };

const WARMUP: Record<string, string> = { "0": "Paused", "1": "Active", "-1": "Banned", "-2": "Spam folder unknown", "-3": "Permanent suspension" };
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Provider source vs what the app serves. `source` is the raw Instantly read (no mapping); `live` is the model the UI
 * renders; `stored` is what the last per-lead sync saved. Counts only: inboxes are numbered, never named.
 */
export function reconcile(source: SourceView, live: EmailMetrics, stored: SyncCounts): Check[] {
  const checks: Check[] = [];
  checks.push({ label: "inbox count: provider = app", ok: source.accounts.length === live.inboxes.length, provider: source.accounts.length, app: live.inboxes.length });
  const rows = source.accounts.map((a, i) => {
    const ui = live.inboxes.find(x => x.email === a.email);
    const daily = source.daily.filter(d => d.email_account === a.email && d.date === source.day);
    const sent = daily.length && daily.every(d => num(d.sent) !== null) ? daily.reduce((n, d) => n + (num(d.sent) ?? 0), 0) : null;
    const provider = { warmup: WARMUP[String(a.warmup_status)] ?? "Awaiting warmup status", score: num(a.stat_warmup_score), limit: num(a.daily_limit), sentToday: sent };
    const app = ui && { warmup: ui.warmup, score: ui.health, limit: ui.dailyLimit, sentToday: ui.sentToday };
    return { inbox: i + 1, provider, app, match: !!ui && JSON.stringify(provider) === JSON.stringify(app) };
  });
  checks.push({ label: `inbox figures (warmup, health, daily limit, sent today) agree for all ${rows.length}`, ok: rows.every(r => r.match), provider: rows.map(r => r.provider), app: rows.map(r => r.app) });
  const raw = source.campaignRaw as (Rec & { analytics?: Rec | null; emailsByType?: Record<string, number> }) | null;
  if (!raw || raw.error) { checks.push({ label: "campaign read from the provider", ok: false, provider: raw?.error ?? "not read" }); return checks; }
  if (!raw.id) { checks.push({ label: "no tournament campaign exists yet: app shows none and the sync stored nothing", ok: !live.campaign && (!stored || Number(stored.matched) === 0), provider: raw.message, app: { campaign: live.campaign?.name ?? null, matched: stored?.matched ?? null } }); return checks; }
  const a = raw.analytics ?? {};
  const app = live.campaign && { sent: live.campaign.sent, opened: live.campaign.opened, replied: live.campaign.replied, bounced: live.campaign.bounced };
  const provider = { sent: num(a.emails_sent_count), opened: num(a.open_count_unique), replied: num(a.reply_count_unique), bounced: num(a.bounced_count) };
  checks.push({ label: "campaign totals (sent, opened, replied, bounced): provider analytics = app", ok: JSON.stringify(provider) === JSON.stringify(app), provider, app });
  const sentEmails = (raw.emailsByType?.["1"] ?? 0) + (raw.emailsByType?.["3"] ?? 0);
  checks.push({ label: "per-lead sync: stored sent total = sent emails read from the provider (for leads in this list)", ok: !!stored && Number(stored.sent) <= sentEmails, provider: { sentEmails, leads: raw.leads, leadOpens: raw.leadOpens, leadReplies: raw.leadReplies, bounced: raw.leadsBounced }, app: stored });
  return checks;
}
