"use client";

import { useEffect } from "react";
import type { Lead } from "@/types/lead";

interface SavedDraftToastProps {
  lead: Lead | null;
  onView: () => void;
  onDismiss: () => void;
  /** ms before the toast auto-dismisses. Set to 0 to disable. */
  durationMs?: number;
}

export function SavedDraftToast({
  lead,
  onView,
  onDismiss,
  durationMs = 6000,
}: SavedDraftToastProps) {
  useEffect(() => {
    if (!lead || durationMs <= 0) return;
    const id = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(id);
  }, [lead, durationMs, onDismiss]);

  if (!lead) return null;

  return (
    <div
      key={lead.id}
      role="status"
      aria-live="polite"
      className="saved-draft-toast-enter fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 transform"
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-3.5 py-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06] backdrop-blur-xl">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-white">
            Lead saved — email draft ready
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {lead.companyName} · {lead.founderName}
          </p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-md border border-indigo-300/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
        >
          Open draft
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
