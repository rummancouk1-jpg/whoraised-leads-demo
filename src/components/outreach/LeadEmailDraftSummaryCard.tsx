"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lead } from "@/types/lead";
import {
  formatDraftAsPlainText,
  generateLeadEmailDraft,
} from "@/lib/outreach/email-draft-generator";
import { useVoiceProfileLibrary } from "@/lib/outreach/sender-profile";
import type { DraftQualityAssessment } from "@/lib/outreach/draft-quality-checker";
import { DraftEmptyState } from "@/components/outreach/DraftEmptyState";

interface LeadEmailDraftSummaryCardProps {
  lead: Lead;
  onOpenDialog: () => void;
  onSave?: () => void;
}

const QUALITY_DOT: Record<DraftQualityAssessment["status"], string> = {
  High: "bg-emerald-500",
  Good: "bg-sky-500",
  "Needs Review": "bg-rose-500",
};

const QUALITY_BADGE: Record<DraftQualityAssessment["status"], string> = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  Good: "bg-sky-50 text-sky-700 ring-sky-200/80",
  "Needs Review": "bg-rose-50 text-rose-700 ring-rose-200/80",
};

/**
 * Compact AI Outreach Draft summary card.
 *
 * Lives inside the lead details / pipeline workspace drawer and replaces
 * the previous full-panel embed. Shows the selected strategy, voice, and
 * quality status, and routes the user into the dedicated draft dialog
 * for the full studio experience.
 */
export function LeadEmailDraftSummaryCard({
  lead,
  onOpenDialog,
  onSave,
}: LeadEmailDraftSummaryCardProps) {
  const voiceLibrary = useVoiceProfileLibrary();
  const selectedVoice = voiceLibrary.selected;

  const draft = useMemo(
    () =>
      lead.saved
        ? generateLeadEmailDraft(lead, { senderProfile: selectedVoice })
        : null,
    [lead, selectedVoice],
  );

  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const handleCopyFull = useCallback(async () => {
    if (!draft) return;
    try {
      if (!navigator?.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(formatDraftAsPlainText(draft));
      setCopyState("success");
    } catch {
      setCopyState("error");
    } finally {
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }, [draft]);

  if (!lead.saved || !draft) {
    return <DraftEmptyState onSave={onSave} compact />;
  }

  const copyLabel =
    copyState === "success"
      ? "Copied"
      : copyState === "error"
        ? "Copy failed"
        : "Copy full email";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <SummaryRow label="Strategy" value={draft.strategyLabel} />
        <SummaryRow label="Voice" value={selectedVoice.name} />
        <SummaryRow
          label="Quality"
          value={`Quality: ${draft.quality.status}`}
          dotClass={QUALITY_DOT[draft.quality.status]}
          badgeClass={QUALITY_BADGE[draft.quality.status]}
        />
      </div>

      <p className="text-[11px] leading-snug text-slate-500">
        Lead intelligence selected the strategy. Voice profile shapes the tone.
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onOpenDialog}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-gradient-to-b from-indigo-600 to-indigo-700 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:from-indigo-700 hover:to-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          <SparkIcon className="h-3 w-3" />
          Open email draft
        </button>
        <button
          type="button"
          onClick={handleCopyFull}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
            copyState === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : copyState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {copyState === "success" ? (
            <CheckIcon className="h-3 w-3" />
          ) : copyState === "error" ? (
            <AlertIcon className="h-3 w-3" />
          ) : (
            <CopyIcon className="h-3 w-3" />
          )}
          {copyLabel}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  dotClass,
  badgeClass,
}: {
  label: string;
  value: string;
  dotClass?: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 ${
          badgeClass ? `rounded-full px-2 py-0.5 ring-1 ring-inset ${badgeClass}` : ""
        }`}
        title={value}
      >
        {dotClass ? (
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`}
          />
        ) : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 012-2h7a2 2 0 012 2v10a2 2 0 01-2 2H9V5z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0 3.75h.008v.008H12V16.5zm-9.75 4.5h19.5a1.125 1.125 0 00.974-1.687L13.04 4.05a1.125 1.125 0 00-1.948 0L1.276 18.813A1.125 1.125 0 002.25 20.5z"
      />
    </svg>
  );
}
