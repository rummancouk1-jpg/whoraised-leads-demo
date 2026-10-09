import type { EmailMetrics } from "@/types/email";

export function sendingState(metrics?: EmailMetrics | null): string {
  if (!metrics) return "Awaiting campaign data";
  const campaign = metrics.campaign;
  const start = campaign?.startsOn;
  const scheduled = !!start && start >= metrics.day;
  if (!campaign || String(campaign.status) === "0") return `Warming up${scheduled ? ` · sending starts ${start}` : ""}`;
  if (String(campaign.status) === "2") return "Campaign paused";
  if (String(campaign.status) === "3") return "Campaign completed";
  if (scheduled) return `Scheduled · sending starts ${start}`;
  if (["1", "4"].includes(String(campaign.status))) return "Sending · awaiting today's metrics";
  return "Awaiting campaign status";
}
