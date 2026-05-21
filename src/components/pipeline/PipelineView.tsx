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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(139,92,246,0.08),transparent)]" />

      <header className="relative border-b border-white/[0.06] bg-[#0b0f14]/90 backdrop-blur-xl">
        <div
          className={`flex ${PIPELINE_MAX_W} flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-6`}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Pipeline
            </h1>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Team workspace — saved views, filters, and pipeline operations.
            </p>
          </div>
          <LiveProductMeta verifiedCount={totalLeads} variant="header" />
        </div>
      </header>

      <main className={`relative ${PIPELINE_MAX_W} px-5 py-6 sm:px-6 sm:py-7`}>
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
            Saved views & filters · click cards for workspace · {totalLeads} leads
            in workspace
          </p>
        </div>

        <section className="pipeline-board-panel relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d1118]/80 p-2.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.05] sm:p-3">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(99,102,241,0.06),transparent_55%)]"
            aria-hidden
          />
          <div className="relative">
            <PipelineBoard initialBoard={initialBoard} />
          </div>
        </section>
      </main>
    </div>
  );
}
