"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Lead } from "@/types/lead";
import type { PipelineColumnConfig } from "@/types/pipeline";
import { columnDndId } from "@/lib/pipeline-dnd";
import { PIPELINE_STAGE_THEME } from "@/lib/pipeline-ui";
import { SortablePipelineCard } from "@/components/pipeline/SortablePipelineCard";
import { PipelineColumnEmpty } from "@/components/pipeline/PipelineColumnEmpty";

interface PipelineDndColumnProps {
  column: PipelineColumnConfig;
  leads: Lead[];
  reducedMotion: boolean;
  isDropTarget: boolean;
  isStagePulse?: boolean;
}

export function PipelineDndColumn({
  column,
  leads,
  reducedMotion,
  isDropTarget,
  isStagePulse = false,
}: PipelineDndColumnProps) {
  const theme = PIPELINE_STAGE_THEME[column.id];
  const isEmpty = leads.length === 0;
  const leadIds = leads.map((l) => l.id);

  const { setNodeRef, isOver } = useDroppable({
    id: columnDndId(column.id),
    data: { type: "column", stageId: column.id },
  });

  const showDropHighlight = isDropTarget && (isOver || isEmpty);

  return (
    <section
      className={`pipeline-column flex w-[min(100%,300px)] min-w-[248px] max-w-[300px] shrink-0 flex-col xl:min-w-[260px] xl:max-w-[280px] ${
        isStagePulse ? "pipeline-column--pulse" : ""
      }`}
      data-pipeline-column={column.id}
      aria-label={`${column.title} column`}
    >
      <header className="pipeline-column-header sticky top-0 z-20 rounded-t-xl border border-b-0 border-white/[0.07] bg-[#111820]/90 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
        <div
          className={`pointer-events-none absolute inset-0 rounded-t-xl bg-gradient-to-b ${theme.headerGlow} to-transparent opacity-80`}
          aria-hidden
        />
        <div className="relative flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.accent} shadow-sm`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                {column.title}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset ${theme.countBg}`}
              >
                {leads.length}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">
              {column.description}
            </p>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          aria-hidden
        />
      </header>

      <div
        ref={setNodeRef}
        className={`pipeline-column-dropzone relative flex min-h-[160px] flex-1 flex-col rounded-b-xl border border-t-0 bg-[#0a0e14]/55 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,box-shadow,ring-color] duration-200 ease-out ${
          showDropHighlight
            ? `border-white/[0.1] ring-1 ring-inset ${theme.dropRing}`
            : "border-white/[0.06] ring-1 ring-white/[0.04]"
        } ${isEmpty ? "" : "gap-1.5"}`}
        data-drop-target={column.id}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#0c1018]/60 to-transparent"
          aria-hidden
        />

        <SortableContext
          items={leadIds}
          strategy={verticalListSortingStrategy}
        >
          {isEmpty ? (
            <PipelineColumnEmpty
              stageId={column.id}
              isDropActive={showDropHighlight}
            />
          ) : (
            leads.map((lead) => (
              <SortablePipelineCard
                key={lead.id}
                lead={lead}
                stageId={column.id}
                reducedMotion={reducedMotion}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
