"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead, LeadStatus } from "@/types/lead";
import {
  BULK_STATUS_OPTIONS,
  CSV_FILENAME,
  buildLeadsCsv,
  copyTextToClipboard,
  downloadCsv,
  extractUniqueEmails,
  extractUniquePhones,
} from "@/lib/bulk-actions";

interface BulkActionsToolbarProps {
  selectedLeads: Lead[];
  hiddenCount: number;
  onChangeStatus: (status: LeadStatus) => void;
  onClear: () => void;
}

type Feedback =
  | { tone: "success" | "info" | "error"; message: string; key: number }
  | null;

const FEEDBACK_TIMEOUT_MS = 2200;

const buttonBase =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";

const ghostBtn =
  "border-white/[0.08] bg-white/[0.04] text-slate-100 hover:border-white/[0.16] hover:bg-white/[0.08]";

const primaryBtn =
  "border-indigo-400/40 bg-indigo-500/20 text-indigo-100 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] hover:border-indigo-300/60 hover:bg-indigo-500/30";

function CopyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75M15.75 17.25h3.375c.621 0 1.125-.504 1.125-1.125V8.25l-4.5-4.5H9.375c-.621 0-1.125.504-1.125 1.125V6.75M15.75 17.25h-7.5a1.125 1.125 0 01-1.125-1.125V6.75"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function StatusMenu({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (status: LeadStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (target && !wrapRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % BULK_STATUS_OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight(
          (h) =>
            (h - 1 + BULK_STATUS_OPTIONS.length) % BULK_STATUS_OPTIONS.length,
        );
      } else if (e.key === "Home") {
        e.preventDefault();
        setHighlight(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setHighlight(BULK_STATUS_OPTIONS.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const pick = BULK_STATUS_OPTIONS[highlight];
        if (pick) {
          onPick(pick);
          setOpen(false);
          buttonRef.current?.focus();
        }
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, highlight, onPick]);

  const handleToggle = () => {
    setHighlight(0);
    setOpen((prev) => !prev);
  };

  const handlePick = (status: LeadStatus) => {
    onPick(status);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change status for selected leads"
        onClick={handleToggle}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
          open
            ? "border-indigo-400/40 bg-indigo-500/15 text-white"
            : "border-white/[0.08] bg-white/[0.04] text-slate-100 hover:border-white/[0.16] hover:bg-white/[0.08]"
        }`}
      >
        <span>Change status…</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Change status for selected leads"
          tabIndex={-1}
          className="bulk-status-menu absolute bottom-full right-0 z-[70] mb-2 min-w-[160px] overflow-hidden rounded-lg border border-white/[0.1] bg-[#0f1218]/98 p-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7),0_6px_18px_-6px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.06] backdrop-blur-xl"
        >
          {BULK_STATUS_OPTIONS.map((status, i) => {
            const isHighlight = i === highlight;
            return (
              <li
                key={status}
                role="option"
                aria-selected={isHighlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => handlePick(status)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  isHighlight
                    ? "bg-indigo-500/25 text-white"
                    : "text-slate-100 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{status}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function feedbackToneClass(tone: "success" | "info" | "error"): string {
  if (tone === "success") return "text-emerald-300";
  if (tone === "error") return "text-rose-300";
  return "text-slate-300";
}

export function BulkActionsToolbar({
  selectedLeads,
  hiddenCount,
  onChangeStatus,
  onClear,
}: BulkActionsToolbarProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timeoutRef = useRef<number | null>(null);
  const count = selectedLeads.length;

  const showFeedback = useCallback(
    (tone: "success" | "info" | "error", message: string) => {
      setFeedback({ tone, message, key: Date.now() });
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        timeoutRef.current = null;
      }, FEEDBACK_TIMEOUT_MS);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopyEmails = useCallback(async () => {
    const emails = extractUniqueEmails(selectedLeads);
    if (emails.length === 0) {
      showFeedback("info", "No email addresses available");
      return;
    }
    const ok = await copyTextToClipboard(emails.join(", "));
    if (ok) {
      showFeedback(
        "success",
        `Copied ${emails.length} ${emails.length === 1 ? "email" : "emails"}`,
      );
    } else {
      showFeedback("error", "Couldn't access clipboard");
    }
  }, [selectedLeads, showFeedback]);

  const handleCopyPhones = useCallback(async () => {
    const phones = extractUniquePhones(selectedLeads);
    if (phones.length === 0) {
      showFeedback("info", "No phone numbers available");
      return;
    }
    const ok = await copyTextToClipboard(phones.join(", "));
    if (ok) {
      showFeedback(
        "success",
        `Copied ${phones.length} ${phones.length === 1 ? "phone" : "phones"}`,
      );
    } else {
      showFeedback("error", "Couldn't access clipboard");
    }
  }, [selectedLeads, showFeedback]);

  const handleExportCsv = useCallback(() => {
    if (selectedLeads.length === 0) return;
    const csv = buildLeadsCsv(selectedLeads);
    downloadCsv(CSV_FILENAME, csv);
    showFeedback(
      "success",
      `Exported ${selectedLeads.length} ${selectedLeads.length === 1 ? "lead" : "leads"} to CSV`,
    );
  }, [selectedLeads, showFeedback]);

  const handleStatusPick = useCallback(
    (status: LeadStatus) => {
      onChangeStatus(status);
      showFeedback(
        "success",
        `Status set to ${status} for ${count} ${count === 1 ? "lead" : "leads"}`,
      );
    },
    [count, onChangeStatus, showFeedback],
  );

  return (
    <div
      role="region"
      aria-label="Bulk lead actions"
      className="bulk-toolbar-mount pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4 sm:bottom-6"
    >
      <div className="pointer-events-auto flex max-w-full flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0f1218]/95 px-2.5 py-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7),0_6px_18px_-6px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.06] backdrop-blur-xl">
          <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 px-2.5 py-1 text-[12px] font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.5)]" />
            <span className="tabular-nums">{count}</span>
            <span className="text-indigo-200/80">
              {count === 1 ? "lead" : "leads"} selected
            </span>
          </span>

          {hiddenCount > 0 && (
            <span
              className="hidden text-[11px] text-slate-400/90 sm:inline"
              title={`${hiddenCount} selected ${hiddenCount === 1 ? "lead is" : "leads are"} hidden by your current filters`}
            >
              · {hiddenCount} hidden by filters
            </span>
          )}

          <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-white/[0.08] sm:block" />

          <button
            type="button"
            onClick={handleCopyEmails}
            className={`${buttonBase} ${ghostBtn}`}
            disabled={count === 0}
          >
            <CopyIcon />
            <span>Copy Emails</span>
          </button>
          <button
            type="button"
            onClick={handleCopyPhones}
            className={`${buttonBase} ${ghostBtn}`}
            disabled={count === 0}
          >
            <CopyIcon />
            <span>Copy Phones</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className={`${buttonBase} ${primaryBtn}`}
            disabled={count === 0}
          >
            <DownloadIcon />
            <span>Export CSV</span>
          </button>

          <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-white/[0.08] sm:block" />

          <StatusMenu disabled={count === 0} onPick={handleStatusPick} />

          <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-white/[0.08] sm:block" />

          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Clear selection"
          >
            <XIcon />
            <span>Clear</span>
          </button>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          className="flex min-h-[20px] items-center justify-center sm:justify-start"
        >
          {feedback && (
            <span
              key={feedback.key}
              className={`bulk-toolbar-feedback inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0f1218]/95 px-2.5 py-1 text-[11px] font-medium shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-md ${feedbackToneClass(feedback.tone)}`}
            >
              {feedback.tone === "success" && <CheckCircleIcon />}
              <span>{feedback.message}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
