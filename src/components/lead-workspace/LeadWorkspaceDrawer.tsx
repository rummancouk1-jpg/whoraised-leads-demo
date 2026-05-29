"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/types/lead";
import type { LeadDrawerProfile } from "@/types/lead-drawer";
import type { LeadDrawerSectionId } from "@/types/lead-drawer";
import { LEAD_DRAWER_SECTIONS } from "@/types/lead-drawer";
import type { LeadWorkspaceMeta } from "@/types/pipeline-workspace";
import { buildLeadDrawerProfile } from "@/lib/lead-drawer-intelligence";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { usePipelineWorkspaceOptional } from "@/contexts/PipelineWorkspaceContext";
import { LeadOverviewSection } from "@/components/lead-workspace/LeadOverviewSection";
import { LeadAiIntelligenceSection } from "@/components/lead-workspace/LeadAiIntelligenceSection";
import { LeadEmailDraftSection } from "@/components/lead-workspace/LeadEmailDraftSection";
import { LeadActivitySection } from "@/components/lead-workspace/LeadActivitySection";
import { LeadActionsSection } from "@/components/lead-workspace/LeadActionsSection";
import { LeadContactIntelSection } from "@/components/lead-workspace/LeadContactIntelSection";

interface DrawerPanelProps {
  profile: LeadDrawerProfile;
  lead: Lead;
  workspaceMeta?: LeadWorkspaceMeta;
  onClose: () => void;
  onToggleSaved?: (leadId: string) => void;
}

function LeadWorkspaceDrawerPanel({
  profile,
  lead,
  workspaceMeta,
  onClose,
  onToggleSaved,
}: DrawerPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<LeadDrawerSectionId>("overview");

  useFocusTrap(panelRef, true);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setCopiedId(null);
    }
  }, []);

  const scrollToSection = (id: LeadDrawerSectionId) => {
    setActiveSection(id);
    document.getElementById(`drawer-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <aside
      ref={panelRef}
      className="drawer-panel-enter fixed inset-y-0 right-0 z-[70] flex h-[100dvh] max-h-[100dvh] w-full max-w-[min(100%,420px)] flex-col border-l border-white/10 bg-white shadow-[-20px_0_40px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/5 sm:max-w-md md:max-w-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-drawer-title"
    >
      <header className="sticky top-0 z-10 shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
              Lead workspace
            </p>
            <h2
              id="workspace-drawer-title"
              className="mt-1 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg"
            >
              {lead.companyName}
            </h2>
            <p className="truncate text-[11px] text-slate-500">
              {profile.stageLabel} · {lead.founderName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200/80 p-1.5 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-400/50"
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav
          className="mt-3 flex gap-1 overflow-x-auto pb-0.5"
          aria-label="Drawer sections"
        >
          {LEAD_DRAWER_SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
                activeSection === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50/30 to-white px-4 py-4 sm:px-5">
        <LeadOverviewSection profile={profile} workspaceMeta={workspaceMeta} />
        <LeadAiIntelligenceSection profile={profile} />
        <LeadEmailDraftSection lead={lead} onSave={onToggleSaved} />
        <LeadActivitySection profile={profile} />
        <LeadActionsSection profile={profile} />
        <LeadContactIntelSection
          profile={profile}
          onCopy={handleCopy}
          copiedId={copiedId}
        />
      </div>

      <footer className="sticky bottom-0 shrink-0 flex gap-2 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          Close
        </button>
        {onToggleSaved ? (
          <button
            type="button"
            onClick={() => onToggleSaved(lead.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
              lead.saved
                ? "border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            {lead.saved ? "Saved" : "Save lead"}
          </button>
        ) : null}
      </footer>
    </aside>
  );
}

export function LeadWorkspaceDrawer() {
  const {
    drawerSelection,
    closeLeadDrawer,
    getLeadContext,
    resolveDrawerLead,
    onToggleSaved,
  } = usePipelineCrm();

  const workspace = usePipelineWorkspaceOptional();
  const lead = resolveDrawerLead();
  const crm = drawerSelection ? getLeadContext(drawerSelection.leadId) : undefined;
  const workspaceMeta = lead ? workspace?.getWorkspaceMeta(lead.id) : undefined;

  const profile = useMemo(() => {
    if (!lead || !crm || !drawerSelection) return null;
    return buildLeadDrawerProfile(lead, drawerSelection.stageId, crm);
  }, [lead, crm, drawerSelection]);

  const isOpen = Boolean(profile && lead);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLeadDrawer();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeLeadDrawer]);

  if (!profile || !lead) return null;

  return (
    <>
      <div
        className="drawer-backdrop-enter fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[4px]"
        onClick={closeLeadDrawer}
        role="presentation"
      />
      <LeadWorkspaceDrawerPanel
        key={lead.id}
        profile={profile}
        lead={lead}
        workspaceMeta={workspaceMeta}
        onClose={closeLeadDrawer}
        onToggleSaved={onToggleSaved}
      />
    </>
  );
}
