"use client";

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
  onCopy: (text: string, id: string) => void;
  onToggleSaved: (id: string) => void;
  onViewDetails: (lead: Lead) => void;
}

const ACTIONS_WIDTH = 210;

const thClass =
  "whitespace-nowrap px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";
const tdClass =
  "px-3 py-3 align-middle text-sm transition-colors duration-200 ease-out";

const rowBase =
  "group relative transition-all duration-200 ease-out hover:z-[1] hover:bg-gradient-to-r hover:from-indigo-50/70 hover:to-slate-50/50 hover:shadow-[inset_3px_0_0_0_rgb(99,102,241),0_1px_3px_0_rgb(15,23,42,0.04)]";

const rowActive =
  "z-[1] bg-gradient-to-r from-indigo-50/90 to-violet-50/40 shadow-[inset_3px_0_0_0_rgb(79,70,229),0_1px_4px_0_rgb(99,102,241,0.08)]";

const stickyActionsTdBase =
  "sticky right-0 z-20 border-l border-slate-100 bg-white px-3 py-3 shadow-[-12px_0_24px_-12px_rgba(15,23,42,0.08)] transition-colors duration-200 ease-out group-hover:border-indigo-100/80 group-hover:bg-indigo-50/60";

const stickyActionsTdActive =
  "border-indigo-100/80 bg-indigo-50/60";

const iconBtnBase =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ease-out";

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

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
  const stateClass = copied
    ? "text-emerald-600"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : label}
      className={`${iconBtnBase} ${stateClass}`}
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
  const stateClass = saved
    ? "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={saved}
      className={`${iconBtnBase} ${stateClass}`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.75}
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

export function LeadTable({
  leads,
  copiedId,
  activeLeadId,
  savedOnlyActive = false,
  onCopy,
  onToggleSaved,
  onViewDetails,
}: LeadTableProps) {
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
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Lead records
        </p>
      </div>

      <div className="table-scroll-container relative max-w-full overflow-x-auto">
        <div
          className="pointer-events-none absolute top-0 z-[5] h-full w-6 bg-gradient-to-r from-transparent to-white/40 transition-opacity duration-200"
          style={{ right: ACTIONS_WIDTH }}
          aria-hidden
        />
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th className={`${thClass} min-w-[150px] max-w-[180px]`}>Company</th>
              <th className={`${thClass} min-w-[130px]`}>Founder</th>
              <th className={`${thClass} min-w-[64px]`}>Score</th>
              <th className={`${thClass} min-w-[110px]`}>Industry</th>
              <th className={`${thClass} min-w-[88px]`}>Round</th>
              <th className={`${thClass} min-w-[72px]`}>Raised</th>
              <th className={`${thClass} min-w-[88px]`}>Funded</th>
              <th className={`${thClass} min-w-[100px] max-w-[130px]`}>Location</th>
              <th className={`${thClass} min-w-[130px] max-w-[170px]`}>Email</th>
              <th className={`${thClass} min-w-[110px] max-w-[130px]`}>Phone</th>
              <th className={`${thClass} min-w-[80px]`}>Status</th>
              <th
                className="sticky right-0 z-20 min-w-[210px] border-l border-slate-200/90 bg-slate-50/95 px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[-12px_0_24px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90">
            {leads.map((lead) => {
              const emailCopyId = `${lead.id}-email`;
              const phoneCopyId = `${lead.id}-phone`;
              const isActive = activeLeadId === lead.id;

              return (
                <tr
                  key={lead.id}
                  className={`${rowBase} ${isActive ? rowActive : ""}`}
                >
                  <td className={`${tdClass} min-w-[150px] max-w-[180px] group-hover:text-slate-900`}>
                    <div className={`font-semibold transition-colors duration-200 ${isActive ? "text-indigo-900" : "text-slate-900 group-hover:text-indigo-900"}`}>
                      {lead.companyName}
                    </div>
                    <p className="text-xs text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
                      {lead.employeeCount} employees
                    </p>
                  </td>
                  <td className={tdClass}>
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
                  <td className={`${tdClass} max-w-[130px] truncate text-slate-600`} title={lead.location}>
                    {lead.location}
                  </td>
                  <td className={`${tdClass} max-w-[170px]`}>
                    <span
                      className="block cursor-help truncate text-slate-600 transition-colors hover:text-indigo-700"
                      title={lead.email}
                    >
                      {lead.email}
                    </span>
                  </td>
                  <td className={`${tdClass} max-w-[130px]`}>
                    <span
                      className="block cursor-help truncate whitespace-nowrap text-slate-600 transition-colors hover:text-indigo-700"
                      title={lead.phone}
                    >
                      {lead.phone}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td
                    className={`${stickyActionsTdBase} min-w-[210px] ${isActive ? stickyActionsTdActive : ""}`}
                  >
                    <div className="flex items-center justify-end gap-0.5">
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
                      <span aria-hidden className="mx-1.5 h-5 w-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={() => onViewDetails(lead)}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                      >
                        View details
                        <ArrowRightIcon />
                      </button>
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
