import { isExample, leadGroup, leadTier } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";

/** The handful of lead counts the status line and number tiles need. Pure, so the server and the client agree. */
export type LeadSummary = { queued: number; total: number; priority: number; longTail: number; groups: string[] };

export function summarizeLeads(leads: Lead[]): LeadSummary {
  const real = leads.filter(l => !isExample(l));
  const priority = real.filter(l => leadTier(l) === "priority").length;
  return {
    queued: real.filter(l => l.stage === "New").length,
    total: real.length,
    priority,
    longTail: real.length - priority,
    groups: [...new Set(real.map(leadGroup))].sort().map(g => `${g}: ${real.filter(l => leadGroup(l) === g).length}`),
  };
}
