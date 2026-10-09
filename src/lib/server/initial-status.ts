import "server-only";
import type { EmailMetrics } from "@/types/email";
import { summarizeLeads, type LeadSummary } from "@/lib/summary";
import { getLeads } from "./leads";
import { latestSnapshot } from "./snapshots";
import { getActivity } from "./activity";
import type { ActivityResponse } from "@/lib/activity";
import { withDatabaseDeadline } from "./db";
import type { Lead } from "@/types/outreach";

export type InitialStatus = { now: number; leads: Lead[] | null; summary: LeadSummary | null; snapshot: EmailMetrics | null; activity: ActivityResponse | null };

/**
 * What the first HTML needs to answer "where does the campaign stand?": lead counts from the database and the newest
 * saved Instantly snapshot. Never touches Instantly itself (the client asks for live metrics), and each half degrades
 * to null on its own so a slow or failing read only means that part loads on the client with a skeleton.
 */
export async function getInitialStatus(): Promise<InitialStatus> {
  return withDatabaseDeadline(async () => {
  // One lead read feeds both the counts and the action queue.
  const leadsRead = getLeads();
  const [leads, snapshot, activity] = await Promise.allSettled([leadsRead, latestSnapshot(), leadsRead.then(l => getActivity(l))]);
  return { now: Date.now(), leads: leads.status === "fulfilled" ? leads.value : null, summary: leads.status === "fulfilled" ? summarizeLeads(leads.value) : null, snapshot: snapshot.status === "fulfilled" ? snapshot.value : null, activity: activity.status === "fulfilled" ? activity.value : null };
  });
}
