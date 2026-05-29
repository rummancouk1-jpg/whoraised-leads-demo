"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Lead } from "@/types/lead";
import { formatCurrency, formatDate } from "@/lib/lead-utils";
import {
  FundingRoundBadge,
  IndustryBadge,
  LeadScoreBadge,
  StatusBadge,
} from "@/components/LeadBadges";

interface LeadTableProps {
  leads: Lead[];
  copiedId: string | null;
  activeLeadId?: string | null;
  savedOnlyActive?: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string) => void;
  onToggleSelectAllVisible: (visibleIds: string[], nextSelected: boolean) => void;
  onCopy: (text: string, id: string) => void;
  onToggleSaved: (id: string) => void;
  onViewDetails: (lead: Lead) => void;
  onOpenDraftDialog: (leadId: string) => void;
  onSaveAndOpenDraft: (leadId: string) => void;
}

const ACTIONS_WIDTH = 312;

const thClass =
  "whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
const tdClass =
  "px-4 py-3.5 align-middle text-sm leading-relaxed transition-colors duration-200 ease-out";

const rowBase =
  "group relative bg-white transition-all duration-200 ease-out hover:z-[1] hover:bg-indigo-50 hover:shadow-[inset_3px_0_0_0_rgb(99,102,241),0_1px_3px_0_rgb(15,23,42,0.04)]";

const rowActive =
  "z-[1] bg-indigo-50 shadow-[inset_3px_0_0_0_rgb(79,70,229),0_1px_4px_0_rgb(99,102,241,0.08)]";

const rowSelected =
  "bg-indigo-50/70 shadow-[inset_3px_0_0_0_rgb(129,140,248)]";

const stickyActionsTdBase =
  "sticky right-0 z-40 isolate border-l border-slate-200 bg-white px-3 py-3.5 shadow-[-16px_0_24px_-12px_rgba(15,23,42,0.1)] transition-colors duration-200 ease-out group-hover:border-indigo-100 group-hover:bg-indigo-50";

const stickyActionsTdActive =
  "border-indigo-100 bg-indigo-50";

const stickyActionsTdSelected =
  "border-indigo-100 bg-indigo-50/70";

const checkboxClass =
  "h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-indigo-600 transition-colors focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-0";

const stickyActionsTh =
  "sticky right-0 z-40 isolate min-w-[312px] border-l border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-[-16px_0_24px_-12px_rgba(15,23,42,0.08)]";

const iconBtnBase =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ease-out active:scale-[0.98]";

const MailIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="icon-action-check-in h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const SparkIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={`h-3 w-3 ${className}`}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
  </svg>
);

/**
 * Inline icon-to-pill Draft action.
 *
 * At rest the chip is a 28px-square icon button so it never overlaps
 * Mail / Phone / Save / View details. On row hover or keyboard
 * `focus-within`, the button's width grows and the label slides in
 * (margin + max-width transition), turning the icon into a labeled
 * pill. The chip sits as the middle item in a 3-way
 * `justify-between` actions row, so its growth absorbs the breathing
 * room around it without shifting the surrounding clusters.
 *
 * Touch devices (`@media (hover: none)`) keep the icon-only state and
 * stay tappable — tapping triggers the same Save+open or Open-only
 * behavior as a click.
 */
function DraftRowAction({
  saved,
  onClick,
  companyLabel,
}: {
  saved: boolean;
  onClick: () => void;
  companyLabel: string;
}) {
  // Pre-computed widths for the saved ("Draft") and unsaved
  // ("Save & draft") expanded labels. Listed as full class strings so
  // Tailwind's content scanner keeps them in the build.
  const expandedWidth = saved
    ? "w-7 group-hover:w-[64px] group-focus-within:w-[64px] focus-visible:w-[64px]"
    : "w-7 group-hover:w-[100px] group-focus-within:w-[100px] focus-visible:w-[100px]";

  const expandedLabelMax = saved
    ? "max-w-0 group-hover:max-w-[36px] group-focus-within:max-w-[36px] focus-visible:max-w-[36px]"
    : "max-w-0 group-hover:max-w-[72px] group-focus-within:max-w-[72px] focus-visible:max-w-[72px]";

  const expandedLabelMargin =
    "ml-0 group-hover:ml-1 group-focus-within:ml-1 focus-visible:ml-1";

  const savedStyle =
    "border border-indigo-300/70 bg-gradient-to-b from-white via-indigo-50 to-white text-indigo-700 " +
    "hover:border-indigo-400 hover:from-indigo-50 hover:to-white";

  const unsavedStyle =
    "border border-slate-200/80 bg-white text-slate-500 " +
    "hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={
        saved
          ? `Open outreach draft for ${companyLabel}`
          : `Save ${companyLabel} and open outreach draft`
      }
      title={saved ? "Open outreach draft" : "Save and open outreach draft"}
      className={
        "inline-flex h-7 shrink-0 items-center justify-start overflow-hidden rounded-md px-2 text-[11px] font-semibold whitespace-nowrap shadow-sm " +
        "transition-[width,background-color,border-color,box-shadow] duration-200 ease-out " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 " +
        "motion-reduce:transition-none " +
        expandedWidth +
        " " +
        (saved ? savedStyle : unsavedStyle)
      }
    >
      <SparkIcon className="shrink-0" />
      <span
        className={
          "inline-block overflow-hidden whitespace-nowrap " +
          "transition-[max-width,margin-left] duration-200 ease-out " +
          "motion-reduce:transition-none " +
          expandedLabelMax +
          " " +
          expandedLabelMargin
        }
      >
        {saved ? "Draft" : "Save & draft"}
      </span>
    </button>
  );
}

