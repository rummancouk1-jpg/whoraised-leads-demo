import type {
  EngagementHealth,
  UrgencyLevel,
} from "@/types/crm-workflow";
import type { OutreachReadiness } from "@/types/lead";
export type PipelineViewId =
  | "all"
  | "high-priority"
  | "recently-funded"
  | "outreach-ready"
  | "qualified-week"
  | "saved";

/** Advanced filters — merge with saved view presets */
export interface PipelineFilters {
  minScore: number;
  minFunding: number;
  outreachReadiness: OutreachReadiness[];
  savedOnly: boolean;
  engagementHealth: EngagementHealth[];
  urgency: UrgencyLevel[];
}

export const DEFAULT_PIPELINE_FILTERS: PipelineFilters = {
  minScore: 0,
  minFunding: 0,
  outreachReadiness: [],
  savedOnly: false,
  engagementHealth: [],
  urgency: [],
};

export interface SavedPipelineView {
  id: PipelineViewId;
  label: string;
  description: string;
}

export interface WorkspaceTeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  tint: string;
}

export interface LeadWorkspaceMeta {
  leadId: string;
  owner: WorkspaceTeamMember;
  recentlyViewed: boolean;
  lastTouchedLabel: string;
}

export interface PipelineWorkspaceState {
  activeViewId: PipelineViewId;
  customFilters: PipelineFilters;
  filterPanelOpen: boolean;
  lastUpdatedAt: number;
}
