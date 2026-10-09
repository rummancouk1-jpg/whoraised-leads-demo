import "server-only";
import type { CampaignMetrics, EmailMetrics, SendDay } from "@/types/email";
import { isWorkspaceInbox } from "./email-scope";
import { takeBudget } from "./limits";
import { AsyncLocalStorage } from "node:async_hooks";
const requestSignal = new AsyncLocalStorage<AbortSignal>();
export function withInstantlyDeadline<T>(work: () => Promise<T>) { return requestSignal.run(AbortSignal.timeout(40000), work); }
export const etDay = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
type RecordValue = Record<string, unknown>;
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
export function records(value: unknown): RecordValue[] {
  if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object")) throw new Error("Instantly returned an unexpected response.");
  return value as RecordValue[];
}
export async function api(path: string, query = new URLSearchParams(), body?: unknown): Promise<RecordValue> {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("Instantly is not connected. Ask the workspace owner to connect it.");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!await takeBudget(path === "emails" ? "provider:emails" : "provider:other", path === "emails" ? 20 : 90, 60)) throw new Error("Instantly read budget reached. Pagination will continue on the next sync.");
    const outer = requestSignal.getStore();
    const signal = outer ? AbortSignal.any([outer, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000);
    const response = await fetch(`https://api.instantly.ai/api/v2/${path}?${query}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? { Authorization: `Bearer ${key}` } : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal });
    if (response.status === 429 && attempt < 2) {
      const retry = response.headers.get("retry-after");
      const delay = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Number(retry)*1000 : Date.parse(retry)-Date.now()) : 1000*2**attempt;
      if (!Number.isFinite(delay) || delay > 10000) throw new Error("Instantly is rate limited. Pagination will continue on the next sync.");
      await new Promise<void>((resolve, reject) => { const timer = setTimeout(done, Math.max(0,delay)); function done() { signal.removeEventListener("abort",abort); resolve(); } function abort() { clearTimeout(timer); signal.removeEventListener("abort",abort); reject(new Error("Instantly read timed out.")); } if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true}); });
      continue;
    }
    if (!response.ok) throw new Error(`Instantly read failed (HTTP ${response.status}). Check connection and availability.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new Error("Instantly returned an unexpected response.");
    return data as RecordValue;
  }
  throw new Error("Instantly read failed.");
}
export async function list(path: "accounts" | "campaigns") {
  const items: RecordValue[] = [];
  let cursor = "";
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("starting_after", cursor);
    const data = await api(path, query);
    items.push(...records(data.items));
    if (!data.next_starting_after) return items;
    if (data.next_starting_after === cursor) throw new Error("Instantly pagination did not advance.");
    if (typeof data.next_starting_after !== "string") throw new Error("Instantly returned an invalid cursor.");
    cursor = data.next_starting_after;
  }
  throw new Error("Instantly has too many pages to load safely.");
}
export async function fetchEmailMetrics(): Promise<EmailMetrics> {
  const now = new Date();
  const day = etDay(now);
  const [allAccounts, campaigns] = await Promise.all([list("accounts"), list("campaigns")]);
  const accounts = allAccounts.filter(a => isWorkspaceInbox(String(a.email)));
  const today: RecordValue[] = [];
  for (let i = 0; i < accounts.length; i += 200) {
    const query = new URLSearchParams({ start_date: day, end_date: day });
    for (const account of accounts.slice(i, i + 200)) query.append("emails", String(account.email));
    today.push(...records(await api("accounts/analytics/daily", query)));
  }
  const warmupLabels: Record<string, string> = { "0": "Paused", "1": "Active", "-1": "Banned", "-2": "Spam folder unknown", "-3": "Permanent suspension" };
  const inboxes = accounts.map(a => {
    const rows = today.filter(t => t.email_account === a.email && t.date === day);
    const sentToday = rows.length && rows.every(r => number(r.sent) !== null) ? rows.reduce((sum, r) => sum + (number(r.sent) ?? 0), 0) : null;
    return { email: String(a.email), warmup: warmupLabels[String(a.warmup_status)] ?? "Awaiting warmup status", health: number(a.stat_warmup_score), sentToday, dailyLimit: number(a.daily_limit) };
  });
  const configured = process.env.INSTANTLY_CAMPAIGN_ID;
  const matches = configured ? campaigns.filter(c => c.id === configured) : campaigns.filter(c => /gg outreach|gap gambler|earnings tournament/i.test(String(c.name)));
  let campaign: CampaignMetrics | null = null;
  let campaignMessage = "No campaign yet";
  let batches: SendDay[] = [];
  if (configured && !matches.length) throw new Error("Configured Instantly campaign was not found. Ask the workspace owner to select a campaign.");
  if (matches.length > 1) campaignMessage = "Multiple tournament campaigns found. Ask the workspace owner to select one.";
  if (matches.length === 1) {
    const selected = await api(`campaigns/${encodeURIComponent(String(matches[0].id))}`);
    const id = String(selected.id);
    const start = new Date(now); start.setUTCDate(start.getUTCDate() - 30);
    const [analytics, daily] = await Promise.all([
      api("campaigns/analytics", new URLSearchParams({ id })),
      api("campaigns/analytics/daily", new URLSearchParams({ campaign_id: id, start_date: start.toISOString().slice(0, 10), end_date: now.toISOString() })),
    ]);
    const row = records(analytics).find(r => r.campaign_id === id);
    if (!row) throw new Error("Instantly campaign analytics are unavailable.");
    {
      campaign = { id, status: typeof selected.status === "number" || typeof selected.status === "string" ? selected.status : undefined, name: String(row.campaign_name), sent: number(row.emails_sent_count), contacted: number(row.contacted_count), opened: number(row.open_count_unique ?? row.open_count), replied: number(row.reply_count_unique), bounced: number(row.bounced_count), unsubscribed: number(row.unsubscribed_count) };
      const schedule = selected.campaign_schedule;
      const startDate = schedule && typeof schedule === "object" ? (schedule as RecordValue).start_date : null;
      if (typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(startDate) && Number.isFinite(Date.parse(startDate))) campaign.startsOn = startDate.slice(0, 10);
      campaignMessage = "";
      batches = records(daily).map(r => ({ date: String(r.date), sent: number(r.sent), contacted: number(r.contacted), opened: number(r.unique_opened), replied: number(r.unique_replies) })).filter(r => r.sent !== null && r.sent > 0).sort((a,b) => b.date.localeCompare(a.date));
    }
  }
  return { fetchedAt: now.toISOString(), day, inboxes, campaign, campaignMessage, batches };
}

