import { test, expect } from "@playwright/test";
import type { Lead } from "../src/types/outreach";
import { buildQueue, buildTimeline, syncHealth, type LeadStats, type SyncRun } from "../src/lib/activity";
import { mapInstantly } from "../src/lib/instantly-map";
import { isSendWindow, nextMondayNineET, renderDigest, type DigestModel } from "../src/lib/digest";
import { fingerprintOf, routeOf, scrub } from "../src/lib/error-scrub";

// Synthetic QA-only records. Never loaded by the application and never written to the shared database.
const NOW = Date.parse("2026-10-20T15:00:00Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const lead = (patch: Partial<Lead>): Lead => ({ name: "Creator", handle: "@c", platform: "YouTube", kind: "creator", audience_size: 20000, niche: "earnings", us_focus: "yes", contact: "c@creator.com", tracked_slug: "creator", stage: "Contacted", signups: 0, last_touch: "", notes: "", ...patch });
const stats = (patch: Partial<LeadStats>): LeadStats => ({ slug: "creator", email: "c@creator.com", sent: 1, opened: 0, replied: 0, clicked: 0, bounced: false, unsubscribed: false, interest: null, lastOutboundAt: day(6), lastInboundAt: null, lastOpenAt: null, lastClickAt: null, syncedAt: day(0), ...patch });

test("queue: replies first, then bounces, then follow-ups; answered and closed leads drop out", () => {
  const leads = [
    lead({ name: "Waiting", tracked_slug: "waiting", contact: "w@x.com" }),
    lead({ name: "Answered", tracked_slug: "answered", contact: "a@x.com", last_touch: day(0).slice(0, 10) }),
    lead({ name: "Bounced", tracked_slug: "bounced", contact: "b@x.com" }),
    lead({ name: "Quiet", tracked_slug: "quiet", contact: "q@x.com", last_touch: day(8).slice(0, 10) }),
    lead({ name: "Recent", tracked_slug: "recent", contact: "r@x.com", last_touch: day(2).slice(0, 10) }),
    lead({ name: "Done", tracked_slug: "done", contact: "d@x.com", stage: "Joined" }),
    lead({ name: "No", tracked_slug: "no", contact: "n@x.com", stage: "Declined" }),
    lead({ name: "DM only", tracked_slug: "dm", contact: "https://x.com/dm", last_touch: day(7).slice(0, 10) }),
    lead({ name: "EXAMPLE Fixture", tracked_slug: "example-fixture", contact: "e@x.com" }),
  ];
  const s: Record<string, LeadStats> = {
    waiting: stats({ slug: "waiting", replied: 1, lastInboundAt: day(1), lastOutboundAt: day(4) }),
    answered: stats({ slug: "answered", replied: 1, lastInboundAt: day(1), lastOutboundAt: day(4) }),
    bounced: stats({ slug: "bounced", bounced: true }),
    quiet: stats({ slug: "quiet", lastOutboundAt: day(9) }),
    recent: stats({ slug: "recent", lastOutboundAt: day(2) }),
    done: stats({ slug: "done", replied: 1, lastInboundAt: day(1) }),
    "example-fixture": stats({ slug: "example-fixture", replied: 1, lastInboundAt: day(1) }),
  };
  const q = buildQueue(leads, s, NOW);
  expect(q.map(i => `${i.kind}:${i.slug}`)).toEqual(["reply:waiting", "bounce:bounced", "followup:quiet", "followup:dm"]);
  expect(q[0].days).toBe(1);
  expect(buildQueue(leads, {}, NOW).map(i => i.slug)).toEqual(["quiet", "dm"]);
  expect(buildQueue([], s, NOW)).toEqual([]);
});

test("timeline: five steps, reached only when the data says so; no signup claims without data", () => {
  const none = buildTimeline(undefined, { count: 0, lastAt: null }, { count: 0, lastAt: null, attributed: false });
  expect(none.map(t => t.key)).toEqual(["sent", "opened", "replied", "clicked", "signed_up"]);
  expect(none.every(t => !t.done)).toBe(true);
  expect(none[0].detail).toBe("Not in Instantly yet");
  expect(none[4].detail).toBe("Attribution starts when the signup link is live");
  const full = buildTimeline(stats({ sent: 2, opened: 3, replied: 1, lastInboundAt: day(1), lastOpenAt: day(2) }), { count: 4, lastAt: day(1) }, { count: 1, lastAt: day(0), attributed: true });
  expect(full.every(t => t.done)).toBe(true);
  expect(full[1].detail).toBe("3 opens"); expect(full[2].detail).toBe("1 reply"); expect(full[3].detail).toContain("4 visits");
  expect(buildTimeline(stats({}), { count: 0, lastAt: null }, { count: 2, lastAt: null, attributed: false })[4].detail).toContain("entered by hand");
});

test("sync health: failing, stale and healthy are distinguished and failures are counted", () => {
  const run = (minutesAgo: number, ok: boolean | null, error: string | null = null): SyncRun => ({ startedAt: new Date(NOW - minutesAgo * 60000).toISOString(), finishedAt: ok === null ? null : new Date(NOW - minutesAgo * 60000 + 2000).toISOString(), ok, error, trigger: "cron", counts: ok ? { matched: 3 } : null });
  expect(syncHealth([], NOW).state).toBe("never");
  expect(syncHealth([run(5, true), run(20, true)], NOW).state).toBe("ok");
  expect(syncHealth([run(60, true)], NOW).state).toBe("stale");
  const failing = syncHealth([run(5, false, "Instantly read failed (HTTP 401)."), run(20, false, "x"), run(35, true)], NOW);
  expect(failing.state).toBe("failing"); expect(failing.consecutiveFailures).toBe(2); expect(failing.lastError).toContain("401"); expect(failing.counts).toEqual({ matched: 3 });
  expect(syncHealth([run(1, null), run(20, true)], NOW).state).toBe("ok");
});

test("Instantly mapping: counts, bounce, reply time and send events; unknown emails never attach", () => {
  const leads = [lead({ tracked_slug: "a", contact: "A@Creator.com" }), lead({ tracked_slug: "b", contact: "b@creator.com" }), lead({ name: "EXAMPLE", tracked_slug: "example-z", contact: "z@creator.com" })];
  const remote = [
    { email: "a@creator.com", status: 1, email_open_count: 3, email_reply_count: 1, email_click_count: 0, timestamp_last_open: "2026-10-20T10:00:00Z", timestamp_last_reply: "2026-10-20T11:00:00Z" },
    { email: "b@creator.com", status: -1, email_open_count: 0 },
    { email: "stranger@else.com", status: 1 }, { email: "z@creator.com", status: 1 },
  ];
  const emails = [
    { id: "1", lead: "a@creator.com", ue_type: 1, timestamp_email: "2026-10-18T09:00:00Z" },
    { id: "2", lead: "a@creator.com", ue_type: 2, timestamp_email: "2026-10-20T11:00:00Z", is_auto_reply: false },
    { id: "3", lead: "a@creator.com", ue_type: 2, timestamp_email: "2026-10-20T12:00:00Z", is_auto_reply: true },
    { id: "4", lead: "a@creator.com", ue_type: 4, timestamp_email: "2026-10-25T09:00:00Z" },
    { id: "5", lead: "nobody@else.com", ue_type: 1, timestamp_email: "2026-10-18T09:00:00Z" },
  ];
  const m = mapInstantly(leads, remote, emails);
  const a = m.stats.find(s => s.slug === "a")!, b = m.stats.find(s => s.slug === "b")!;
  expect(a).toMatchObject({ sent: 1, opened: 3, replied: 1, bounced: false, last_outbound_at: "2026-10-18T09:00:00.000Z", last_inbound_at: "2026-10-20T11:00:00.000Z" });
  expect(b.bounced).toBe(true);
  expect(m.stats.some(s => s.slug === "example-z")).toBe(false);
  expect(m.unmatchedLeads).toBe(2); expect(m.unmatchedEmails).toBe(1);
  expect(m.events.map(e => e.kind).sort()).toEqual(["bounced", "opened", "replied", "sent"]);
  expect(mapInstantly(leads, [], []).stats).toEqual([]);
});

test("digest: next send is Monday 9am New York in both DST regimes; the send window is Monday morning", () => {
  expect(nextMondayNineET(new Date("2026-10-08T12:00:00Z"))).toBe("2026-10-12T13:00:00.000Z");
  expect(nextMondayNineET(new Date("2026-11-02T14:30:00Z"))).toBe("2026-11-09T14:00:00.000Z");
  // Monday 09:00-11:59 New York counts, in both DST regimes; the evening, other weekdays and 08:xx do not.
  expect(isSendWindow(new Date("2026-10-12T13:00:00Z"))).toBe(true);   // 09:00 EDT
  expect(isSendWindow(new Date("2026-10-12T14:59:00Z"))).toBe(true);   // 10:59 EDT
  expect(isSendWindow(new Date("2026-10-12T16:00:00Z"))).toBe(false);  // 12:00 EDT
  expect(isSendWindow(new Date("2026-11-09T14:00:00Z"))).toBe(true);   // 09:00 EST
  expect(isSendWindow(new Date("2026-11-09T13:00:00Z"))).toBe(false);  // 08:00 EST
  expect(isSendWindow(new Date("2026-10-13T13:00:00Z"))).toBe(false);  // Tuesday
});

test("digest render escapes content and states unknowns honestly", () => {
  const model: DigestModel = { generatedAt: "2026-10-12T13:00:00Z", weekStart: "2026-10-05T13:00:00Z", weekEnd: "2026-10-12T13:00:00Z", subject: "s", status: "52 queued · <b>x</b>", numbers: [{ label: "Signups from creators", value: "—", note: "starts when the signup link is live" }], topCreators: [], topNote: "No creator link visits yet this week.", replies: [], needs: { replies: 1, bounces: 0, followups: 2 }, freshness: "f" };
  const { html, text } = renderDigest(model);
  expect(html).not.toContain("<b>x</b>"); expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  expect(html).toContain("1 reply to answer · 2 follow-ups due · 0 bounces to fix");
  expect(text).toContain("Signups from creators: — (starts when the signup link is live)");
  expect(html).not.toMatch(/\b0 signups\b/);
});

test("error monitor scrubs addresses and tokens, collapses slugs, and fingerprints stably", () => {
  expect(scrub("Failed for rumman@example.com with Bearer abc123 id 12345678")).toBe("Failed for [email] with Bearer [redacted] id #");
  expect(scrub("see https://x.com/a/b?token=1 now")).toBe("see https://x.com/a/b now");
  expect(routeOf("/go/some-creator?utm=1")).toBe("/go/[slug]");
  expect(routeOf("/api/leads/some-creator")).toBe("/api/leads/[slug]");
  expect(fingerprintOf("server", "Error", "/x", "id 12")).toBe(fingerprintOf("server", "Error", "/x", "id 99"));
  expect(fingerprintOf("server", "Error", "/x", "a")).not.toBe(fingerprintOf("browser", "Error", "/x", "a"));
  expect(fingerprintOf("server", "Error", "/x", "a")).toMatch(/^[0-9a-f]{64}$/);
});

test("reconcile: provider source vs app model; a drifted figure fails the check", async () => {
  const { reconcile } = await import("../src/lib/reconcile");
  const source = { day: "2026-10-20", accounts: [{ email: "a@x.com", warmup_status: 1, stat_warmup_score: 98, daily_limit: 30 }], daily: [{ email_account: "a@x.com", date: "2026-10-20", sent: 4 }], campaignRaw: { id: "c1", analytics: { emails_sent_count: 10, open_count_unique: 6, reply_count_unique: 2, bounced_count: 1 }, emailsByType: { "1": 10, "2": 2 }, leads: 5 } };
  const live = { fetchedAt: "", day: "2026-10-20", inboxes: [{ email: "a@x.com", warmup: "Active", health: 98, sentToday: 4, dailyLimit: 30 }], campaign: { id: "c1", name: "n", sent: 10, contacted: 5, opened: 6, replied: 2, bounced: 1, unsubscribed: 0 }, campaignMessage: "", batches: [] };
  expect(reconcile(source, live, { sent: 10, matched: 5 }).every(c => c.ok)).toBe(true);
  const drift = reconcile(source, { ...live, inboxes: [{ ...live.inboxes[0], health: 97 }], campaign: { ...live.campaign, opened: 5 } }, { sent: 10, matched: 5 });
  expect(drift.filter(c => !c.ok).map(c => c.label.split(":")[0].slice(0, 20))).toHaveLength(2);
  expect(reconcile(source, live, { sent: 11, matched: 5 }).some(c => !c.ok)).toBe(true);
  const none = reconcile({ ...source, campaignRaw: { id: null, message: "No campaign yet" } }, { ...live, campaign: null }, { matched: 0 });
  expect(none.at(-1)?.ok).toBe(true);
});
