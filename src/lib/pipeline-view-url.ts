import type {
  PipelineFilters,
  PipelineViewId,
} from "@/types/pipeline-workspace";
import { DEFAULT_PIPELINE_FILTERS } from "@/types/pipeline-workspace";

const VALID_VIEWS: PipelineViewId[] = [
  "all",
  "high-priority",
  "recently-funded",
  "outreach-ready",
  "qualified-week",
  "saved",
];

/** Future: sync workspace state to URL search params */
export function pipelineStateToSearchParams(
  viewId: PipelineViewId,
  filters: PipelineFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (viewId !== "all") params.set("view", viewId);
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  if (filters.minFunding > 0) {
    params.set("minFunding", String(filters.minFunding));
  }
  if (filters.savedOnly) params.set("saved", "1");
  if (filters.outreachReadiness.length) {
    params.set("readiness", filters.outreachReadiness.join(","));
  }
  if (filters.engagementHealth.length) {
    params.set("engagement", filters.engagementHealth.join(","));
  }
  if (filters.urgency.length) {
    params.set("urgency", filters.urgency.join(","));
  }
  return params;
}

export function searchParamsToPipelineState(
  params: URLSearchParams,
): { viewId: PipelineViewId; filters: PipelineFilters } {
  const viewParam = params.get("view");
  const viewId = VALID_VIEWS.includes(viewParam as PipelineViewId)
    ? (viewParam as PipelineViewId)
    : "all";

  const filters: PipelineFilters = { ...DEFAULT_PIPELINE_FILTERS };
  const minScore = params.get("minScore");
  if (minScore) filters.minScore = Number(minScore) || 0;
  const minFunding = params.get("minFunding");
  if (minFunding) filters.minFunding = Number(minFunding) || 0;
  if (params.get("saved") === "1") filters.savedOnly = true;

  const readiness = params.get("readiness");
  if (readiness) {
    filters.outreachReadiness = readiness.split(",") as PipelineFilters["outreachReadiness"];
  }

  return { viewId, filters };
}
