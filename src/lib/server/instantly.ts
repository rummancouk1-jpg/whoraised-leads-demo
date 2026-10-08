import "server-only";
import type { CampaignMetrics, EmailMetrics, SendDay } from "@/types/email";
import { isWorkspaceInbox } from "./email-scope";
type RecordValue = Record<string, unknown>;
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
function records(value: unknown): RecordValue[] {
  if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object")) throw new Error("Instantly returned an unexpected response.");
  return value as RecordValue[];
}
async function api(path: string, query = new URLSearchParams()) {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("Instantly is not connected. Add INSTANTLY_API_KEY to the server environment.");
  const response = await fetch(`https://api.instantly.ai/api/v2/${path}?${query}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Instantly read failed (HTTP ${response.status}). Check API key read scopes, plan and availability.`);
  return response.json();
}
async function list(path: "accounts" | "campaigns") {
  const items: RecordValue[] = [];
  let cursor = "";
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("starting_after", cursor);
    const data = await api(path, query);
    items.push(...records(data.items));
    if (!data.next_starting_after) return items;
    if (data.next_starting_after === cursor) throw new Error("Instantly pagination did not advance.");
    cursor = data.next_starting_after;
  }
  throw new Error("Instantly has too many pages to load safely.");
}
export async function fetchEmailMetrics(): Promise<EmailMetrics> {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
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
  if (configured && !matches.length) throw new Error("Configured Instantly campaign was not found. Check INSTANTLY_CAMPAIGN_ID.");
  if (matches.length > 1) campaignMessage = "Multiple tournament campaigns found. Set INSTANTLY_CAMPAIGN_ID to select one.";
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
      const startDate = selected.campaign_schedule?.start_date;
      if (typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(startDate) && Number.isFinite(Date.parse(startDate))) campaign.startsOn = startDate.slice(0, 10);
      campaignMessage = "";
      batches = records(daily).map(r => ({ date: String(r.date), sent: number(r.sent), contacted: number(r.contacted), opened: number(r.unique_opened), replied: number(r.unique_replies) })).filter(r => r.sent !== null && r.sent > 0).sort((a,b) => b.date.localeCompare(a.date));
    }
  }
  return { fetchedAt: now.toISOString(), day, inboxes, campaign, campaignMessage, batches };
}

/** Read the original metric fields for reconciliation; never return provider credentials. */
export async function fetchEmailSource() {
  const day = new Date().toISOString().slice(0, 10);
  const accounts = (await list("accounts")).filter(a => isWorkspaceInbox(String(a.email)));
  const query = new URLSearchParams({ start_date: day, end_date: day });
  for (const account of accounts) query.append("emails", String(account.email));
  const daily = accounts.length ? records(await api("accounts/analytics/daily", query)) : [];
  return {
    fetchedAt: new Date().toISOString(), day, provider: "Instantly API v2",
    accounts: accounts.map(a => ({ email: a.email, warmup_status: a.warmup_status, stat_warmup_score: a.stat_warmup_score, daily_limit: a.daily_limit })),
    daily: daily.map(a => ({ email_account: a.email_account, date: a.date, sent: a.sent })),
  };
}
