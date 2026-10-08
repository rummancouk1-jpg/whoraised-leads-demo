import config from "@/config/fit-weights.json";
import { isTestClick } from "./click-tracking";
import { AUDIT_COLUMNS, LEGACY_AUDIT_COLUMNS, BASE_CSV_COLUMNS, CSV_COLUMNS, CONTACT_TYPES, GROUP_NAMES, KINDS, NICHES, PLATFORMS, STAGES, US_FOCUS, type Lead, type Weights } from "@/types/outreach";
export const leadGroup = (lead: Lead) => GROUP_NAMES[lead.kind];

/** Reversible display tier; never persisted into workflow fields. */
export function leadTier(lead: Lead): "priority" | "long-tail" {
  return !Number.isFinite(lead.audience_size) || config.tiers.unknownReachValues.includes(lead.audience_size) || lead.audience_size < config.tiers.priorityMinimumReach || config.tiers.nonUsFitPatterns.some(pattern => new RegExp(pattern, "i").test(lead.fit_evidence ?? "")) ? "long-tail" : "priority";
}

export const DEFAULT_WEIGHTS: Weights = config.weights;
export const isExample = (lead: Lead) => /\bEXAMPLE\b/i.test(lead.name) || isTestClick(lead.tracked_slug);
export function audienceBand(size: number) { return size < 5000 ? "Under 5K" : size <= 100000 ? "5K–100K" : "Over 100K"; }
export function contactType(contact: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? "email" : /^https?:\/\//i.test(contact) ? "dm" : "missing"; }
export function fitFactors(lead: Lead): Weights {
  return {
    audience: lead.audience_size < 5000 ? config.audience.under5k : lead.audience_size <= 100000 ? config.audience["5kTo100k"] : config.audience.over100k,
    niche: config.niche[lead.niche], us_focus: config.us_focus[lead.us_focus], contact: config.contact[contactType(lead.contact)],
  };
}
export function fitScore(lead: Lead, weights: Weights = DEFAULT_WEIGHTS) {
  const factors = fitFactors(lead);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const labels = { audience: `${audienceBand(lead.audience_size)} audience`, niche: `${lead.niche} niche`, us_focus: `U.S. focus: ${lead.us_focus}`, contact: contactType(lead.contact) === "email" ? "Direct email" : contactType(lead.contact) === "dm" ? "DM URL only" : "No contact supplied" };
  const reasons = (Object.keys(weights) as (keyof Weights)[]).map(key => ({ label: labels[key], points: total ? Math.round(factors[key] * weights[key] / total * 1000) / 10 : 0, maximum: total ? Math.round(weights[key] / total * 1000) / 10 : 0 }));
  return { score: Math.max(0, Math.min(100, Math.round(reasons.reduce((sum, r) => sum + r.points, 0)))), reasons };
}
export function generateDraft(lead: Lead, origin = "https://gg-tourney-hub.vercel.app") {
  return `Hi ${lead.name} — we're running a free market-prediction tournament Oct 19–Nov 13. One daily pick, longest streak wins $1,000. Think your audience can beat you? We'd like to give you a creator entry and invite your community to compete against you: ${origin}/go/${encodeURIComponent(lead.tracked_slug)}`;
}
export function groupResults(leads: Lead[], groupBy: (lead: Lead) => string) {
  const groups = new Map<string, { group: string; leads: number; touched: number; joined: number; signups: number }>();
  for (const lead of leads.filter(l => !isExample(l))) {
    const group = groupBy(lead);
    const row = groups.get(group) ?? { group, leads: 0, touched: 0, joined: 0, signups: 0 };
    row.leads++; row.touched += Number(lead.stage !== "New"); row.joined += Number(lead.stage === "Joined"); row.signups += lead.signups;
    groups.set(group, row);
  }
  return [...groups.values()].sort((a, b) => b.signups - a.signups || a.group.localeCompare(b.group));
}
/** Smoothed signups per touched lead; examples and uncontacted leads never train weights. */
export function suggestedWeights(leads: Lead[]) {
  const touched = leads.filter(l => !isExample(l) && l.stage !== "New");
  const totalSignups = touched.reduce((n, l) => n + l.signups, 0);
  if (touched.length < config.learning.minimumTouchedLeads || totalSignups === 0) return null;
  const baseline = totalSignups / touched.length;
  const keys = Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[];
  const groupers = { audience: (l: Lead) => audienceBand(l.audience_size), niche: (l: Lead) => l.niche, us_focus: (l: Lead) => l.us_focus, contact: (l: Lead) => contactType(l.contact) };
  const signals = keys.map(key => {
    const groups = groupResults(touched, groupers[key]);
    const best = Math.max(...groups.map(g => (g.signups + config.learning.priorLeads * baseline) / (g.touched + config.learning.priorLeads)));
    return { key, value: DEFAULT_WEIGHTS[key] * Math.min(2, Math.max(0.5, best / baseline)), groups };
  });
  const total = signals.reduce((n, s) => n + s.value, 0);
  const weights = Object.fromEntries(signals.map(s => [s.key, Math.floor(s.value / total * 100)])) as Weights;
  // Deterministically allocate rounding remainder so weights total exactly 100.
  let remainder = 100 - Object.values(weights).reduce((a, b) => a + b, 0);
  for (const { key } of [...signals].sort((a, b) => (b.value / total * 100 % 1) - (a.value / total * 100 % 1))) {
    if (remainder-- > 0) weights[key]++;
  }
  return { weights, touched: touched.length, signups: totalSignups, signals };
}
export function conversionPriority(lead: Lead, leads: Lead[]) {
  const touched = leads.filter(l => !isExample(l) && l.stage !== "New");
  if (!touched.length) return 0;
  const baseline = touched.reduce((n, l) => n + l.signups, 0) / touched.length;
  return [(l: Lead) => l.platform, (l: Lead) => l.niche, (l: Lead) => audienceBand(l.audience_size)].reduce((sum, groupBy) => {
    const group = touched.filter(l => groupBy(l) === groupBy(lead));
    return sum + (group.reduce((n, l) => n + l.signups, 0) + config.learning.priorLeads * baseline) / (group.length + config.learning.priorLeads);
  }, 0) / 3;
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false; let endedQuote = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; endedQuote = true; } }
      else value += ch;
    } else if (ch === '"') {
      if (value || endedQuote) throw new Error("Unexpected quote in CSV field.");
      quoted = true;
    } else if (ch === ",") { row.push(value); value = ""; endedQuote = false; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(value); if (row.some(v => v.length)) rows.push(row);
      row = []; value = ""; endedQuote = false;
    } else { if (endedQuote) throw new Error("Unexpected text after closing CSV quote."); value += ch; }
  }
  if (quoted) throw new Error("Unclosed quote in CSV.");
  row.push(value); if (row.some(v => v.length)) rows.push(row);
  return rows;
}
function member(value: string, values: readonly string[], field: string) {
  if (!values.includes(value)) throw new Error(`${field} must be one of: ${values.join(" / ")}.`);
}
export function parseLeadsCsv(text: string): Lead[] {
  const [header, ...rows] = parseCsvRows(text);
  if (!header || ![CSV_COLUMNS.join(","), CSV_COLUMNS.slice(0, -1).join(","), BASE_CSV_COLUMNS.join(","), [...BASE_CSV_COLUMNS, ...LEGACY_AUDIT_COLUMNS].join(",")].includes(header.join(","))) throw new Error("Columns must match the template exactly, in the same order.");
  const seen = new Set<string>();
  return rows.map((row, index) => {
    try {
      if (row.length !== header.length) throw new Error(`Expected ${header.length} columns, found ${row.length}.`);
      const raw = Object.fromEntries(header.map((key, i) => [key, key === "notes" ? row[i] : row[i].trim()]));
      if (!raw.name || !raw.handle) throw new Error("name and handle are required.");
      member(raw.platform, PLATFORMS, "platform"); member(raw.kind, KINDS, "kind"); member(raw.niche, NICHES, "niche"); member(raw.us_focus, US_FOCUS, "us_focus"); member(raw.stage, STAGES, "stage");
      for (const key of ["audience_size", "signups"]) if (!/^\d+$/.test(raw[key]) || !Number.isSafeInteger(Number(raw[key]))) throw new Error(`${key} must be a nonnegative whole number.`);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.tracked_slug)) throw new Error("tracked_slug must contain lowercase letters, numbers and single hyphens.");
      if (seen.has(raw.tracked_slug)) throw new Error("Duplicate tracked_slug in CSV."); seen.add(raw.tracked_slug);
      if (raw.contact && contactType(raw.contact) === "missing") throw new Error("contact must be an email or an http(s) DM URL, or blank.");
      if (contactType(raw.contact) === "dm") { const url = new URL(raw.contact); if (!url.hostname || url.username || url.password) throw new Error("Use a valid DM URL without credentials."); }
      if (raw.last_touch && (!/^\d{4}-\d{2}-\d{2}$/.test(raw.last_touch) || !Number.isFinite(Date.parse(raw.last_touch)) || new Date(raw.last_touch).toISOString().slice(0, 10) !== raw.last_touch)) throw new Error("last_touch must be a valid YYYY-MM-DD date or blank.");
      for (const key of AUDIT_COLUMNS) if (!raw[key]) delete raw[key];
      if (raw.source_url_live) member(raw.source_url_live, ["y", "n"], "source_url_live");
      if (raw.contact_type) member(raw.contact_type, CONTACT_TYPES, "contact_type");
      if (raw.covers_earnings) member(raw.covers_earnings, ["y", "n"], "covers_earnings");
      if (raw.priority_score && !Number.isFinite(Number(raw.priority_score))) throw new Error("priority_score must be numeric.");
      if (raw.us_trader_fit) member(raw.us_trader_fit, ["strong", "partial", "weak"], "us_trader_fit");
      if (raw.contact_source_url && contactType(raw.contact_source_url) !== "dm") throw new Error("contact_source_url must be an http(s) URL.");
      if (raw.verified_at && !Number.isFinite(Date.parse(raw.verified_at))) throw new Error("verified_at must be an ISO date.");
      return { ...raw, audience_size: Number(raw.audience_size), signups: Number(raw.signups), ...(raw.priority_score ? { priority_score: Number(raw.priority_score) } : {}) } as unknown as Lead;
    } catch (error) { throw new Error(`Row ${index + 2}: ${(error as Error).message}`); }
  });
}
export function exportCsv(leads: Lead[]) {
  const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
  return CSV_COLUMNS.join(",") + "\r\n" + leads.map(l => CSV_COLUMNS.map(key => quote(l[key] ?? "")).join(",")).join("\r\n");
}
export function downloadCsv(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
