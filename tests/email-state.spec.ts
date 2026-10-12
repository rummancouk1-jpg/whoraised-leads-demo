import { test, expect } from "@playwright/test";
import { sendingState } from "../src/lib/email-state";
import type { EmailMetrics } from "../src/types/email";
import { firstPicksCloseLabel, TOURNAMENT, tournamentPhase } from "../src/config/tournament";

test("Live copy follows real campaign state and the tournament config", () => {
  const metrics: EmailMetrics = { fetchedAt: `${TOURNAMENT.startsOn}T00:00:00Z`, day: TOURNAMENT.startsOn, inboxes: [], campaign: null, campaignMessage: "No campaign yet", batches: [] };
  expect(sendingState(metrics)).toBe(`Pre-launch · ${firstPicksCloseLabel()}`);
  metrics.campaign = { id: "campaign", name: "Tournament", status: 0, sent: null, contacted: null, opened: null, replied: null, bounced: null, unsubscribed: null };
  expect(sendingState(metrics)).toBe(`Pre-launch · ${firstPicksCloseLabel()}`);
  metrics.campaign.status = 2;
  expect(sendingState(metrics)).toBe("Campaign paused");
  metrics.campaign.ready = true;
  expect(sendingState(metrics)).toBe("Paused · ready");
  metrics.campaign.status = 1;
  metrics.campaign.sentToday = 12;
  metrics.campaign.bounced = 2;
  expect(sendingState(metrics)).toBe("Campaign live · 12 sent today · 2 bounced");
  expect(sendingState(metrics, { alert: { at: "", sent: 60, bounced: 4, rate: 4/60, status: "paused" }, lastCheck: null, lastSuccess: null })).toBe("Campaign live · 12 sent today · 2 bounced");
  metrics.campaign.status = 3;
  expect(sendingState(metrics)).toBe("Tournament complete");
  expect(sendingState(null)).toBe("Awaiting campaign data");
});

test("Tournament countdown, live day, and completion use Eastern boundaries", () => {
  expect(tournamentPhase(Date.parse(TOURNAMENT.firstPicksCloseAt) - 1).state).toBe("countdown");
  expect(tournamentPhase(Date.parse(TOURNAMENT.firstPicksCloseAt))).toMatchObject({ state: "live", day: 1 });
  expect(tournamentPhase(Date.parse(`${TOURNAMENT.endsOn}T18:00:00Z`))).toMatchObject({ state: "live", day: TOURNAMENT.durationDays });
  expect(tournamentPhase(Date.parse(TOURNAMENT.completesAt))).toEqual({ state: "complete" });
});