/** Read the original metric fields for reconciliation; never return provider credentials. */
export async function fetchEmailSource() {
  const day = etDay();
  const accounts = (await list("accounts")).filter(a => isWorkspaceInbox(String(a.email)));
  const query = new URLSearchParams({ start_date: day, end_date: day });
  for (const account of accounts) query.append("emails", String(account.email));
  const daily = accounts.length ? records(await api("accounts/analytics/daily", query)) : [];
  // Provider-side totals for the selected campaign, computed straight from the raw rows (no mapping to our leads), so the
  // per-lead sync can be reconciled against them: campaign analytics row, summed lead counters, email counts by type.
  let campaignRaw: unknown = null;
  try {
    const selected = await selectCampaignId();
    if (selected.id) {
      const [analytics, activity] = await Promise.all([api("campaigns/analytics", new URLSearchParams({ id: selected.id })), fetchCampaignActivity(selected.id)]);
      const row = records(analytics).find(r => r.campaign_id === selected.id) ?? null;
      const sum = (key: string) => activity.leads.reduce((n, l) => n + (number(l[key]) ?? 0), 0);
      const byType: Record<string, number> = {};
      for (const e of activity.emails) byType[String(e.ue_type)] = (byType[String(e.ue_type)] ?? 0) + 1;
      campaignRaw = { id: selected.id, analytics: row && { emails_sent_count: row.emails_sent_count, contacted_count: row.contacted_count, open_count_unique: row.open_count_unique, reply_count_unique: row.reply_count_unique, bounced_count: row.bounced_count }, leads: activity.leads.length, leadOpens: sum("email_open_count"), leadReplies: sum("email_reply_count"), leadClicks: sum("email_click_count"), leadsBounced: activity.leads.filter(l => l.status === -1).length, emailsByType: byType };
    } else campaignRaw = { id: null, message: selected.message };
  } catch (e) { campaignRaw = { error: e instanceof Error ? e.message.slice(0, 200) : "failed" }; }
  return {
    campaignRaw,
    fetchedAt: new Date().toISOString(), day, provider: "Instantly API v2",
    accounts: accounts.map(a => ({ email: a.email, warmup_status: a.warmup_status, stat_warmup_score: a.stat_warmup_score, daily_limit: a.daily_limit })),
    daily: daily.map(a => ({ email_account: a.email_account, date: a.date, sent: a.sent })),
  };
}

