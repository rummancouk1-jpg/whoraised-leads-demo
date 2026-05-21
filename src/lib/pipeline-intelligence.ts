import type { Lead, LeadStatus } from "@/types/lead";
import type {
  EngagementHealth,
  LeadCrmContext,
  NextActionRecommendation,
  OperationalIndicator,
  PipelineActivityEvent,
  PipelineActivityInput,
  PipelineHealthMetrics,
  UrgencyLevel,
  WarmthState,
} from "@/types/crm-workflow";
import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import { isNewThisWeek } from "@/lib/lead-utils";
import { pipelineStageToLeadStatus } from "@/lib/pipeline-utils";

const MS_PER_DAY = 86_400_000;
const DAY_LABELS = ["today", "1d ago", "2d ago", "3d ago", "4d ago", "5d ago", "1w ago"];

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

function daysAgoLabel(seed: number, key: string): string {
  const idx = hashSeed(`${seed}:${key}:days`) % DAY_LABELS.length;
  return DAY_LABELS[idx]!;
}

function relativeFromMs(ms: number): string {
  const days = Math.floor((Date.now() - ms) / MS_PER_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "1w ago";
  return `${Math.floor(days / 7)}w ago`;
}

const AI_INSIGHT_TEMPLATES: readonly string[] = [
  "Founder recently active on LinkedIn",
  "Strong outreach timing after recent raise",
  "Likely hiring following capital event",
  "High investor visibility in current round",
  "Team expansion signal in hiring data",
  "Direct founder email path verified",
  "Category momentum supports warm intro",
  "Press coverage amplifying founder reachability",
];

function buildSeededActivities(
  seed: number,
  lead: Lead,
  stage: PipelineStage,
): PipelineActivityEvent[] {
  const base = Date.now();
  const events: PipelineActivityEvent[] = [];

  if (lead.saved) {
    events.push({
      id: `${lead.id}-save`,
      type: "save",
      label: "Saved by SDR team",
      relativeTime: daysAgoLabel(seed, "save"),
      occurredAt: base - (hashSeed(`${seed}:save`) % 5) * MS_PER_DAY,
    });
  }

  if (lead.email) {
    events.push({
      id: `${lead.id}-verify`,
      type: "verification",
      label: "Email verified",
      relativeTime: daysAgoLabel(seed, "verify"),
      occurredAt: base - (2 + (hashSeed(`${seed}:v`) % 4)) * MS_PER_DAY,
    });
  }

  events.push({
    id: `${lead.id}-research`,
    type: "research",
    label: "Contact researched",
    relativeTime: daysAgoLabel(seed, "research"),
    occurredAt: base - (3 + (hashSeed(`${seed}:r`) % 6)) * MS_PER_DAY,
  });

  if (stage !== "new") {
    events.push({
      id: `${lead.id}-outreach`,
      type: "outreach",
      label: stage === "contacted" ? "Outreach opened" : "Follow-up logged",
      relativeTime: daysAgoLabel(seed, "outreach"),
      occurredAt: base - (1 + (hashSeed(`${seed}:o`) % 3)) * MS_PER_DAY,
    });
  }

  if (stage === "qualified" || stage === "closed") {
    events.push({
      id: `${lead.id}-stage`,
      type: "stage_change",
      label: `Marked ${stage === "qualified" ? "Qualified" : "Closed"}`,
      relativeTime: daysAgoLabel(seed, "qualified"),
      occurredAt: base - (hashSeed(`${seed}:q`) % 8) * MS_PER_DAY,
    });
  }

  if (isNewThisWeek(lead.fundingDate)) {
    events.push({
      id: `${lead.id}-signal`,
      type: "signal",
      label: "Funding signal ingested",
      relativeTime: "today",
      occurredAt: base,
    });
  }

  return events.sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 5);
}

