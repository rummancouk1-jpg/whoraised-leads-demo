import { test, expect } from "@playwright/test";
import { buildStatusLine } from "../src/lib/status-line";
import { exactTime, parseTime, relativeTime, shortDay } from "../src/lib/time";
import type { EmailMetrics } from "../src/types/email";
import { firstPicksCloseLabel, TOURNAMENT } from "../src/config/tournament";

const inbox = (warmup: string) => ({ email: "a@example.com", warmup, health: 100, sentToday: null, dailyLimit: 30 });
const snap = (patch: Partial<EmailMetrics> = {}): EmailMetrics => ({ fetchedAt: `${TOURNAMENT.startsOn}T00:00:00Z`, day: TOURNAMENT.startsOn, inboxes: Array.from({ length: 8 }, () => inbox("Active")), campaign: null, campaignMessage: "No campaign yet", batches: [], ...patch });
const base = { leadsLoading: false, leadsFailed: false, queued: 52, total: 52, email: "ready" as const };
const campaign = (status: number | string) => ({ id: "c", name: "GG", status, sent: null, sentToday: null, contacted: null, opened: null, replied: null, bounced: null, unsubscribed: null });

test("status line: tournament deadline and health copy come from live config and metrics", () => {
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(0) }) }).text).toBe(`52 creators & communities queued · Sending inboxes · 100% average health · Pre-launch · ${firstPicksCloseLabel()}`);
  expect(buildStatusLine({ ...base, queued: 3, snapshot: snap({ campaign: campaign(0), inboxes: [inbox("Active")] }) }).text).toBe(`3 creators & communities queued · Sending inboxes · 100% average health · Pre-launch · ${firstPicksCloseLabel()}`);
});
test("status line: missing campaign and finished campaign remain explicit", () => {
  expect(buildStatusLine({ ...base, snapshot: snap() }).rest?.[1]).toContain("Pre-launch");
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(3) }) }).rest?.[1]).toBe("tournament complete");
});
test("status line: campaign states and honest failures", () => {
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: { ...campaign(1), sentToday: 12, bounced: 2 } }) })).toMatchObject({ tone: "ok", rest: ["Sending inboxes · 100% average health", "Campaign live · 12 sent today · 2 bounced"] });
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(2) }) })).toMatchObject({ tone: "warn", rest: ["Sending inboxes · 100% average health", "campaign paused"] });
  const brake = { alert: { at: "", sent: 60, bounced: 4, rate: 4/60, status: "paused" as const }, lastCheck: null, lastSuccess: null };
  expect(buildStatusLine({ ...base, brake, snapshot: snap({ campaign: campaign(2) }) }).rest?.[1]).toBe("Campaign paused by bounce brake — 4 of 60 bounced");
  expect(buildStatusLine({ ...base, snapshot: snap({ inboxes: [inbox("Paused")] }) }).rest?.[0]).toBe("Sending inboxes · 100% average health");
  expect(buildStatusLine({ ...base, snapshot: snap({ inboxes: [] }) }).rest?.[0]).toBe("no sending inboxes connected");
  expect(buildStatusLine({ ...base, email: "unavailable", snapshot: null })).toMatchObject({ tone: "warn", rest: ["couldn't read inbox status"] });
  expect(buildStatusLine({ ...base, email: "loading", snapshot: null })).toMatchObject({ main: "52 creators & communities queued", rest: null, text: null });
  expect(buildStatusLine({ ...base, leadsLoading: true, snapshot: snap() }).main).toBeNull();
  expect(buildStatusLine({ ...base, leadsFailed: true, queued: 0, total: 0, snapshot: snap() }).main).toBe("Can't load the lead list");
  expect(buildStatusLine({ ...base, queued: 0, snapshot: snap() }).main).toBe("Nothing queued");
  expect(buildStatusLine({ ...base, queued: 0, total: 0, snapshot: snap() }).main).toBe("No leads imported yet");
  expect(buildStatusLine({ ...base, queued: 1, snapshot: snap() }).main).toBe("1 creator or community queued");
});

const now = new Date(2026, 9, 8, 12, 0, 0).getTime();
test("relative time: instants, calendar days and fallbacks", () => {
  expect(relativeTime(now - 10_000, now)).toBe("just now");
  expect(relativeTime(now - 4 * 60_000, now)).toBe("4 minutes ago");
  expect(relativeTime(now - 3 * 3_600_000, now)).toBe("3 hours ago");
  expect(relativeTime(now - 26 * 3_600_000, now)).toBe("yesterday");
  expect(relativeTime(now + 3 * 86_400_000, now)).toBe("in 3 days");
  expect(relativeTime("2026-10-08", now)).toBe("today");
  expect(relativeTime("2026-10-07", now)).toBe("yesterday");
  expect(relativeTime("2026-10-02", now)).toBe("6 days ago");
  expect(relativeTime("2026-09-01", now)).toBe("5 weeks ago");
  expect(relativeTime("2026-08-01", now)).toBe("Aug 1, 2026");
  expect(relativeTime("2025-01-05", now)).toBe("Jan 5, 2025");
  expect(relativeTime(null, now)).toBe("—");
  expect(relativeTime("not a date", now)).toBe("—");
  expect(parseTime("2026-02-30")?.date.getMonth()).toBe(2); // rolls over; CSV validation rejects such dates upstream
});
test("exact time is unambiguous; send dates never shift with the viewer's time zone", () => {
  expect(exactTime("2026-10-05")).toBe("Mon, Oct 5, 2026");
  expect(exactTime("2026-10-08T00:37:02.286Z")).toMatch(/Oct 7, 2026|Oct 8, 2026/);
  expect(exactTime("2026-10-08T00:37:02.286Z")).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  expect(shortDay(TOURNAMENT.startsOn)).toBeTruthy();
  expect(shortDay(TOURNAMENT.endsOn)).toBeTruthy();
});
