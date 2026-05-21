"use client";

import { useMemo } from "react";
import { INITIAL_LEADS } from "@/data/leads";
import { groupLeadsByPipelineStage } from "@/lib/pipeline-utils";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { LiveProductMeta } from "@/components/LiveProductMeta";

const PIPELINE_MAX_W = "mx-auto w-full max-w-[1320px]";

export function PipelineView() {
  const initialBoard = useMemo(
    () => groupLeadsByPipelineStage(INITIAL_LEADS),
    [],
  );

  const totalLeads = INITIAL_LEADS.length;

  return (
    <div className="min-h-screen bg-[#0b0f14]">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(99,102,241,0.09),transparent_70%)]"
        aria-hidden
      />

      <header className="relative border-b border-white/[0.06] bg-[#0b0f14]/90 backdrop-blur-xl">
        <div
          className={`flex ${PIPELINE_MAX_W} flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-6`}
        >
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-white">
              Pipeline
            </h1>
            <p className="mt-1 max-w-md text-[12px] leading-snug text-slate-400">
              Team workspace — saved views, filters, and pipeline operations.
            </p>
          </div>
          <LiveProductMeta verifiedCount={totalLeads} variant="header" />
        </div>
      </header>

      <main className={`relative ${PIPELINE_MAX_W} px-5 py-6 sm:px-6 sm:py-7`}>
        <p
          className="mb-3 flex items-center gap-2 text-[11px] leading-snug text-slate-500"
          role="note"
        >
          <svg
            className="h-3 w-3 shrink-0 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <span>
            Drag cards to advance stages — click any card to open its workspace.
            <span className="px-1.5 text-slate-700">·</span>
            <span className="tabular-nums text-slate-400">{totalLeads}</span> leads
          </span>
        </p>

        <section className="pipeline-board-panel relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d1118]/85 p-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] sm:p-2.5">
          <div className="relative">
            <PipelineBoard initialBoard={initialBoard} />
          </div>
        </section>
      </main>
    </div>
  );
}