/** The one tournament campaign (explicit INSTANTLY_CAMPAIGN_ID, otherwise an unambiguous name match), or null. */
export async function selectCampaignId(): Promise<{ id: string | null; message: string }> {
  const configured = process.env.INSTANTLY_CAMPAIGN_ID;
  const campaigns = await list("campaigns");
  const matches = configured ? campaigns.filter(c => c.id === configured) : campaigns.filter(c => /gg outreach|gap gambler|earnings tournament/i.test(String(c.name)));
  if (configured && !matches.length) throw new Error("Configured Instantly campaign was not found. Ask the workspace owner to select a campaign.");
  if (matches.length > 1) return { id: null, message: "Multiple tournament campaigns found. Ask the workspace owner to select one." };
  return matches.length ? { id: String(matches[0].id), message: "" } : { id: null, message: "No campaign yet" };
}

/** Every lead row and every campaign email (sends and inbound replies). Bounded so a runaway cursor cannot loop. */
export type ActivityCheckpoint = { phase: "leads" | "emails" | "done"; cursor: string; seen: string[]; leads: RecordValue[]; emails: RecordValue[]; pages: number };
export async function fetchCampaignActivity(campaignId: string, resume?: ActivityCheckpoint, save?: (state: ActivityCheckpoint) => Promise<void>) {
  const state: ActivityCheckpoint = resume ?? { phase: "leads", cursor: "", seen: [], leads: [], emails: [], pages: 0 };
  let loaded = 0;
  const keep = (row: RecordValue) => Object.fromEntries(Object.entries(row).filter(([key]) => ["id","email","status","lt_interest_status","email_open_count","email_click_count","timestamp_last_open","timestamp_last_click","timestamp_last_contact","lead","campaign_id","ue_type","is_auto_reply","timestamp_email","timestamp_created","thread_id"].includes(key)));
  while (state.phase !== "done") {
    if (++loaded > (save ? 12 : 1000)) throw new Error("Instantly pagination is incomplete. Previous complete data is retained; the next sync continues it.");
    if (state.pages >= 10000) throw new Error("Instantly pagination exceeded the safety limit. Review the campaign before retrying.");
    const isLead = state.phase === "leads";
    // Read the workspace Unibox, then include this campaign and manual outbound for its lead addresses.
    // campaign_id alone excludes manually sent answers with a null campaign ID.
    const query = new URLSearchParams({ limit: "100", sort_order: "asc" });
    if (state.cursor) query.set("starting_after", state.cursor);
    const data = isLead ? await api("leads/list", new URLSearchParams(), { campaign: campaignId, limit: 100, ...(state.cursor ? { starting_after: state.cursor } : {}) }) : await api("emails", query);
    const rows = records(data.items);
    const addresses = new Set(state.leads.map(l => String(l.email).toLowerCase()));
    const selected = isLead ? rows : rows.filter(r => r.campaign_id === campaignId || r.campaign_id == null && addresses.has(String(r.lead).toLowerCase()));
    const next = data.next_starting_after;
    if (next && (typeof next !== "string" || next === state.cursor || state.seen.includes(next))) throw new Error("Instantly pagination did not advance. Previous complete data is retained.");
    (isLead ? state.leads : state.emails).push(...selected.map(keep)); state.pages++;
    if (next) { state.cursor = next as string; state.seen.push(state.cursor); }
    else { state.phase = isLead ? "emails" : "done"; state.cursor = ""; state.seen = []; }
    if (save) await save(state);
  }
  return { leads: state.leads, emails: state.emails };
}

/**
 * Checked on every sync, before any campaign exists: the per-lead data needs `leads:read` and `emails:read` on top of the
 * account and campaign scopes the Email page uses. Without this a missing scope would only show up on launch day.
 * (leads/list is a POST only because its filters are complex; it reads and changes nothing.)
 */
export async function assertLeadScopes() {
  const failed: string[] = [];
  const attempt = async (scope: string, work: () => Promise<unknown>) => { try { await work(); } catch (e) { if (/HTTP (401|403)/.test(String((e as Error).message))) failed.push(scope); else throw e; } };
  await attempt("leads:read", () => api("leads/list", new URLSearchParams(), { limit: 1 }));
  await attempt("emails:read", () => api("emails", new URLSearchParams({ limit: "1" })));
  if (failed.length) throw new Error(`Instantly key is missing the ${failed.join(" and ")} scope${failed.length > 1 ? "s" : ""}. Add ${failed.length > 1 ? "them" : "it"} to the API key so per-lead activity can sync.`);
}