function deriveEngagement(seed: number, lead: Lead, stage: PipelineStage): EngagementHealth {
  if (lead.leadScore >= 88 && stage !== "closed") return "high";
  if (hashSeed(`${seed}:eng`) % 5 === 0 || stage === "closed") return "low";
  if (lead.leadScore >= 72) return "steady";
  return "low";
}

function deriveUrgency(lead: Lead, stage: PipelineStage): UrgencyLevel {
  if (lead.leadScore >= 90 && stage === "new") return "high";
  if (lead.leadScore >= 85 && stage === "contacted") return "high";
  if (stage === "qualified" && lead.leadScore >= 80) return "medium";
  if (stage === "new" && isNewThisWeek(lead.fundingDate)) return "medium";
  return "low";
}

function deriveWarmth(seed: number, lead: Lead, stage: PipelineStage): WarmthState {
  if (stage === "closed") return "cool";
  if (lead.leadScore >= 82 || stage === "qualified") return "warm";
  if (hashSeed(`${seed}:warm`) % 4 === 0) return "cool";
  return "neutral";
}

function buildIndicators(
  lead: Lead,
  stage: PipelineStage,
  seed: number,
  engagement: EngagementHealth,
  urgency: UrgencyLevel,
  warmth: WarmthState,
): OperationalIndicator[] {
  const indicators: OperationalIndicator[] = [];
  const contactedDays = 1 + (hashSeed(`${seed}:contact`) % 6);

  if (isNewThisWeek(lead.fundingDate)) {
    indicators.push({ id: "fresh", label: "Fresh lead", tone: "fresh" });
  } else {
    const fundedDays = Math.floor(
      (Date.now() - new Date(lead.fundingDate).getTime()) / MS_PER_DAY,
    );
    if (fundedDays <= 30) {
      indicators.push({ id: "funded", label: "Recently funded", tone: "positive" });
    }
  }

  if (stage === "contacted") {
    indicators.push({
      id: "contacted",
      label: `Contacted ${contactedDays}d ago`,
      tone: "neutral",
    });
  }

  if (engagement === "high") {
    indicators.push({ id: "engage", label: "High engagement", tone: "positive" });
  } else if (engagement === "low" && stage !== "new") {
    indicators.push({ id: "followup", label: "Needs follow-up", tone: "attention" });
  }

  if (lead.outreachReadiness === "Very High" || lead.outreachReadiness === "High") {
    indicators.push({ id: "ready", label: "Contact ready", tone: "positive" });
  }

  if (urgency === "high") {
    indicators.push({ id: "urgent", label: "High priority", tone: "attention" });
  }

  if (warmth === "warm" && indicators.length < 3) {
    indicators.push({ id: "warm", label: "Warm outreach", tone: "positive" });
  }

  if (hashSeed(`${seed}:founder`) % 3 === 0 && indicators.length < 3) {
    indicators.push({ id: "founder", label: "Founder active", tone: "fresh" });
  }

  return indicators.slice(0, 3);
}

function buildNextActions(
  lead: Lead,
  stage: PipelineStage,
  seed: number,
  urgency: UrgencyLevel,
): NextActionRecommendation[] {
  const actions: NextActionRecommendation[] = [];

  if (stage === "new") {
    actions.push({
      id: "prepare",
      label: "Prepare outreach",
      priority: urgency === "high" ? "high" : "normal",
      actionKey: "prepare_outreach",
    });
    if (!lead.email) {
      actions.push({
        id: "verify-email",
        label: "Verify direct email",
        priority: "high",
        actionKey: "verify_email",
      });
    }
  }

  if (stage === "contacted") {
    actions.push({
      id: "followup",
      label: "Send follow-up",
      priority: "high",
      actionKey: "send_followup",
    });
  }

  if (stage === "qualified") {
    actions.push({
      id: "review",
      label: "Review founder profile",
      priority: "normal",
      actionKey: "review_profile",
    });
  }

  if (lead.leadScore >= 88) {
    actions.unshift({
      id: "priority",
      label: "High-priority lead",
      priority: "high",
      actionKey: "mark_priority",
    });
  }

  if (actions.length < 2 && hashSeed(`${seed}:extra`) % 2 === 0) {
    actions.push({
      id: "research",
      label: "Research buying committee",
      priority: "normal",
      actionKey: "research_account",
    });
  }

  return actions.slice(0, 2);
}

