import { test, expect } from "@playwright/test";
// Execute actual server modules against the existing deterministic SQL/provider transport.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { harness, fixture } = require("./r2-independent-replay.cjs");

test("no campaign records healthy WAITING, keeps warmup readable, and throttles repeated syncs", async () => {
  const h = harness();
  h.state.noCampaign = true;
  h.state.accounts = [{ email: "warmup@gapgamblerteam.com", warmup_status: 1, stat_warmup_score: 98, daily_limit: 20 }];
  const out = await h.sync().runInstantlySync("cron");
  expect(out).toMatchObject({ ran: true, ok: true, counts: { state: "WAITING", matched: 0 } });
  expect(h.state.runs[0]).toMatchObject({ ok: true, counts: { state: "WAITING" } });
  expect(h.state.runs[0].finished_at).toBeTruthy();
  expect(h.state.runs[0].error).toBeUndefined();
  expect(await h.sync().currentSyncHealth()).toMatchObject({ state: "waiting", consecutiveFailures: 0, lastError: null });
  const ohq = h.load("src/lib/server/ohq.ts");
  expect(await ohq.ohqHealth()).toMatchObject({ ok: true, checks: { instantly_sync: { ok: true, state: "waiting" } } });
  expect(await ohq.ohqWatch()).toMatchObject({ health: { ok: true }, alerts: [] });
  const metrics = await h.load("src/lib/server/instantly.ts").fetchEmailMetrics();
  expect(metrics.campaign).toBeNull();
  expect(metrics.inboxes).toEqual([{ email: "warmup@gapgamblerteam.com", warmup: "Active", health: 98, sentToday: null, dailyLimit: 20 }]);
  expect(await h.sync().runInstantlySync("auto", 14)).toMatchObject({ ran: false, ok: true });
});

test("campaign appearing after WAITING resumes normal activity sync", async () => {
  const h = harness();
  h.state.noCampaign = true;
  await h.sync().runInstantlySync("cron");
  h.state.noCampaign = false;
  fixture(h, 3);
  expect(await h.sync().runInstantlySync("cron")).toMatchObject({ ok: true, counts: { campaign: "found" } });
  expect((await h.sync().currentSyncHealth()).state).toBe("ok");
  expect(h.state.stats.get("waiting")).toMatchObject({ sent: 1, replied: 1 });
});

for (const status of [401, 403, 500]) test(`real API ${status} stays a failure even without a campaign`, async () => {
  const h = harness();
  h.state.noCampaign = true;
  await h.sync().runInstantlySync("cron");
  h.state.providerStatus = status;
  h.env.CRON_SECRET = "fixture-cron";
  const response = await h.load("src/app/api/cron/instantly-sync/route.ts").GET(new Request("https://fixture.invalid/api/cron/instantly-sync", { headers: { Authorization: "Bearer fixture-cron" } }));
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ ran: true, ok: false });
  expect(h.state.runs.at(-1).ok).toBe(false);
  expect(await h.sync().currentSyncHealth()).toMatchObject({ state: "failing", consecutiveFailures: 1 });
  expect((await h.load("src/lib/server/ohq.ts").ohqHealth()).ok).toBe(false);
});
