import { test, expect } from "@playwright/test";
import { sendingState } from "../src/lib/email-state";
import type { EmailMetrics } from "../src/types/email";

test("Pending send counts describe provider campaign status and schedule", () => {
  const metrics: EmailMetrics = { fetchedAt: "2026-10-08T00:00:00Z", day: "2026-10-08", inboxes: [], campaign: null, campaignMessage: "No campaign yet", batches: [] };
  expect(sendingState(metrics)).toBe("Warming up");
  metrics.campaign = { id: "campaign", name: "Tournament", status: 0, startsOn: "2026-10-19", sent: null, contacted: null, opened: null, replied: null, bounced: null, unsubscribed: null };
  expect(sendingState(metrics)).toBe("Warming up · sending starts 2026-10-19");
  metrics.campaign.status = 2;
  expect(sendingState(metrics)).toBe("Campaign paused");
  metrics.campaign.status = 1;
  metrics.campaign.startsOn = "2026-10-07";
  expect(sendingState(metrics)).toBe("Sending · awaiting today's metrics");
  metrics.campaign.status = 3;
  expect(sendingState(metrics)).toBe("Campaign completed");
  expect(sendingState(null)).toBe("Awaiting campaign data");
});
