import { test, expect } from "@playwright/test";
import { buildStatusLine } from "../src/lib/status-line";
import { exactTime, parseTime, relativeTime, shortDay } from "../src/lib/time";
import type { EmailMetrics } from "../src/types/email";

const inbox = (warmup: string) => ({ email: "a@example.com", warmup, health: 100, sentToday: null, dailyLimit: 30 });
const snap = (patch: Partial<EmailMetrics> = {}): EmailMetrics => ({ fetchedAt: "2026-10-08T00:00:00Z", day: "2026-10-08", inboxes: Array.from({ length: 8 }, () => inbox("Active")), campaign: null, campaignMessage: "No campaign yet", batches: [], ...patch });
const base = { leadsLoading: false, leadsFailed: false, queued: 52, total: 52, email: "ready" as const };
const campaign = (status: number | string, startsOn?: string) => ({ id: "c", name: "GG", status, startsOn, sent: null, contacted: null, opened: null, replied: null, bounced: null, unsubscribed: null });

test("status line: counts and send date come from data, never hard-coded", () => {
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(0, "2026-10-19") }) }).text).toBe("52 creators & communities queued · 8 inboxes warming · sending starts Oct 19");
  expect(buildStatusLine({ ...base, queued: 3, snapshot: snap({ campaign: campaign(0, "2026-11-02"), inboxes: [inbox("Active")] }) }).text).toBe("3 creators & communities queued · 1 inbox warming · sending starts Nov 2");
});
test("status line: no send date says the signup link is not live yet", () => {
  expect(buildStatusLine({ ...base, snapshot: snap() }).text).toBe("52 creators & communities queued · 8 inboxes warming · sending starts once the signup link is live");
  // A start date already in the past on a draft campaign is not a promise either.
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(0, "2026-09-01") }) }).rest?.at(-1)).toBe("sending starts once the signup link is live");
});
test("status line: campaign states and honest failures", () => {
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(1, "2026-10-01") }) })).toMatchObject({ tone: "ok", rest: ["8 inboxes warming", "sending now"] });
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(2) }) })).toMatchObject({ tone: "warn", rest: ["8 inboxes warming", "campaign paused"] });
  expect(buildStatusLine({ ...base, snapshot: snap({ campaign: campaign(3) }) }).rest?.[1]).toBe("campaign completed");
  expect(buildStatusLine({ ...base, snapshot: snap({ inboxes: [inbox("Paused")] }) }).rest?.[0]).toBe("no inboxes warming");
  expect(buildStatusLine({ ...base, snapshot: snap({ inboxes: [] }) }).rest?.[0]).toBe("no inboxes connected");
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
  expect(shortDay("2026-10-19")).toBe("Oct 19");
  expect(shortDay("2026-11-02")).toBe("Nov 2");
});