export function createActivityEvent(
  leadId: string,
  input: PipelineActivityInput,
): PipelineActivityEvent {
  const occurredAt = input.occurredAt ?? Date.now();
  return {
    id: `${leadId}-${occurredAt}`,
    type: input.type,
    label: input.label,
    relativeTime: relativeFromMs(occurredAt),
    occurredAt,
  };
}

export function buildLeadCrmContext(
  lead: Lead,
  stageId: PipelineStage,
  extraActivities: PipelineActivityEvent[] = [],
): LeadCrmContext {
  const seed = hashSeed(lead.id);
  const engagement = deriveEngagement(seed, lead, stageId);
  const urgency = deriveUrgency(lead, stageId);
  const warmth = deriveWarmth(seed, lead, stageId);

  const seeded = buildSeededActivities(seed, lead, stageId);
  const activityMap = new Map<string, PipelineActivityEvent>();
  for (const e of [...seeded, ...extraActivities]) {
    activityMap.set(e.id, e);
  }
  const activities = [...activityMap.values()]
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, 6)
    .map((e) => ({ ...e, relativeTime: relativeFromMs(e.occurredAt) }));

  const aiInsight = pick(seed, "ai", AI_INSIGHT_TEMPLATES);
  const indicators = buildIndicators(lead, stageId, seed, engagement, urgency, warmth);

  return {
    leadId: lead.id,
    stageId: stageId,
    indicators,
    aiInsight,
    activities,
    nextActions: buildNextActions(lead, stageId, seed, urgency),
    engagementHealth: engagement,
    urgency,
    warmth,
    lastActivityLabel: activities[0]?.relativeTime ?? "No activity",
  };
}

export function buildBoardCrmContextMap(
  board: PipelineBoardState,
  activityByLead: Record<string, PipelineActivityEvent[]>,
): Map<string, LeadCrmContext> {
  const map = new Map<string, LeadCrmContext>();

  for (const { id: stageId } of PIPELINE_COLUMNS) {
    for (const lead of board[stageId]) {
      map.set(
        lead.id,
        buildLeadCrmContext(lead, stageId, activityByLead[lead.id] ?? []),
      );
    }
  }

  return map;
}

export function computePipelineHealth(
  board: PipelineBoardState,
): PipelineHealthMetrics {
  const all = PIPELINE_COLUMNS.flatMap((c) => board[c.id]);
  const hotLeads = all.filter((l) => l.leadScore >= 85).length;
  const activeOpportunities =
    board.contacted.length + board.qualified.length;
  const recentlyTouched = all.filter((l) => {
    const seed = hashSeed(l.id);
    return hashSeed(`${seed}:touch`) % 3 !== 0;
  }).length;

  const stageCounts = Object.fromEntries(
    PIPELINE_COLUMNS.map((c) => [c.id, board[c.id].length]),
  ) as Record<PipelineStage, number>;

  const velocityLabel =
    hotLeads >= 8
      ? "Strong pipeline momentum"
      : activeOpportunities >= 6
        ? "Steady outreach velocity"
        : "Building early-stage flow";

  return {
    total: all.length,
    hotLeads,
    recentlyTouched,
    activeOpportunities,
    stageCounts,
    velocityLabel,
  };
}

/** Maps stage to display title for activity log entries */
export function stageChangeActivityLabel(stage: PipelineStage): string {
  const titles: Record<PipelineStage, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    closed: "Closed",
  };
  return `Moved to ${titles[stage]}`;
}

export function leadStatusForStage(stage: PipelineStage): LeadStatus {
  return pipelineStageToLeadStatus(stage);
}
