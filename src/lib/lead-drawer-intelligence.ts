import type { LeadDrawerProfile, DrawerAiIntelligence, ContactIntelligence } from "@/types/lead-drawer";
import type { LeadCrmContext } from "@/types/crm-workflow";
import type { Lead } from "@/types/lead";
import type { PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import { formatCurrency, isNewThisWeek } from "@/lib/lead-utils";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(seed: number, key: string, items: readonly T[]): T {
  return items[(hashSeed(`${seed}:${key}`) % items.length) as number]!;
}

const REASONING: readonly ((lead: Lead) => string)[] = [
  (l) =>
    `${l.companyName} closed ${formatCurrency(l.amountRaised)} ${l.fundingRound} — budget and hiring cycles typically open within 60–90 days.`,
  (l) =>
    `Founder contact is on file with ${l.investors.length} notable investors — warm intro paths may exist.`,
  (l) =>
    `${l.industry} category shows elevated outreach response this quarter based on comparable accounts.`,
];

const TIMING: readonly string[] = [
  "Best window: next 5 business days post-announcement",
  "Follow-up cadence: 48h after first touch",
  "Sequence start recommended this week",
  "Defer pitch until post-board meeting cycle (~2w)",
];

const LINKEDIN: readonly string[] = [
  "Active · posted 3d ago",
  "Profile enriched · verified",
  "Recent founder activity detected",
  "Connection path available",
];

function buildDrawerAi(lead: Lead, crm: LeadCrmContext): DrawerAiIntelligence {
  const seed = hashSeed(lead.id);
  const extraSignals = [
    lead.signals[0],
    crm.engagementHealth === "high" ? "High engagement trajectory" : null,
    lead.employeeCount >= 30 ? "Hiring velocity above peer median" : null,
    lead.investors.length >= 2 ? "High investor visibility" : null,
  ].filter(Boolean) as string[];

  return {
    primaryInsight: crm.aiInsight,
    reasoning: pick(seed, "reason", REASONING)(lead),
    timingNote: pick(seed, "timing", TIMING),
    signals: extraSignals.slice(0, 4),
  };
}

function buildContactIntel(lead: Lead): ContactIntelligence {
  const seed = hashSeed(lead.id);
  const domain = lead.email.split("@")[1] ?? "company.com";
  const confidence =
    lead.leadScore >= 85 ? "High · verified" : lead.leadScore >= 72 ? "Medium · likely valid" : "Review recommended";

  const fundedLabel = isNewThisWeek(lead.fundingDate)
    ? "Funded this week"
    : `Closed ${new Date(lead.fundingDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  const growth =
    lead.employeeCount >= 50
      ? `+${12 + (seed % 18)}% headcount (12mo)`
      : lead.employeeCount >= 20
        ? `Growing · ${lead.employeeCount} employees`
        : "Early team · monitor hiring";

  return {
    emailConfidence: confidence,
    linkedInStatus: pick(seed, "li", LINKEDIN),
    website: `https://${domain}`,
    employeeGrowth: growth,
    fundingRecency: fundedLabel,
  };
}

export function buildLeadDrawerProfile(
  lead: Lead,
  stageId: PipelineStage,
  crm: LeadCrmContext,
): LeadDrawerProfile {
  const stageLabel =
    PIPELINE_COLUMNS.find((c) => c.id === stageId)?.title ?? stageId;

  return {
    lead,
    stageId,
    stageLabel,
    crm,
    ai: buildDrawerAi(lead, crm),
    contact: buildContactIntel(lead),
  };
}
