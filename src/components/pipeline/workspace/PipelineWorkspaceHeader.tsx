"use client";

import { getViewById } from "@/lib/pipeline-filters";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";
import { PipelineSavedViews } from "@/components/pipeline/workspace/PipelineSavedViews";
import { PipelineFilterPanel } from "@/components/pipeline/workspace/PipelineFilterPanel";

export function PipelineWorkspaceHeader() {
  const {
    activeViewId,
    activeViewLabel,
    activeFilterCount,
    lastUpdatedLabel,
    visibleCount,
    filteredHealth,
    toggleFilterPanel,
    filterPanelOpen,
    teamPresence,
  } = usePipelineWorkspace();

  const view = getViewById(activeViewId);

  return (
    <div className="mb-3 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-white">
              {activeViewLabel}
            </h2>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200/90 ring-1 ring-indigo-400/20">
                +{activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">{view.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="hidden items-center -space-x-1.5 sm:flex"
            title="Team in workspace"
          >
            {teamPresence.slice(0, 3).map((member) => (
              <span
                key={member.id}
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${member.tint} text-[9px] font-semibold text-white ring-2 ring-[#0d1118]`}
              >
                {member.initials}
              </span>
            ))}
            <span className="ml-2 text-[10px] text-slate-500">SDR team active</span>
          </div>

          <div className="relative">
            <button
              type="button"
              data-filter-trigger
              onClick={toggleFilterPanel}
              aria-expanded={filterPanelOpen}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterPanelOpen || activeFilterCount > 0
                  ? "border-indigo-400/25 bg-indigo-500/10 text-indigo-200"
                  : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.821 1.09-.428 2.35-2.07 4.228-4.2 5.178V18a1.5 1.5 0 01-1.085 1.436l-4.25 1.14a1.5 1.5 0 01-.73 0l-4.25-1.14A1.5 1.5 0 015 18v-2.054C2.87 14.996 1.228 13.118.8 10.768c-.096-.534.288-1 .821-1.09C4.25 3.232 6.95 3 9.705 3H12z"
                />
              </svg>
              Filters
            </button>
            <PipelineFilterPanel />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>
          Updated {lastUpdatedLabel} · {visibleCount} visible ·{" "}
          {filteredHealth.hotLeads} hot
        </span>
        <span className="hidden text-slate-600 md:inline">
          <kbd className="rounded bg-white/[0.06] px-1">F</kbd> filters
        </span>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 ring-1 ring-white/[0.04]">
        <PipelineSavedViews />
      </div>
    </div>
  );
}
