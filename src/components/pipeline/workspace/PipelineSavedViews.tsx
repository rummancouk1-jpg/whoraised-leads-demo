"use client";

import { PIPELINE_SAVED_VIEWS } from "@/lib/pipeline-filters";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";
import type { PipelineViewId } from "@/types/pipeline-workspace";

export function PipelineSavedViews() {
  const { activeViewId, setActiveView, visibleCount, totalCount } =
    usePipelineWorkspace();

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label="Saved pipeline views"
    >
      {PIPELINE_SAVED_VIEWS.map((view) => {
        const active = activeViewId === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={view.description}
            onClick={() => setActiveView(view.id as PipelineViewId)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
              active
                ? "bg-white/[0.1] text-white shadow-sm ring-1 ring-white/[0.12]"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
            }`}
          >
            {view.label}
          </button>
        );
      })}
      <span className="ml-1 hidden text-[10px] tabular-nums text-slate-500 sm:inline">
        {visibleCount}/{totalCount}
      </span>
    </div>
  );
}
