import type { Lead } from "@/types/outreach";
import { isExample } from "./outreach";

/** How long a contacted lead can stay quiet before a follow-up is due. */
export const FOLLOW_UP_DAYS = 5;
/** Instantly is read on this cadence; a sync older than STALE_AFTER_MIN is called out on screen. */
export const SYNC_INTERVAL_MIN = 15;
export const STALE_AFTER_MIN = 40;

/** Per-lead engagement as last read from Instantly (timestamps are ISO strings or null). */
export type LeadStats = {
  slug: string; email: string;
  sent: number; opened: number | null; replied: number; clicked: number | null;
  bounced: boolean; unsubscribed: boolean; interest: number | null;
  lastOutboundAt: string | null; lastInboundAt: string | null; lastOpenAt: string | null; lastClickAt: string | null;
  syncedAt: string;
};
export type SyncRun = { startedAt: string; finishedAt: string | null; ok: boolean | null; error: string | null; trigger: string; counts: Record<string, number | string> | null };
export type SyncHealth = {
  /** never: nothing has run · ok: last run succeeded and is recent · stale: last success is old · failing: the latest run failed */
  state: "never" | "ok" | "stale" | "failing";
  lastOkAt: string | null; lastAttemptAt: string | null; lastError: string | null; failedSince: string | null; consecutiveFailures: number;
  /** What the last good run saw, e.g. matched leads. */
  counts: Record<string, number | string> | null;
};
export type QueueKind = "reply" | "bounce" | "followup";
export type QueueItem = { slug: string; name: string; kind: QueueKind; reason: string; since: string; days: number };
export type AttributionRow = { slug: string; name: string; clicks: number; signups: number };
export type Attribution = { live: boolean; since: string | null; rows: AttributionRow[]; clicks: number; signups: number; lastSignupAt: string | null };
export type TimelineStep = { key: "sent" | "opened" | "replied" | "clicked" | "signed_up"; label: string; done: boolean; at: string | null; detail: string };
export type TimelineEvent = { ref: string; kind: string; at: string; n: number };
export type ActivityResponse = {
  generatedAt: string;
  sync: SyncHealth;
  queue: QueueItem[];
  stats: Record<string, LeadStats>;
  attribution: Attribution;
  errors24h: number;
};

const DAY = 86_400_000;
const ms = (value: string | null | undefined) => { const n = value ? Date.parse(value) : NaN; return Number.isFinite(n) ? n : null; };
const latest = (...values: (string | null | undefined)[]) => values.reduce<number | null>((best, v) => { const n = ms(v); return n !== null && (best === null || n > best) ? n : best; }, null);

/**
 * "Needs action today": replies nobody has answered, bounces to fix, follow-ups that are due.
 * Everything derives from the lead record plus what Instantly reported; a lead with no Instantly data can still
 * need a follow-up (a DM or form contact) based on its own last touch.
 */
export function buildQueue(leads: Lead[], stats: Record<string, LeadStats>, now = Date.now()): QueueItem[] {
  const items: QueueItem[] = [];
  for (const lead of leads) {
    if (isExample(lead) || lead.stage === "Declined" || lead.stage === "Joined") continue;
    const s = stats[lead.tracked_slug];
    const touched = ms(lead.last_touch);
    const inbound = ms(s?.lastInboundAt), outbound = ms(s?.lastOutboundAt);
    if (s && inbound !== null && (outbound === null || inbound > outbound) && (touched === null || touched < inbound)) {
      items.push({ slug: lead.tracked_slug, name: lead.name, kind: "reply", reason: "Replied and waiting for your answer", since: new Date(inbound).toISOString(), days: Math.floor((now - inbound) / DAY) });
      continue;
    }
    if (s?.bounced) { items.push({ slug: lead.tracked_slug, name: lead.name, kind: "bounce", reason: "Email bounced — find another contact", since: s.lastOutboundAt ?? s.syncedAt, days: Math.floor((now - (ms(s.lastOutboundAt) ?? ms(s.syncedAt) ?? now)) / DAY) }); continue; }
    if (lead.stage === "Contacted" && !s?.replied && !s?.unsubscribed) {
      const reference = latest(s?.lastOutboundAt, lead.last_touch);
      if (reference !== null && now - reference >= FOLLOW_UP_DAYS * DAY) {
        const days = Math.floor((now - reference) / DAY);
        items.push({ slug: lead.tracked_slug, name: lead.name, kind: "followup", reason: `No reply in ${days} days`, since: new Date(reference).toISOString(), days });
      }
    }
  }
  const order: Record<QueueKind, number> = { reply: 0, bounce: 1, followup: 2 };
  return items.sort((a, b) => order[a.kind] - order[b.kind] || b.days - a.days || a.name.localeCompare(b.name));
}

