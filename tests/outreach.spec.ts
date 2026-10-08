import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { CSV_COLUMNS, type Lead } from "../src/types/outreach";
import { audienceBand, contactType, DEFAULT_WEIGHTS, exportCsv, fitScore, generateDraft, groupResults, parseLeadsCsv, suggestedWeights, conversionPriority, leadTier } from "../src/lib/outreach";

// Synthetic QA-only records. Never loaded by the application or shipped as seed data.
const makeLead = (patch: Partial<Lead>): Lead => ({ name: "QA Earnings Creator", handle: "@qa-earnings", platform: "YouTube", kind: "creator", audience_size: 25000, niche: "earnings", us_focus: "yes", contact: "qa@example.com", tracked_slug: "qa-earnings", stage: "New", signups: 0, last_touch: "", notes: "QA fixture", ...patch });
const fixture = [
  makeLead({ stage: "Joined", signups: 12 }),
  makeLead({ name: "QA Options Community", handle: "@qa-options", platform: "Discord", kind: "community", niche: "options", tracked_slug: "qa-options" }),
  makeLead({ name: "QA Newsletter", handle: "@qa-news", platform: "Substack", kind: "newsletter", niche: "general investing", audience_size: 1500, us_focus: "unknown", contact: "https://substack.com/@qa-news", tracked_slug: "qa-news", stage: "Contacted" }),
  makeLead({ name: "QA Swing Trader", handle: "@qa-swing", platform: "X", niche: "swing", audience_size: 150000, us_focus: "mixed", tracked_slug: "qa-swing", stage: "Replied", signups: 3 }),
  makeLead({ name: "QA Day Trader", handle: "@qa-day", platform: "TikTok", niche: "day trading", audience_size: 5000, tracked_slug: "qa-day", stage: "Declined" }),
  makeLead({ name: "EXAMPLE QA Creator", handle: "@example-qa", tracked_slug: "example-qa", stage: "Joined", signups: 900 }),
];
const csv = exportCsv(fixture);
const notes = 'Follow up on Friday, after earnings.\nAsked about "daily picks".';
test("CSV, score, draft and compound loop contracts", () => {
  expect(parseLeadsCsv(csv)).toEqual(fixture);
  expect(parseLeadsCsv(fs.readFileSync("public/gg-outreach-template.csv", "utf8"))).toEqual([]);
  // The shipped example file was removed from public/ for the client (no test data in the client view); build equivalents inline.
  const examples = [1, 2, 3].map(n => makeLead({ name: `EXAMPLE Creator ${n}`, handle: `@example-${n}`, tracked_slug: `example-creator-${n}`, stage: "Joined", signups: 500 }));
  expect(examples).toHaveLength(3); expect(examples.every(l => l.name.startsWith("EXAMPLE"))).toBe(true);
  expect(groupResults(examples, l => l.platform)).toEqual([]);
  expect(fitScore(fixture[0]).score).toBe(100);
  expect(fitScore(makeLead({ audience_size: 4999 })).score).toBeLessThan(100);
  expect(fitScore(makeLead({ audience_size: 100001 })).score).toBeLessThan(100);
  for (const size of [5000, 100000]) expect(fitScore(makeLead({ audience_size: size })).score).toBe(100);
  expect(leadTier(makeLead({ audience_size: 999 }))).toBe("long-tail");
  expect(leadTier(makeLead({ audience_size: 0 }))).toBe("long-tail");
  expect(leadTier(makeLead({ audience_size: 1000 }))).toBe("priority");
  expect(leadTier(makeLead({ fit_evidence: "Indian and European index coverage" }))).toBe("long-tail");
  expect(audienceBand(5000)).toBe("5K–100K");
  expect(fitScore(makeLead({ niche: "general investing" })).score).toBeLessThan(fitScore(makeLead({ niche: "options" })).score);
  expect(fitScore(makeLead({ us_focus: "yes" })).score).toBeGreaterThan(fitScore(makeLead({ us_focus: "mixed" })).score);
  expect(fitScore(makeLead({ us_focus: "mixed" })).score).toBeGreaterThan(fitScore(makeLead({ us_focus: "unknown" })).score);
  expect(fitScore(makeLead({ contact: "https://x.com/qa" })).score).toBeLessThan(100);
  expect(contactType("")).toBe("missing");
  expect(generateDraft(fixture[0])).toBe("Hi QA Earnings Creator — we're running a free market-prediction tournament Oct 19–Nov 13. One daily pick, longest streak wins $1,000. Think your audience can beat you? We'd like to give you a creator entry and invite your community to compete against you: https://gg-tourney-hub.vercel.app/go/qa-earnings");
  const multiline = makeLead({ notes }); expect(parseLeadsCsv(exportCsv([multiline]))).toEqual([multiline]);
  expect(parseLeadsCsv("\uFEFF" + exportCsv([multiline]))).toEqual([multiline]);
  expect(() => parseLeadsCsv(csv.replace("audience_size", "audience"))).toThrow("Columns");
  expect(() => parseLeadsCsv(exportCsv([makeLead({ signups: -1 })]))).toThrow("signups");
  expect(() => parseLeadsCsv(exportCsv([makeLead({ audience_size: 2.5 })]))).toThrow("audience_size");
  expect(() => parseLeadsCsv(exportCsv([makeLead({ last_touch: "2026-02-30" })]))).toThrow("last_touch");
  expect(() => parseLeadsCsv(exportCsv([makeLead({ tracked_slug: "../bad" })]))).toThrow("tracked_slug");
  expect(() => parseLeadsCsv(exportCsv([makeLead({ contact: "javascript:alert(1)" })]))).toThrow("contact");
  expect(() => parseLeadsCsv(exportCsv([fixture[0], fixture[0]]))).toThrow("Duplicate");
  expect(() => parseLeadsCsv(CSV_COLUMNS.join(",") + '\n"unclosed')).toThrow("Unclosed");
  const results = groupResults(fixture, l => l.platform);
  expect(results.find(g => g.group === "YouTube")).toEqual({ group: "YouTube", leads: 1, touched: 1, joined: 1, signups: 12 });
  const suggestion = suggestedWeights(fixture)!;
  expect(suggestion.touched).toBe(4); expect(suggestion.signups).toBe(15);
  expect(Object.values(suggestion.weights).reduce((a, b) => a + b)).toBe(100);
  expect(suggestedWeights([fixture[0]])).toBeNull();
  expect(suggestedWeights(examples)).toBeNull();
  expect(suggestedWeights(fixture.map(l => ({ ...l, signups: 0 })))).toBeNull();
  expect(conversionPriority(fixture[0], fixture)).toBeGreaterThan(conversionPriority(fixture[2], fixture));
  const changed = fixture.map(l => l.tracked_slug === "qa-news" ? { ...l, signups: 100 } : l);
  expect(suggestedWeights(changed)?.weights).not.toEqual(suggestion.weights);
  expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b)).toBe(100);
});

