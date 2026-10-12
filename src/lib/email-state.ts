import type { EmailMetrics } from "@/types/email";
import type { BounceBrakeStatus } from "@/lib/bounce-brake";
import { firstPicksCloseLabel, tournamentPhase } from "@/config/tournament";

export function sendingState(metrics?: EmailMetrics | null, brake?: BounceBrakeStatus | null): string {
  if (!metrics) return "Awaiting campaign data";
  const campaign = metrics.campaign;
  const phase = tournamentPhase(Date.parse(metrics.fetchedAt));
  if (phase.state === "complete" || String(campaign?.status) === "3") return "Tournament complete";
  if (!campaign || String(campaign.status) === "0") return `Pre-launch · ${firstPicksCloseLabel()}`;
  if (String(campaign.status) === "2") return brake?.alert?.status === "paused" ? "Paused by bounce brake" : campaign.ready ? "Paused · ready" : "Campaign paused";
  if (["1", "4"].includes(String(campaign.status))) {
    const sent = campaign.sentToday == null ? "metrics unavailable" : `${campaign.sentToday.toLocaleString()} sent today`;
    const bounced = campaign.bounced == null ? "bounces unavailable" : `${campaign.bounced.toLocaleString()} bounced`;
    return `Campaign live · ${sent} · ${bounced}`;
  }
  return "Awaiting campaign status";
}
