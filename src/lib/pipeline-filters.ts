import type { LeadCrmContext } from "@/types/crm-workflow";
import type { Lead } from "@/types/lead";
import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import type {
  PipelineFilters,
  PipelineViewId,
  SavedPipelineView,
} from "@/types/pipeline-workspace";
import { DEFAULT_PIPELINE_FILTERS } from "@/types/pipeline-workspace";
import { isNewThisWeek } from "@/lib/lead-utils";

const MS_PER_DAY = 86_400_000;

export const PIPELINE_SAVED_VIEWS: SavedPipelineView[] = [
  {
    id: "all",
    label: "All Leads",
    description: "Full pipeline across all stages",
  },
  {
    id: "high-priority",
    label: "High Priority",
    description: "Score 85+ and elevated urgency",
  },
  {
    id: "recently-funded",
    label: "Recently Funded",
    description: "Fresh capital events in the last 30 days",
  },
  {
    id: "outreach-ready",
    label: "Outreach Ready",
    description: "High outreach readiness signals",
  },
  {
    id: "qualified-week",
    label: "Qualified This Week",
    description: "Qualified stage with recent momentum",
  },
  {
    id: "saved",
    label: "Saved Leads",
    description: "Leads bookmarked by the team",
  },
];

const VIEW_PRESET_FILTERS: Record<PipelineViewId, Partial<PipelineFilters>> = {
  all: {},
  "high-priority": { minScore: 85, urgency: ["high", "medium"] },
  "recently-funded": { minScore: 0 },
  "outreach-ready": {
    outreachReadiness: ["Very High", "High"],
  },
  "qualified-week": { minScore: 70 },
  saved: { savedOnly: true },
};

function isRecentlyFunded(lead: Lead): boolean {
  if (isNewThisWeek(lead.fundingDate)) return true;
  const days =
    (Date.now() - new Date(lead.fundingDate).getTime()) / MS_PER_DAY;
  return days <= 30;
}

function matchesViewPreset(
  lead: Lead,
  stageId: PipelineStage,
  viewId: PipelineViewId,
  crm?: LeadCrmContext,
): boolean {
  switch (viewId) {
    case "all":
      return true;
    case "high-priority":
      return lead.leadScore >= 85 || crm?.urgency === "high";
    case "recently-funded":
      return isRecentlyFunded(lead);
    case "outreach-ready":
      return (
        lead.outreachReadiness === "Very High" ||
        lead.outreachReadiness === "High"
      );
    case "qualified-week":
      return (
        stageId === "qualified" &&
        (isRecentlyFunded(lead) || crm?.engagementHealth === "high")
      );
    case "saved":
      return lead.saved;
    default:
      return true;
  }
}

function matchesAdvancedFilters(
  lead: Lead,
  filters: PipelineFilters,
  crm?: LeadCrmContext,
): boolean {
  if (lead.leadScore < filters.minScore) return false;
  if (lead.amountRaised < filters.minFunding) return false;
  if (filters.savedOnly && !lead.saved) return false;

  if (
    filters.outreachReadiness.length > 0 &&
    !filters.outreachReadiness.includes(lead.outreachReadiness)
  ) {
    return false;
  }

  if (
    crm &&
    filters.engagementHealth.length > 0 &&
    !filters.engagementHealth.includes(crm.engagementHealth)
  ) {
    return false;
  }

  if (
    crm &&
    filters.urgency.length > 0 &&
    !filters.urgency.includes(crm.urgency)
  ) {
    return false;
  }

  return true;
}

export function mergePipelineFilters(
  viewId: PipelineViewId,
  custom: PipelineFilters,
): PipelineFilters {
  const preset = VIEW_PRESET_FILTERS[viewId];
  return {
    minScore: custom.minScore || preset.minScore || 0,
    minFunding: custom.minFunding || preset.minFunding || 0,
    outreachReadiness:
      custom.outreachReadiness.length > 0
        ? custom.outreachReadiness
        : preset.outreachReadiness ?? [],
    savedOnly: custom.savedOnly || preset.savedOnly || false,
    engagementHealth:
      custom.engagementHealth.length > 0
        ? custom.engagementHealth
        : preset.engagementHealth ?? [],
    urgency:
      custom.urgency.length > 0 ? custom.urgency : preset.urgency ?? [],
  };
}

export function countActiveCustomFilters(
  viewId: PipelineViewId,
  custom: PipelineFilters,
): number {
  const merged = mergePipelineFilters(viewId, custom);
  const baseline = mergePipelineFilters(viewId, DEFAULT_PIPELINE_FILTERS);
  let count = 0;

  if (merged.minScore !== baseline.minScore && merged.minScore > 0) count++;
  if (merged.minFunding !== baseline.minFunding && merged.minFunding > 0) count++;
  if (merged.savedOnly !== baseline.savedOnly && merged.savedOnly) count++;
  if (
    JSON.stringify(merged.outreachReadiness) !==
    JSON.stringify(baseline.outreachReadiness)
  ) {
    count++;
  }
  if (
    JSON.stringify(merged.engagementHealth) !==
    JSON.stringify(baseline.engagementHealth)
  ) {
    count++;
  }
  if (JSON.stringify(merged.urgency) !== JSON.stringify(baseline.urgency)) {
    count++;
  }

  return count;
}

export function leadMatchesPipelineView(
  lead: Lead,
  stageId: PipelineStage,
  viewId: PipelineViewId,
  filters: PipelineFilters,
  crm?: LeadCrmContext,
): boolean {
  if (!matchesViewPreset(lead, stageId, viewId, crm)) return false;
  return matchesAdvancedFilters(lead, filters, crm);
}

export function filterPipelineBoard(
  board: PipelineBoardState,
  viewId: PipelineViewId,
  filters: PipelineFilters,
  getCrmContext: (leadId: string) => LeadCrmContext | undefined,
): PipelineBoardState {
  const merged = mergePipelineFilters(viewId, filters);
  const result = {} as PipelineBoardState;

  for (const { id: stageId } of PIPELINE_COLUMNS) {
    result[stageId] = board[stageId].filter((lead) =>
      leadMatchesPipelineView(
        lead,
        stageId,
        viewId,
        merged,
        getCrmContext(lead.id),
      ),
    );
  }

  return result;
}

export function countVisibleLeads(board: PipelineBoardState): number {
  return PIPELINE_COLUMNS.reduce((n, c) => n + board[c.id].length, 0);
}

export function getViewById(id: PipelineViewId): SavedPipelineView {
  return (
    PIPELINE_SAVED_VIEWS.find((v) => v.id === id) ?? PIPELINE_SAVED_VIEWS[0]!
  );
}
