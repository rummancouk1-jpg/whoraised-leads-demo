import { test, expect } from "@playwright/test";
import { shouldPauseCampaign, bounceCounts, hardBounceCounts, brakeIsStale, pausedBrakeAlert, brakePauseCopy } from "../src/lib/bounce-brake";
test("sample-aware brake retains old rate boundaries with the new 100-send minimum", () => {
  expect(shouldPauseCampaign(49, 0.031)).toBe(false);
  expect(shouldPauseCampaign(49, 0.5)).toBe(true); // Six-count override now applies below the former minimum.
  expect(shouldPauseCampaign(50, 0.03)).toBe(false);
  expect(shouldPauseCampaign(50, 0.031)).toBe(false);
  expect(shouldPauseCampaign(99, 0.031)).toBe(false);
  expect(shouldPauseCampaign(100, 0.03)).toBe(false);
  expect(shouldPauseCampaign(100, 0.031)).toBe(true);
  expect(shouldPauseCampaign(0, 0)).toBe(false);
  expect(bounceCounts(100, 3).breach).toBe(false);
  expect(bounceCounts(100, 4).breach).toBe(true);
});
test("six hard bounces trip at any sample size, including below 3%", () => {
  for (const sent of [6, 49, 59, 99, 100, 200, 1000]) expect(bounceCounts(sent, 6).breach).toBe(true);
  for (const [sent, bounced] of [[59, 2], [59, 1], [99, 5], [200, 5]]) expect(bounceCounts(sent, bounced).breach).toBe(false);
});
test("hard-only metrics exclude soft, temporary and unknown bounces", () => {
  expect(hardBounceCounts(59, {total:2,hard:1,soft:1,unknown:0})).toMatchObject({bounced:1,rate:1/59,breach:false,softBounced:1,bounceBasis:"hard"});
  expect(hardBounceCounts(100, {total:12,hard:0,soft:6,unknown:6}).breach).toBe(false);
  for (const summary of [null, {}, {total:2,hard:1,soft:0,unknown:0}, {total:2,hard:"1",soft:1,unknown:0}, {total:1,hard:-1,soft:2,unknown:0}]) expect(() => hardBounceCounts(59, summary)).toThrow();
});
test("historical pause copy is preserved and does not label combined counts as hard", () => {
  const alert = {at:"2026-10-12T18:00:00Z",sent:59,bounced:2,rate:2/59,status:"paused" as const};
  const brake = {alert,lastCheck:null,lastSuccess:{at:alert.at,ok:true,campaignStatus:2}};
  expect(brakePauseCopy(alert)).toBe("Campaign paused by bounce brake — 2 of 59 bounced");
  expect(brakePauseCopy({...alert,bounceBasis:"hard"})).toContain("2 of 59 hard bounced");
  expect(pausedBrakeAlert(brake, 2)).toBe(alert);
  expect(pausedBrakeAlert(brake, undefined)).toBe(alert);
  expect(pausedBrakeAlert(brake, 1)).toBeNull();
  expect(pausedBrakeAlert({...brake,alert:{...alert,status:"pause-unconfirmed"}},2)).toBeNull();
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
