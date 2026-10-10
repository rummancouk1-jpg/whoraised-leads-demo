import { test, expect } from "@playwright/test";
import { publicSlug, trackedLink } from "../src/lib/public-links";
import { generateDraft } from "../src/lib/outreach";
import type { Lead } from "../src/types/outreach";

test("outreach links use the canonical origin and clean alias while leaving stored IDs intact", () => {
  const lead = { name: "Bulls on Wall Street", tracked_slug: "preclient-bullsonwallstreet" } as Lead;
  const base = "https://gg-tourney-hub.vercel.app";
  expect(trackedLink(lead.tracked_slug, base)).toBe(base + "/go/bullsonwallstreet");
  expect(generateDraft(lead, base)).toContain(base + "/go/bullsonwallstreet");
  expect(generateDraft(lead, base)).not.toContain("preclient-");
  expect(lead.tracked_slug).toBe("preclient-bullsonwallstreet");
  expect(publicSlug("already-clean")).toBe("already-clean");
});