function CopyIconAction({
  label,
  kind,
  copied,
  onClick,
}: {
  label: string;
  kind: "email" | "phone";
  copied: boolean;
  onClick: () => void;
}) {
  const buttonClass = copied
    ? "icon-action-copy-pulse border-emerald-300 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/90"
    : "border-slate-200/70 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : label}
      className={`${iconBtnBase} ${buttonClass}`}
    >
      {copied ? <CheckIcon /> : kind === "email" ? <MailIcon /> : <PhoneIcon />}
      {copied && (
        <span className="sr-only" aria-live="polite">
          Copied
        </span>
      )}
    </button>
  );
}

function SaveIconAction({
  label,
  saved,
  onClick,
}: {
  label: string;
  saved: boolean;
  onClick: () => void;
}) {
  const buttonClass = saved
    ? "border-indigo-300/80 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60"
    : "border-slate-200/70 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={saved}
      className={`${iconBtnBase} ${buttonClass}`}
    >
      <svg
        className={`h-3.5 w-3.5 transition-colors duration-200 ${saved ? "fill-current" : "fill-none"}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
    </button>
  );
}

function HeaderSelectCheckbox({
  visibleCount,
  visibleSelectedCount,
  onToggle,
}: {
  visibleCount: number;
  visibleSelectedCount: number;
  onToggle: (nextSelected: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const allSelected = visibleCount > 0 && visibleSelectedCount === visibleCount;
  const someSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleCount;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  const label = allSelected
    ? "Deselect all visible leads"
    : "Select all visible leads";

  return (
    <input
      ref={ref}
      type="checkbox"
      className={checkboxClass}
      checked={allSelected}
      onChange={(e) => onToggle(e.target.checked)}
      aria-label={label}
      title={label}
      disabled={visibleCount === 0}
    />
  );
}

export function LeadTable({
  leads,
  copiedId,
  activeLeadId,
  savedOnlyActive = false,
  selectedIds,
  onToggleSelected,
  onToggleSelectAllVisible,
  onCopy,
  onToggleSaved,
  onViewDetails,
  onOpenDraftDialog,
  onSaveAndOpenDraft,
}: LeadTableProps) {
  const visibleIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const visibleSelectedCount = useMemo(
    () => visibleIds.reduce((acc, id) => (selectedIds.has(id) ? acc + 1 : acc), 0),
    [visibleIds, selectedIds],
  );

  if (leads.length === 0) {
    if (savedOnlyActive) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white px-6 py-16 text-center">
          <svg
            className="mb-4 h-12 w-12 text-amber-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
            />
          </svg>
          <p className="text-sm font-medium text-slate-700">No saved leads yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Save promising leads to build your outreach list.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <svg
          className="mb-4 h-12 w-12 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-sm font-medium text-slate-700">No leads match your filters</p>
        <p className="mt-1 text-sm text-slate-400">Try adjusting search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Lead records
        </p>
      </div>

      <div className="table-scroll-container relative max-w-full overflow-x-auto">
        <div
          className="table-actions-fade pointer-events-none absolute top-0 z-[35] h-full w-14"
          style={{ right: ACTIONS_WIDTH }}
          aria-hidden
        />
        <table className="w-max border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th
                className={`${thClass} w-[40px] min-w-[40px] px-3`}
                scope="col"
              >
                <span className="sr-only">Select</span>
                <HeaderSelectCheckbox
                  visibleCount={visibleIds.length}
                  visibleSelectedCount={visibleSelectedCount}
                  onToggle={(next) => onToggleSelectAllVisible(visibleIds, next)}
                />
              </th>
              <th className={`${thClass} min-w-[152px]`}>Company</th>
              <th className={`${thClass} min-w-[132px]`}>Founder</th>
              <th className={`${thClass} min-w-[68px]`}>Score</th>
              <th className={`${thClass} min-w-[112px]`}>Industry</th>
              <th className={`${thClass} min-w-[92px]`}>Round</th>
              <th className={`${thClass} min-w-[80px]`}>Raised</th>
              <th className={`${thClass} min-w-[96px]`}>Funded</th>
              <th className={`${thClass} min-w-[108px]`}>Location</th>
              <th className={`${thClass} min-w-[200px]`}>Email</th>
              <th className={`${thClass} min-w-[132px]`}>Phone</th>
              <th className={`${thClass} min-w-[88px]`}>Status</th>
              <th className={stickyActionsTh}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const emailCopyId = `${lead.id}-email`;
              const phoneCopyId = `${lead.id}-phone`;
              const isActive = activeLeadId === lead.id;
              const isSelected = selectedIds.has(lead.id);

              return (
                <tr
                  key={lead.id}
                  data-selected={isSelected || undefined}
                  className={`${rowBase} ${isActive ? rowActive : isSelected ? rowSelected : ""}`}
                >
                  <td className={`${tdClass} w-[40px] min-w-[40px] px-3`}>
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={isSelected}
                      onChange={() => onToggleSelected(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${isSelected ? "Deselect" : "Select"} ${lead.companyName}`}
                    />
                  </td>
                  <td className={`${tdClass} min-w-[152px] group-hover:text-slate-900`}>
                    <div className={`font-semibold transition-colors duration-200 ${isActive ? "text-indigo-900" : "text-slate-900 group-hover:text-indigo-900"}`}>
                      {lead.companyName}
                    </div>
                    <p className="text-xs text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
                      {lead.employeeCount} employees
                    </p>
                  </td>
                  <td className={`${tdClass} min-w-[132px]`}>
                    <p className="font-medium text-slate-800">{lead.founderName}</p>
                    <p className="line-clamp-1 text-xs text-slate-400">{lead.founderTitle}</p>
                  </td>
                  <td className={tdClass}>
                    <LeadScoreBadge score={lead.leadScore} />
                  </td>
                  <td className={tdClass}>
                    <IndustryBadge industry={lead.industry} />
                  </td>
                  <td className={tdClass}>
                    <FundingRoundBadge round={lead.fundingRound} />
                  </td>
                  <td className={`${tdClass} whitespace-nowrap font-semibold tabular-nums text-slate-900`}>
                    {formatCurrency(lead.amountRaised)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-slate-600`}>
                    {formatDate(lead.fundingDate)}
                  </td>
                  <td className={`${tdClass} min-w-[108px] max-w-[140px] truncate text-slate-600`} title={lead.location}>
                    {lead.location}
                  </td>
                  <td className={`${tdClass} min-w-[200px] whitespace-nowrap text-slate-600`}>
                    <span className="block transition-colors hover:text-indigo-700">
                      {lead.email}
                    </span>
                  </td>
                  <td className={`${tdClass} min-w-[132px] whitespace-nowrap text-slate-600`}>
                    <span className="block transition-colors hover:text-indigo-700">
                      {lead.phone}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td
                    className={`${stickyActionsTdBase} min-w-[312px] ${isActive ? stickyActionsTdActive : isSelected ? stickyActionsTdSelected : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-0.5">
                        <CopyIconAction
                          label="Copy email"
                          kind="email"
                          copied={copiedId === emailCopyId}
                          onClick={() => onCopy(lead.email, emailCopyId)}
                        />
                        <CopyIconAction
                          label="Copy phone"
                          kind="phone"
                          copied={copiedId === phoneCopyId}
                          onClick={() => onCopy(lead.phone, phoneCopyId)}
                        />
                        <SaveIconAction
                          label={lead.saved ? "Saved" : "Save lead"}
                          saved={lead.saved}
                          onClick={() => onToggleSaved(lead.id)}
                        />
                      </div>
                      <DraftRowAction
                        saved={lead.saved}
                        companyLabel={lead.companyName}
                        onClick={() =>
                          lead.saved
                            ? onOpenDraftDialog(lead.id)
                            : onSaveAndOpenDraft(lead.id)
                        }
                      />
                      <div className="flex items-center gap-0.5">
                        <span
                          aria-hidden
                          className="mx-1 h-5 w-px bg-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => onViewDetails(lead)}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-indigo-200/90 bg-white px-2.5 text-[11px] font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/80"
                        >
                          View details
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
