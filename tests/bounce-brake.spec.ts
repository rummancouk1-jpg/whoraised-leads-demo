import { test, expect } from "@playwright/test";
import { shouldPauseCampaign, bounceCounts, brakeIsStale } from "../src/lib/bounce-brake";
test("bounce brake uses an inclusive 50-send minimum and strict 3% rate", () => {
  expect(shouldPauseCampaign(49, 0.5)).toBe(false);
  expect(shouldPauseCampaign(50, 0.03)).toBe(false);
  expect(shouldPauseCampaign(50, 0.031)).toBe(true);
  expect(shouldPauseCampaign(0, 0)).toBe(false);
  expect(bounceCounts(100, 3).breach).toBe(false);
  expect(bounceCounts(100, 4).breach).toBe(true);
});
test("unknown, impossible and malformed provider counts are never treated as zero", () => {
  for (const [sent, bounced] of [[null, 0], [50, undefined], [0, 1], [-1, 0], [50, 1.55], [Infinity, 0]]) expect(() => bounceCounts(sent, bounced)).toThrow();
});
test("staleness is strictly older than 30 minutes; missing or invalid success is stale", () => {
  const now = Date.parse("2026-10-12T07:00:00Z");
  expect(brakeIsStale({ at: "2026-10-12T06:30:00Z", ok: true }, now)).toBe(false);
  expect(brakeIsStale({ at: "2026-10-12T06:29:59Z", ok: true }, now)).toBe(true);
  expect(brakeIsStale(null, now)).toBe(true);
  expect(brakeIsStale({ at: "invalid", ok: true }, now)).toBe(true);
});
