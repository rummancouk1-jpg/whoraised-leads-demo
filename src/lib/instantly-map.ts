import type { Lead } from "@/types/outreach";
import { isExample } from "./outreach";

type Rec = Record<string, unknown>;
export type MappedStats = { slug: string; email: string; sent: number; opened: number | null; replied: number; clicked: number | null; bounced: boolean; unsubscribed: boolean; interest: number | null; last_outbound_at: string | null; last_inbound_at: string | null; last_open_at: string | null; last_click_at: string | null };
export type MappedEvent = { ref: string; slug: string; kind: "sent" | "opened" | "replied" | "clicked" | "bounced"; at: string | null; n: number };
export type Mapped = { stats: MappedStats[]; events: MappedEvent[]; unmatchedLeads: number; unmatchedEmails: number };

const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
const maxKnown = (a: number | null, b: number | null) => a === null ? b : b === null ? a : Math.max(a,b);
const iso = (v: unknown) => { const n = typeof v === "string" || typeof v === "number" ? Date.parse(String(v)) : NaN; return Number.isFinite(n) ? new Date(n).toISOString() : null; };
const later = (a: string | null, b: string | null) => !a ? b : !b ? a : Date.parse(b) > Date.parse(a) ? b : a;
const norm = (v: unknown) => typeof v === "string" ? v.trim().toLowerCase() : "";

/** Real leads reachable by email, keyed by lowercase address (several rows can share an owner's address). */
export function leadsByEmail(leads: Lead[]) {
  const map = new Map<string, string[]>();
  for (const lead of leads) {
    if (isExample(lead)) continue;
    const email = norm(lead.contact);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    map.set(email, [...(map.get(email) ?? []), lead.tracked_slug]);
  }
  return map;
}

/**
 * Turn Instantly's lead rows (open/reply/click counters, bounce status) and campaign emails (every send and every
 * inbound reply, with its time) into per-lead stats and timeline events. Provider fields are read defensively: a
 * missing field means "unknown", never a number we made up. Bodies and subjects are deliberately not kept.
 */
export function mapInstantly(leads: Lead[], instantlyLeads: Rec[], emails: Rec[]): Mapped {
  const bySlugEmail = leadsByEmail(leads);
  const stats = new Map<string, MappedStats>();
  const events = new Map<string, MappedEvent>();
  let unmatchedLeads = 0, unmatchedEmails = 0;
  const ensure = (slug: string, email: string) => { let s = stats.get(slug); if (!s) { s = { slug, email, sent: 0, opened: null, replied: 0, clicked: null, bounced: false, unsubscribed: false, interest: null, last_outbound_at: null, last_inbound_at: null, last_open_at: null, last_click_at: null }; stats.set(slug, s); } return s; };
  for (const row of instantlyLeads) {
    const email = norm(row.email); const slugs = bySlugEmail.get(email);
    if (!slugs) { unmatchedLeads++; continue; }
    for (const slug of slugs) {
      const s = ensure(slug, email);
      s.opened = maxKnown(s.opened, count(row.email_open_count)); s.clicked = maxKnown(s.clicked, count(row.email_click_count));
      s.bounced ||= row.status === -1; s.unsubscribed ||= row.status === -2;
      s.interest = typeof row.lt_interest_status === "number" ? row.lt_interest_status : s.interest;
      s.last_open_at = later(s.last_open_at, iso(row.timestamp_last_open)); s.last_click_at = later(s.last_click_at, iso(row.timestamp_last_click));
      s.last_outbound_at = later(s.last_outbound_at, iso(row.timestamp_last_contact));
    }
  }
  const sentSeen = new Map<string, Set<string>>(), repliedSeen = new Map<string, Set<string>>();
  for (const row of emails) {
    const email = norm(row.lead);
    const slugs = bySlugEmail.get(email);
    if (!slugs) { unmatchedEmails++; continue; }
    const at = iso(row.timestamp_email) ?? iso(row.timestamp_created);
    const id = String(row.id ?? `${email}:${at}`);
    const type = row.ue_type;
    for (const slug of slugs) {
      const s = ensure(slug, email);
      if (type === 1 || type === 3) {
        // sent from the campaign (1) or by hand (3); scheduled (4) has not left yet
        (sentSeen.get(slug) ?? sentSeen.set(slug, new Set()).get(slug)!).add(id);
        s.last_outbound_at = later(s.last_outbound_at, at);
        events.set(`sent:${id}:${slug}`, { ref: `sent:${id}:${slug}`, slug, kind: "sent", at, n: 1 });
      } else if (type === 2 && ![true, 1, "1", "true"].includes(row.is_auto_reply as boolean | number | string)) {
        (repliedSeen.get(slug) ?? repliedSeen.set(slug, new Set()).get(slug)!).add(id);
        s.last_inbound_at = later(s.last_inbound_at, at);
        events.set(`replied:${id}:${slug}`, { ref: `replied:${id}:${slug}`, slug, kind: "replied", at, n: 1 });
      }
    }
  }
  for (const s of stats.values()) {
    s.sent = sentSeen.get(s.slug)?.size ?? 0;
    s.replied = repliedSeen.get(s.slug)?.size ?? 0;
    if (s.opened && s.last_open_at) events.set(`opened:${s.slug}:${s.last_open_at}`, { ref: `opened:${s.slug}:${s.last_open_at}`, slug: s.slug, kind: "opened", at: s.last_open_at, n: s.opened });
    if (s.clicked && s.last_click_at) events.set(`clicked:${s.slug}:${s.last_click_at}`, { ref: `clicked:${s.slug}:${s.last_click_at}`, slug: s.slug, kind: "clicked", at: s.last_click_at, n: s.clicked });
    if (s.bounced) events.set(`bounced:${s.slug}`, { ref: `bounced:${s.slug}`, slug: s.slug, kind: "bounced", at: s.last_outbound_at, n: 1 });
  }
  return { stats: [...stats.values()], events: [...events.values()], unmatchedLeads, unmatchedEmails };
}
