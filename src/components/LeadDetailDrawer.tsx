"use client";

import { useEffect } from "react";
import type { Lead } from "@/types/lead";
import { formatCurrency, formatDate } from "@/lib/lead-utils";
import {
  FundingRoundBadge,
  IndustryBadge,
  LeadScoreBadge,
  StatusBadge,
} from "@/components/LeadBadges";
import { LeadIntelligencePanel } from "@/components/LeadIntelligencePanel";
import { LeadEmailDraftSummaryCard } from "@/components/outreach/LeadEmailDraftSummaryCard";

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onToggleSaved: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  /** When set, the draft section auto-scrolls into view on open. */
  scrollToDraftForId?: string | null;
  /** Open the dedicated outreach draft dialog for the given lead. */
  onOpenDraftDialog?: (leadId: string) => void;
}

export function LeadDetailDrawer({
  lead,
  onClose,
  onToggleSaved,
  onCopy,
  copiedId,
  scrollToDraftForId,
  onOpenDraftDialog,
}: LeadDetailDrawerProps) {
  useEffect(() => {
    if (!lead) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [lead, onClose]);

  useEffect(() => {
    if (!lead) return;
    if (scrollToDraftForId !== lead.id) return;
    const id = window.setTimeout(() => {
      document
        .getElementById("lead-drawer-draft")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [lead, scrollToDraftForId]);

  if (!lead) return null;

  const emailCopyId = `${lead.id}-drawer-email`;
  const phoneCopyId = `${lead.id}-drawer-phone`;

  return (
    <>
      <div
        className="drawer-backdrop-enter fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[6px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="drawer-panel-enter fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/10 bg-white/95 shadow-[-24px_0_48px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-xl"
        role="dialog"
        aria-modal
        aria-labelledby="lead-detail-title"
      >
        <header className="shrink-0 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white/80 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                Lead intelligence
              </p>
              <h2
                id="lead-detail-title"
                className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900"
              >
                {lead.companyName}
              </h2>
              <p className="mt-1 text-sm leading-snug text-slate-500">
                {lead.founderName}
                <span className="text-slate-300"> · </span>
                {lead.founderTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200/80 bg-white/80 p-2 text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700"
              aria-label="Close drawer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/40 px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <IndustryBadge industry={lead.industry} />
            <FundingRoundBadge round={lead.fundingRound} />
            <LeadScoreBadge score={lead.leadScore} />
            <StatusBadge status={lead.status} />
          </div>

          <LeadIntelligencePanel lead={lead} />

          <DraftDrawerSection
            lead={lead}
            onSave={() => onToggleSaved(lead.id)}
            onOpenDialog={
              onOpenDraftDialog ? () => onOpenDraftDialog(lead.id) : undefined
            }
          />

          <DrawerSection title="Overview">
            <p className="text-sm leading-relaxed text-slate-600">
              {lead.description}
            </p>
          </DrawerSection>

          <DrawerSection title="Funding & company">
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Amount raised" value={formatCurrency(lead.amountRaised)} />
              <DetailItem label="Funding date" value={formatDate(lead.fundingDate)} />
              <DetailItem label="Location" value={lead.location} />
              <DetailItem label="Employees" value={String(lead.employeeCount)} />
              <DetailItem label="Source" value={lead.source} />
              <DetailItem label="Round" value={lead.fundingRound} />
            </div>
          </DrawerSection>

          <DrawerSection title="Investors">
            <ul className="flex flex-wrap gap-2">
              {lead.investors.map((inv) => (
                <li
                  key={inv}
                  className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                >
                  {inv}
                </li>
              ))}
            </ul>
          </DrawerSection>

          <DrawerSection title="Contact" className="mb-0">
            <div className="space-y-2.5">
              <ContactRow
                label="Email"
                value={lead.email}
                copied={copiedId === emailCopyId}
                onCopy={() => onCopy(lead.email, emailCopyId)}
              />
              <ContactRow
                label="Phone"
                value={lead.phone}
                copied={copiedId === phoneCopyId}
                onCopy={() => onCopy(lead.phone, phoneCopyId)}
              />
            </div>
          </DrawerSection>
        </div>

        <footer className="shrink-0 flex gap-2.5 border-t border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onToggleSaved(lead.id)}
            aria-pressed={lead.saved}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 ${
              lead.saved
                ? "border-indigo-400/80 bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-indigo-600/25 ring-2 ring-indigo-200/80 hover:from-indigo-700 hover:to-indigo-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill={lead.saved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {lead.saved ? "Saved" : "Save lead"}
          </button>
        </footer>
      </aside>
    </>
  );
}

function DrawerSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mb-5 rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm ${className}`}
    >
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function DraftDrawerSection({
  lead,
  onSave,
  onOpenDialog,
}: {
  lead: Lead;
  onSave: () => void;
  onOpenDialog?: () => void;
}) {
  return (
    <section
      id="lead-drawer-draft"
      className="mb-5 scroll-mt-24 rounded-xl border border-indigo-200/70 bg-gradient-to-b from-indigo-50/60 to-white p-4 shadow-sm ring-1 ring-indigo-200/40"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          AI outreach draft
        </h3>
        {lead.saved ? (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Draft ready
          </span>
        ) : null}
      </div>

      {onOpenDialog ? (
        <LeadEmailDraftSummaryCard
          lead={lead}
          onSave={onSave}
          onOpenDialog={onOpenDialog}
        />
      ) : null}
    </section>
  );
}

function ContactRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
          copied
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
