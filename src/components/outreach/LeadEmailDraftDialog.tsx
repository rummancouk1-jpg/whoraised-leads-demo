"use client";

import { useEffect, useRef } from "react";
import type { Lead } from "@/types/lead";
import { LeadEmailDraftPanel } from "@/components/outreach/LeadEmailDraftPanel";

interface LeadEmailDraftDialogProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Outreach Draft Studio — a dedicated, focused modal workspace for
 * reviewing and copying the AI outreach draft for a single saved lead.
 *
 * Wraps `LeadEmailDraftPanel` in a wider, spacious layout so the email
 * body, strategy controls, voice library, and quality check have room
 * to breathe outside the narrow lead details drawer.
 */
export function LeadEmailDraftDialog({
  lead,
  open,
  onClose,
}: LeadEmailDraftDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !lead) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:px-6 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-draft-dialog-title"
    >
      <div
        className="drawer-backdrop-enter absolute inset-0 bg-slate-950/60 backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        className="draft-dialog-enter relative z-10 flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-white shadow-[0_30px_60px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 sm:h-auto sm:max-h-[calc(100vh-4rem)] sm:rounded-2xl"
      >
        <header className="shrink-0 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/95 to-white/90 px-5 py-4 backdrop-blur-sm sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                <SparkIcon className="h-3 w-3" />
                Outreach draft studio
              </p>
              <h2
                id="email-draft-dialog-title"
                className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
              >
                {lead.companyName}
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">
                {lead.founderName}
                <span className="px-1 text-slate-300">·</span>
                {lead.founderTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200/80 bg-white/80 p-2 text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
              aria-label="Close draft studio"
            >
              <svg
                className="h-4 w-4"
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
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <div className="mx-auto max-w-3xl lg:max-w-4xl">
            <LeadEmailDraftPanel lead={lead} variant="studio" />
          </div>
        </div>

        <footer className="shrink-0 flex items-center justify-between gap-2 border-t border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur-md sm:px-7">
          <p className="text-[11px] text-slate-500">
            Review the draft before sending — strategy and signals come from
            the lead record.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 10l.9 2.5L21 15.5l-2.1.5L18 18l-.9-2-2.1-.5L17 14l1-2zm-12 4l.7 1.8L8.5 18l-1.8.6L6 20l-.7-1.4L3.5 18l1.8-.6L6 16z" />
    </svg>
  );
}
