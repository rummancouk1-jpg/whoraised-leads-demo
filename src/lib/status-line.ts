import type { EmailMetrics } from "@/types/email";
import { shortDay } from "@/lib/time";
import { WAITING_FOR_CAMPAIGN } from "./activity";

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
};

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

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
      const warming = snap.inboxes.filter(i => i.warmup === "Active").length;
      const inbox = !snap.inboxes.length ? "no inboxes connected" : warming ? `${plural(warming, "inbox", "inboxes")} warming` : "no inboxes warming";
      const campaign = snap.campaign;
      const status = String(campaign?.status);
      const start = campaign?.startsOn;
      const scheduled = !!start && start >= snap.day;
      let send: string;
      if (!campaign) send = WAITING_FOR_CAMPAIGN;
      else if (status === "2") { send = "campaign paused"; tone = "warn"; }
      else if (campaign && status === "3") { send = "campaign completed"; tone = "idle"; }
      else if (campaign && ["1", "4"].includes(status) && !scheduled) { send = "sending now"; tone = "ok"; }
      else if (scheduled) send = `sending starts ${shortDay(start!)}`;
      else send = "sending starts once the signup link is live";
      if (!snap.inboxes.length || !warming) tone = tone === "ok" ? tone : "warn";
      rest = [inbox, send];
    }
  }
  const text = main && rest ? [main, ...rest].join(" · ") : null;
  return { tone: input.leadsFailed ? "warn" : tone, main, rest, text };
}
