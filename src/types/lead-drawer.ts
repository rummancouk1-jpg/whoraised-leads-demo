import type { LeadCrmContext } from "@/types/crm-workflow";
import type { Lead } from "@/types/lead";
import type { PipelineStage } from "@/types/pipeline";

export interface ContactIntelligence {
  emailConfidence: string;
  linkedInStatus: string;
  website: string;
  employeeGrowth: string;
  fundingRecency: string;
}

export interface DrawerAiIntelligence {
  primaryInsight: string;
  reasoning: string;
  timingNote: string;
  signals: string[];
}

export interface LeadDrawerProfile {
  lead: Lead;
  stageId: PipelineStage;
  stageLabel: string;
  crm: LeadCrmContext;
  ai: DrawerAiIntelligence;
  contact: ContactIntelligence;
}

export type LeadDrawerSectionId =
  | "overview"
  | "ai"
  | "activity"
  | "actions"
  | "contact";

export const LEAD_DRAWER_SECTIONS: readonly {
  id: LeadDrawerSectionId;
  label: string;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "ai", label: "AI" },
  { id: "activity", label: "Activity" },
  { id: "actions", label: "Actions" },
  { id: "contact", label: "Contact" },
] as const;