/** The five steps of one lead's journey, each either reached (with a time and detail) or still ahead. */
export function buildTimeline(stats: LeadStats | undefined, linkClicks: { count: number; lastAt: string | null }, signups: { count: number; lastAt: string | null; attributed: boolean; live?: boolean }): TimelineStep[] {
  const s = stats;
  const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
  return [
    { key: "sent", label: "Sent", done: !!s && s.sent > 0, at: s?.lastOutboundAt ?? null, detail: s && s.sent ? plural(s.sent, "email") + " sent" : s ? "Not sent yet" : "Not in Instantly yet" },
    { key: "opened", label: "Opened", done: !!s && (s.opened ?? 0) > 0, at: s?.lastOpenAt ?? null, detail: s?.opened == null ? "Open count not reported" : s.opened ? plural(s.opened, "open") : "No opens yet" },
    { key: "replied", label: "Replied", done: !!s && s.replied > 0, at: s?.lastInboundAt ?? null, detail: s && s.replied ? `${s.replied.toLocaleString()} ${s.replied === 1 ? "reply" : "replies"}` : "No reply yet" },
    { key: "clicked", label: "Clicked", done: linkClicks.count > 0 || !!s && (s.clicked ?? 0) > 0, at: linkClicks.lastAt ?? s?.lastClickAt ?? null, detail: linkClicks.count ? plural(linkClicks.count, "visit") + " to the creator link" : s && s.clicked ? plural(s.clicked, "link click") + " in email" : s?.clicked == null ? "Email clicks not reported; no creator link visits" : "No link visits yet" },
    { key: "signed_up", label: "Signed up", done: signups.count > 0, at: signups.lastAt, detail: signups.count ? `${plural(signups.count, "signup")}${signups.attributed ? "" : " (entered by hand)"}` : signups.live ? "No verified signups yet" : "Attribution starts when the signup link is live" },
  ];
}

/** Sync health from recent run rows (newest first). */
export function syncHealth(runs: SyncRun[], now = Date.now()): SyncHealth {
  const finished = runs.filter(r => r.ok !== null);
  const lastOk = finished.find(r => r.ok === true);
  const latestRun = finished[0];
  let consecutiveFailures = 0;
  for (const r of finished) { if (r.ok === false) consecutiveFailures++; else break; }
  const failedSince = consecutiveFailures ? finished[consecutiveFailures - 1].startedAt : null;
  const okAt = lastOk?.finishedAt ?? lastOk?.startedAt ?? null;
  let state: SyncHealth["state"] = "never";
  if (latestRun) state = latestRun.ok === false ? "failing" : (ms(okAt) !== null && now - ms(okAt)! > STALE_AFTER_MIN * 60_000 ? "stale" : "ok");
  return { state, lastOkAt: okAt, lastAttemptAt: latestRun?.finishedAt ?? latestRun?.startedAt ?? null, lastError: latestRun?.ok === false ? latestRun.error : null, failedSince, consecutiveFailures, counts: lastOk?.counts ?? null };
}

/** Plain-language line for the sync indicator. Always says what was last read, never just a colour. */
export function syncLabel(health: SyncHealth): string {
  if (health.state === "never") return "Not synced yet";
  if (health.state === "failing") return "Sync failing";
  if (health.state === "stale") return "Sync is behind";
  return "Synced";
}
