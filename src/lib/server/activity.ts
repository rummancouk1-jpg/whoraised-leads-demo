import "server-only";
import { database, initializeDatabase } from "./db";
import { getLeads } from "./leads";
import { currentSyncHealth } from "./sync";
import { recentErrors } from "./errors";
import { buildQueue, buildTimeline, type ActivityResponse, type Attribution, type LeadStats, type TimelineStep } from "@/lib/activity";
import { isExample } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";

const iso = (v: unknown) => v ? new Date(v as string).toISOString() : null;

export async function loadStats(): Promise<Record<string, LeadStats>> {
  await initializeDatabase();
  const rows = await database()`SELECT slug,email,sent,opened,replied,clicked,bounced,unsubscribed,interest,last_outbound_at,last_inbound_at,last_open_at,last_click_at,synced_at FROM gg_lead_stats`;
  return Object.fromEntries(rows.map(r => [r.slug, { slug: r.slug, email: r.email, sent: r.sent, opened: r.opened, replied: r.replied, clicked: r.clicked, bounced: r.bounced, unsubscribed: r.unsubscribed, interest: r.interest, lastOutboundAt: iso(r.last_outbound_at), lastInboundAt: iso(r.last_inbound_at), lastOpenAt: iso(r.last_open_at), lastClickAt: iso(r.last_click_at), syncedAt: iso(r.synced_at)! } satisfies LeadStats]));
}

/**
 * Attribution is "live" once the signup link is live: an explicit PREREG_LIVE_AT date has passed, or a real signup has
 * already been reported. Until then the answer is a message, never a table of zeros.
 */
export async function loadAttribution(leads: Lead[]): Promise<Attribution> {
  await initializeDatabase();
  const sql = database();
  const configured = process.env.PREREG_LIVE_AT ? Date.parse(process.env.PREREG_LIVE_AT) : NaN;
  const since = Number.isFinite(configured) ? new Date(configured).toISOString() : null;
  const [signups, clickRows] = await Promise.all([
    sql`SELECT slug, count(*)::int AS n, max(signed_up_at) AS last_at, min(signed_up_at) AS first_at FROM gg_signups WHERE NOT is_test GROUP BY slug`,
    sql`SELECT slug, count(*)::int AS n FROM gg_clicks WHERE NOT is_test AND NOT is_example AND (${since}::timestamptz IS NULL OR clicked_at >= ${since}::timestamptz) GROUP BY slug`,
  ]);
  const live = (Number.isFinite(configured) && configured <= Date.now()) || signups.length > 0;
  if (!live) return { live: false, since: null, rows: [], clicks: 0, signups: 0, lastSignupAt: null };
  const real = leads.filter(l => !isExample(l));
  const bySlugSignups = new Map(signups.map(r => [r.slug as string, r.n as number]));
  const byClicks = new Map(clickRows.map(r => [r.slug as string, r.n as number]));
  const rows = real.map(l => ({ slug: l.tracked_slug, name: l.name, clicks: byClicks.get(l.tracked_slug) ?? 0, signups: bySlugSignups.get(l.tracked_slug) ?? 0 })).filter(r => r.clicks || r.signups).sort((a, b) => b.signups - a.signups || b.clicks - a.clicks || a.name.localeCompare(b.name));
  const lastSignup = signups.reduce<string | null>((best, r) => { const t = iso(r.last_at); return t && (!best || t > best) ? t : best; }, null);
  return { live: true, since, rows, clicks: rows.reduce((n, r) => n + r.clicks, 0), signups: rows.reduce((n, r) => n + r.signups, 0), lastSignupAt: lastSignup };
}

export async function getActivity(known?: Lead[]): Promise<ActivityResponse> {
  const leads = known ?? await getLeads();
  const [stats, sync, attribution, errors] = await Promise.all([loadStats(), currentSyncHealth(), loadAttribution(leads), recentErrors(24)]);
  return { generatedAt: new Date().toISOString(), sync, queue: buildQueue(leads, stats), stats, attribution, errors24h: errors.reduce((n, e) => n + e.count, 0) };
}

export async function leadTimeline(slug: string): Promise<{ steps: TimelineStep[]; syncedAt: string | null }> {
  await initializeDatabase();
  const sql = database();
  const [stats, clicks, signups] = await Promise.all([
    loadStats(),
    sql`SELECT count(*)::int AS n, max(clicked_at) AS last_at FROM gg_clicks WHERE slug=${slug} AND NOT is_test AND NOT is_example`,
    sql`SELECT count(*)::int AS n, max(signed_up_at) AS last_at FROM gg_signups WHERE slug=${slug} AND NOT is_test`,
  ]);
  const lead = (await getLeads()).find(l => l.tracked_slug === slug);
  const attributed = signups[0].n > 0;
  const signupCount = attributed ? signups[0].n : lead?.signups ?? 0;
  const s = stats[slug];
  return { steps: buildTimeline(s, { count: clicks[0].n, lastAt: iso(clicks[0].last_at) }, { count: signupCount, lastAt: iso(signups[0].last_at), attributed }), syncedAt: s?.syncedAt ?? null };
}
