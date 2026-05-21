import type { PipelineStage } from "@/types/pipeline";
import { PIPELINE_STAGE_THEME } from "@/lib/pipeline-ui";

interface PipelineColumnEmptyProps {
  stageId: PipelineStage;
  isDropActive?: boolean;
}

export function PipelineColumnEmpty({
  stageId,
  isDropActive = false,
}: PipelineColumnEmptyProps) {
  const theme = PIPELINE_STAGE_THEME[stageId];

  return (
    <div
      className={`pipeline-column-empty flex min-h-[140px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center ring-1 ring-inset transition-[border-color,background-color,box-shadow] duration-200 ease-out ${
        isDropActive
          ? `border-white/[0.18] bg-white/[0.04] ${theme.dropRing} ${theme.dropGlow}`
          : "border-white/[0.1] bg-white/[0.015] ring-white/[0.04]"
      }`}
      aria-label="Empty column"
    >
      <div
        className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b ${theme.headerGlow} to-transparent ring-1 ring-white/[0.06]`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${theme.accent} opacity-60`} aria-hidden />
      </div>
      <p className="text-[11px] font-medium tracking-tight text-slate-400">
        No leads yet
      </p>
      <p className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-slate-500/80">
        {isDropActive
          ? "Release to place lead in this stage"
          : "Cards appear here when leads enter this stage"}
      </p>
    </div>
  );
}
