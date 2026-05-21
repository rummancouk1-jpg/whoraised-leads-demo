import type { PipelineStage } from "@/types/pipeline";

export type EngagementHealth = "high" | "steady" | "low";
export type UrgencyLevel = "high" | "medium" | "low";
export type WarmthState = "warm" | "neutral" | "cool";

export type OperationalIndicatorTone =
  | "neutral"
  | "positive"
  | "attention"
  | "fresh";

export interface OperationalIndicator {
  id: string;
  label: string;
  tone: OperationalIndicatorTone;
}

export type PipelineActivityType =
  | "stage_change"
  | "outreach"
  | "research"
  | "verification"
  | "team"
  | "save"
  | "signal";

export interface PipelineActivityEvent {
  id: string;
  type: PipelineActivityType;
  label: string;
  relativeTime: string;
  /** Unix ms — for API sync and sorting */
  occurredAt: number;
}

export type NextActionPriority = "high" | "normal";

export interface NextActionRecommendation {
  id: string;
  label: string;
  priority: NextActionPriority;
  /** Future: deep link or command id */
  actionKey?: string;
}

export interface LeadCrmContext {
  leadId: string;
  stageId: PipelineStage;
  indicators: OperationalIndicator[];
  aiInsight: string;
  activities: PipelineActivityEvent[];
  nextActions: NextActionRecommendation[];
  engagementHealth: EngagementHealth;
  urgency: UrgencyLevel;
  warmth: WarmthState;
  lastActivityLabel: string;
}

export interface PipelineHealthMetrics {
  total: number;
  hotLeads: number;
  recentlyTouched: number;
  activeOpportunities: number;
  stageCounts: Record<PipelineStage, number>;
  velocityLabel: string;
}

/** Runtime activity append — maps to future POST /leads/:id/activities */
export interface PipelineActivityInput {
  type: PipelineActivityType;
  label: string;
  occurredAt?: number;
}
