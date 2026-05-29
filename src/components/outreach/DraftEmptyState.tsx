"use client";

interface DraftEmptyStateProps {
  onSave?: () => void;
  /** Compact mode tightens padding for nested-drawer contexts. */
  compact?: boolean;
}

/**
 * Single source of truth for the "save to generate a draft" empty state.
 * Used by both the dashboard's `LeadDetailDrawer` and the pipeline workspace's
 * `LeadEmailDraftSection` so the two surfaces read as one feature.
 */
export function DraftEmptyState({ onSave, compact = false }: DraftEmptyStateProps) {
  const padding = compact ? "px-3 py-4" : "px-4 py-5";

  return (
    <div
      className={`flex flex-col items-center rounded-lg border border-dashed border-indigo-200 bg-white text-center ${padding}`}
    >
      <span
        aria-hidden
        className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 ring-1 ring-indigo-200/70"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
        </svg>
      </span>
      <p className="text-[13px] font-semibold tracking-tight text-slate-800">
        Save the lead to generate an outreach draft
      </p>
      <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-slate-500">
        The AI draft assistant analyzes the lead and tailors a draft from the
        intelligence already on this card — funding, signals, stage, and contact.
      </p>
      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-indigo-300/80 bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          Save & generate draft
        </button>
      ) : null}
    </div>
  );
}
