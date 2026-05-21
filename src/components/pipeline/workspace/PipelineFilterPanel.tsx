"use client";

import { useRef, useEffect } from "react";
import type { OutreachReadiness } from "@/types/lead";
import type {
  EngagementHealth,
  UrgencyLevel,
} from "@/types/crm-workflow";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";

const READINESS_OPTIONS: OutreachReadiness[] = [
  "Very High",
  "High",
  "Moderate",
  "Developing",
];

const ENGAGEMENT_OPTIONS: EngagementHealth[] = ["high", "steady", "low"];
const URGENCY_OPTIONS: UrgencyLevel[] = ["high", "medium", "low"];

export function PipelineFilterPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    customFilters,
    patchCustomFilters,
    resetCustomFilters,
    filterPanelOpen,
    setFilterPanelOpen,
    activeFilterCount,
  } = usePipelineWorkspace();

  useEffect(() => {
    if (!filterPanelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-filter-trigger]")) {
          setFilterPanelOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterPanelOpen, setFilterPanelOpen]);

  if (!filterPanelOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,300px)] rounded-lg border border-white/[0.1] bg-[#141a24]/95 p-3 shadow-xl shadow-black/40 ring-1 ring-white/[0.08] backdrop-blur-xl"
      role="dialog"
      aria-label="Pipeline filters"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Refine view
        </p>
        <button
          type="button"
          onClick={resetCustomFilters}
          className="text-[10px] font-medium text-indigo-300/90 hover:text-indigo-200"
        >
          Reset
        </button>
      </div>

      <label className="mb-3 block">
        <span className="text-[10px] font-medium text-slate-500">
          Min score ({customFilters.minScore || "any"})
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={customFilters.minScore}
          onChange={(e) =>
            patchCustomFilters({ minScore: Number(e.target.value) })
          }
          className="mt-1 w-full accent-indigo-500"
        />
      </label>

      <label className="mb-3 block">
        <span className="text-[10px] font-medium text-slate-500">
          Min funding (${(customFilters.minFunding / 1_000_000).toFixed(1)}M+)
        </span>
        <input
          type="range"
          min={0}
          max={50_000_000}
          step={1_000_000}
          value={customFilters.minFunding}
          onChange={(e) =>
            patchCustomFilters({ minFunding: Number(e.target.value) })
          }
          className="mt-1 w-full accent-indigo-500"
        />
      </label>

      <FilterToggle
        label="Saved only"
        active={customFilters.savedOnly}
        onToggle={() =>
          patchCustomFilters({ savedOnly: !customFilters.savedOnly })
        }
      />

      <MultiChipGroup
        label="Outreach readiness"
        options={READINESS_OPTIONS}
        selected={customFilters.outreachReadiness}
        onChange={(outreachReadiness) => patchCustomFilters({ outreachReadiness })}
      />

      <MultiChipGroup
        label="Engagement"
        options={ENGAGEMENT_OPTIONS}
        selected={customFilters.engagementHealth}
        onChange={(engagementHealth) => patchCustomFilters({ engagementHealth })}
        formatLabel={(v) => v}
      />

      <MultiChipGroup
        label="Urgency"
        options={URGENCY_OPTIONS}
        selected={customFilters.urgency}
        onChange={(urgency) => patchCustomFilters({ urgency })}
        formatLabel={(v) => v}
      />

      <p className="mt-2 text-[9px] text-slate-500">
        Press <kbd className="rounded bg-white/10 px-1">F</kbd> to toggle ·{" "}
        {activeFilterCount} active refinement
        {activeFilterCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mb-3 flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors ${
        active
          ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
          : "border-white/[0.08] text-slate-400 hover:border-white/[0.12]"
      }`}
    >
      {label}
      <span
        className={`h-3.5 w-6 rounded-full transition-colors ${
          active ? "bg-indigo-500" : "bg-white/10"
        }`}
      />
    </button>
  );
}

function MultiChipGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
  formatLabel = (v) => v,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  formatLabel?: (v: T) => string;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[10px] font-medium text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(
                  on ? selected.filter((s) => s !== opt) : [...selected, opt],
                )
              }
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset transition-colors ${
                on
                  ? "bg-white/[0.08] text-slate-200 ring-white/[0.12]"
                  : "text-slate-500 ring-white/[0.06] hover:text-slate-300"
              }`}
            >
              {formatLabel(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
