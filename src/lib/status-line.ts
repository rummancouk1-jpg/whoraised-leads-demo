import type { EmailMetrics } from "@/types/email";
import type { BounceBrakeStatus } from "./bounce-brake";
import { pausedBrakeAlert, brakePauseCopy } from "./bounce-brake";
import { firstPicksCloseLabel, tournamentPhase } from "@/config/tournament";

export type StatusTone = "ok" | "info" | "warn" | "idle";
export type StatusLine = {
  tone: StatusTone;
  /** The headline clause; null while the lead list is still loading. */
  main: string | null;
  /** Remaining clauses in reading order; null while the Instantly read is still pending. */
  rest: string[] | null;
  /** The whole sentence, for tests and assistive tech. */
  text: string | null;
};
export type StatusLineInput = {
  leadsLoading: boolean;
  leadsFailed: boolean;
  /** Real leads in the "New" stage. */
  queued: number;
  /** All real leads (so "nothing queued" differs from "nothing imported"). */
  total: number;
  email: "loading" | "ready" | "unavailable";
  snapshot?: EmailMetrics | null;
  brake?: BounceBrakeStatus | null;
};

/**
 * One plain-language sentence for the campaign. Every figure and date comes from the workspace database or the
 * Instantly snapshot passed in; with no valid send date it never invents one.
 */
export function buildStatusLine(input: StatusLineInput): StatusLine {
  const main = input.leadsLoading ? null
    : input.leadsFailed ? "Can't load the lead list"
    : input.total === 0 ? "No leads imported yet"
    : input.queued === 0 ? "Nothing queued"
    : `${input.queued.toLocaleString()} ${input.queued === 1 ? "creator or community" : "creators & communities"} queued`;

  let rest: string[] | null = null;
  let tone: StatusTone = "info";
  if (input.email === "unavailable" && !input.snapshot) { rest = ["couldn't read inbox status"]; tone = "warn"; }
  else if (input.email !== "loading" || input.snapshot) {
    const snap = input.snapshot;
    if (!snap) { rest = ["couldn't read inbox status"]; tone = "warn"; }
    else {
      const health = snap.inboxes.flatMap(i => i.health === null ? [] : [i.health]);
      const inbox = !snap.inboxes.length ? "no sending inboxes connected" : `Sending inboxes · ${health.length ? `${Math.round(health.reduce((a,b) => a+b,0)/health.length)}% average health` : "health unavailable"}`;
      const campaign = snap.campaign;
      const status = String(campaign?.status);
      let send: string;
      if (!campaign) send = `Pre-launch · ${firstPicksCloseLabel()}`;
      else if (status === "2") { const alert = pausedBrakeAlert(input.brake, campaign?.status); send = alert ? brakePauseCopy(alert) : "campaign paused"; tone = "warn"; }
      else if (status === "3") { send = "tournament complete"; tone = "idle"; }
      else if (["1", "4"].includes(status)) {
        const phase = tournamentPhase(Date.parse(snap.fetchedAt));
        if (phase.state === "complete") { send = "tournament complete"; tone = "idle"; }
        else {
          const sent = campaign.sentToday == null ? "metrics unavailable" : `${campaign.sentToday.toLocaleString()} sent today`;
          const bounced = campaign.bounced == null ? "bounces unavailable" : `${campaign.bounced.toLocaleString()} bounced`;
          send = `Campaign live · ${sent} · ${bounced}`;
          tone = "ok";
        }
      }
      else send = `Pre-launch · ${firstPicksCloseLabel()}`;
      if (!snap.inboxes.length) tone = tone === "ok" ? tone : "warn";
      rest = [inbox, send];
    }
  }
  const text = main && rest ? [main, ...rest].join(" · ") : null;
  return { tone: input.leadsFailed ? "warn" : tone, main, rest, text };
}
