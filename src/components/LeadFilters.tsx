"use client";

import type { LeadFiltersState, SortOption } from "@/types/lead";
import { getActiveScorePresetId, SCORE_PRESETS } from "@/lib/lead-utils";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: LeadFiltersState;
  onFiltersChange: (filters: LeadFiltersState) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  industries: string[];
  fundingRounds: string[];
  statuses: string[];
  resultCount: number;
  onReset: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest-funded", label: "Newest funded" },
  { value: "highest-score", label: "Highest score" },
  { value: "amount-raised", label: "Amount raised" },
  { value: "company-az", label: "Company A-Z" },
];

const inputClass =
  "h-9 w-full rounded-md border border-slate-200/90 bg-white px-2.5 text-sm text-slate-800 shadow-sm transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500";

export function LeadFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  industries,
  fundingRounds,
  statuses,
  resultCount,
  onReset,
}: LeadFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    filters.industry !== "" ||
    filters.fundingRound !== "" ||
    filters.status !== "" ||
    filters.scoreMin > 0 ||
    filters.scoreMax < 100 ||
    filters.savedOnly;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-3 shadow-sm ring-1 ring-slate-900/[0.04]">
      {/* Search + sort row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200/90 bg-white pl-8 pr-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className={`${inputClass} w-auto min-w-[148px] shrink-0`}
          aria-label="Sort leads"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Reset
          </button>
        )}
        <SavedLeadsToggle
          savedOnly={filters.savedOnly}
          onChange={(savedOnly) => onFiltersChange({ ...filters, savedOnly })}
        />
        <span className="ml-auto shrink-0 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200/80">
          <span className="font-bold tabular-nums text-slate-900">{resultCount}</span>{" "}
          {resultCount === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* Filters row — single line on laptop+ */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 sm:grid-cols-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <label className={labelClass}>Industry</label>
          <select
            value={filters.industry}
            onChange={(e) =>
              onFiltersChange({ ...filters, industry: e.target.value })
            }
            className={inputClass}
          >
            <option value="">All</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Round</label>
          <select
            value={filters.fundingRound}
            onChange={(e) =>
              onFiltersChange({ ...filters, fundingRound: e.target.value })
            }
            className={inputClass}
          >
            <option value="">All</option>
            {fundingRounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ ...filters, status: e.target.value })
            }
            className={inputClass}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label className={labelClass}>Score</label>
          <ScorePresetChips
            activeId={getActiveScorePresetId(filters)}
            onSelect={(scoreMin, scoreMax) =>
              onFiltersChange({ ...filters, scoreMin, scoreMax })
            }
          />
        </div>
      </div>
    </div>
  );
}

function SavedLeadsToggle({
  savedOnly,
  onChange,
}: {
  savedOnly: boolean;
  onChange: (savedOnly: boolean) => void;
}) {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-md border border-slate-200/90 bg-slate-100/60 p-0.5 shadow-sm"
      role="group"
      aria-label="Lead list view"
    >
      <button
        type="button"
        aria-pressed={!savedOnly}
        onClick={() => onChange(false)}
        className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold transition-colors ${
          !savedOnly
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
            : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
        }`}
      >
        All leads
      </button>
      <button
        type="button"
        aria-pressed={savedOnly}
        onClick={() => onChange(true)}
        className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold transition-colors ${
          savedOnly
            ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25 ring-1 ring-amber-400/40"
            : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
        }`}
      >
        Saved leads
      </button>
    </div>
  );
}

function ScorePresetChips({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (scoreMin: number, scoreMax: number) => void;
}) {
  return (
    <div
      className="flex h-9 flex-wrap items-center gap-0.5 rounded-md border border-slate-200/90 bg-slate-100/60 p-0.5 shadow-sm"
      role="group"
      aria-label="Lead score filter"
    >
      {SCORE_PRESETS.map((preset) => {
        const isActive = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.scoreMin, preset.scoreMax)}
            aria-pressed={isActive}
            className={`min-w-[2.25rem] flex-1 rounded-[5px] px-2 py-1 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 ring-1 ring-indigo-500/30"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
