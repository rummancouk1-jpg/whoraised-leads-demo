"use client";

import { getViewById } from "@/lib/pipeline-filters";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";

export function PipelineBoardEmpty() {
  const {
    activeViewId,
    activeFilterCount,
    resetCustomFilters,
    setActiveView,
  } = usePipelineWorkspace();

  const view = getViewById(activeViewId);

  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-12 text-center ring-1 ring-inset ring-white/[0.04]"
      role="status"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-indigo-500/10 to-transparent ring-1 ring-white/[0.08]">
        <span className="h-2 w-2 rounded-full bg-indigo-400/60" aria-hidden />
      </div>
      <p className="text-sm font-medium tracking-tight text-slate-300">
        No leads match this view
      </p>
      <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
        {view.label} has no matching records
        {activeFilterCount > 0 ? " with your current refinements" : ""}. Adjust
        filters or switch to another saved view.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={resetCustomFilters}
            className="rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/[0.07]"
          >
            Clear filters
          </button>
        ) : null}
        {activeViewId !== "all" ? (
          <button
            type="button"
            onClick={() => setActiveView("all")}
            className="rounded-md border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-medium text-indigo-200/90 transition-colors hover:bg-indigo-500/15"
          >
            View all leads
          </button>
        ) : null}
      </div>
    </div>
  );
}
