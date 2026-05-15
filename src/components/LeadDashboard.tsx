"use client";

import { useCallback, useMemo, useState } from "react";
import { INITIAL_LEADS } from "@/data/leads";
import type { Lead, SortOption } from "@/types/lead";
import { DEFAULT_FILTERS } from "@/types/lead";
import {
  computeSummary,
  filterLeads,
  getUniqueValues,
  sortLeads,
} from "@/lib/lead-utils";
import { SummaryCards } from "@/components/SummaryCards";
import { LeadFilters } from "@/components/LeadFilters";
import { LeadTable } from "@/components/LeadTable";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { LiveProductMeta } from "@/components/LiveProductMeta";

function PrototypeNotice() {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 shadow-md shadow-black/10 ring-1 ring-white/[0.06] backdrop-blur-md"
      role="note"
    >
      <svg
        className="h-3.5 w-3.5 shrink-0 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <p className="text-xs leading-snug text-slate-300/90">
        Preview dataset · {INITIAL_LEADS.length} sample leads
      </p>
    </div>
  );
}

export function LeadDashboard() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("newest-funded");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const industries = useMemo(() => getUniqueValues(leads, "industry"), [leads]);
  const fundingRounds = useMemo(
    () => getUniqueValues(leads, "fundingRound"),
    [leads],
  );
  const statuses = useMemo(() => getUniqueValues(leads, "status"), [leads]);

  const filteredLeads = useMemo(() => {
    const filtered = filterLeads(leads, search, filters);
    return sortLeads(filtered, sort);
  }, [leads, search, filters, sort]);

  const summary = useMemo(() => computeSummary(leads), [leads]);

  const handleReset = useCallback(() => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    setSort("newest-funded");
  }, []);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setCopiedId(null);
    }
  }, []);

  const handleToggleSaved = useCallback((id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, saved: !l.saved } : l)),
    );
    setSelectedLead((prev) =>
      prev?.id === id ? { ...prev, saved: !prev.saved } : prev,
    );
  }, []);

  const handleViewDetails = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  const drawerLead = selectedLead
    ? leads.find((l) => l.id === selectedLead.id) ?? selectedLead
    : null;

  return (
    <div className="min-h-screen bg-[#0b0f14]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(139,92,246,0.08),transparent)]" />

      <header className="relative border-b border-white/[0.06] bg-[#0b0f14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1366px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                WhoRaised Leads
              </h1>
              <p className="text-[11px] text-slate-500">Lead intelligence demo</p>
            </div>
          </div>
          <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-0.5 text-[11px] font-medium text-indigo-300 ring-1 ring-indigo-500/20">
            Client preview
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1366px] px-5 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Lead pipeline
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Recently funded startups — search, filter, and prioritize outreach.
            </p>
          </div>
          <LiveProductMeta verifiedCount={leads.length} variant="header" />
        </div>

        <PrototypeNotice />

        <SummaryCards
          total={summary.total}
          newThisWeek={summary.newThisWeek}
          highScore={summary.highScore}
          saved={summary.saved}
        />

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-xl shadow-black/20 ring-1 ring-slate-900/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Lead list
            </h3>
            <LiveProductMeta verifiedCount={filteredLeads.length} />
          </div>

          <div className="space-y-3 p-3">
            <LeadFilters
              search={search}
              onSearchChange={setSearch}
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              industries={industries}
              fundingRounds={fundingRounds}
              statuses={statuses}
              resultCount={filteredLeads.length}
              onReset={handleReset}
            />

            <LeadTable
              leads={filteredLeads}
              copiedId={copiedId}
              activeLeadId={selectedLead?.id ?? null}
              savedOnlyActive={filters.savedOnly}
              onCopy={handleCopy}
              onToggleSaved={handleToggleSaved}
              onViewDetails={handleViewDetails}
            />
          </div>
        </section>
      </main>

      <LeadDetailDrawer
        lead={drawerLead}
        onClose={() => setSelectedLead(null)}
        onToggleSaved={handleToggleSaved}
        onCopy={handleCopy}
        copiedId={copiedId}
      />
    </div>
  );
}
