import type { HTMLAttributes } from "react";
import type { Lead } from "@/types/lead";
import type { LeadCrmContext } from "@/types/crm-workflow";
import { formatCurrency } from "@/lib/lead-utils";
import type { PipelineStage } from "@/types/pipeline";
import { CompanyAvatar } from "@/components/pipeline/CompanyAvatar";
import { PipelineCardDragHandle } from "@/components/pipeline/PipelineCardDragHandle";
import { PipelineScoreChip } from "@/components/pipeline/PipelineScoreChip";
import {
  PipelineCardIntelligence,
  type IntelligenceDisplayMode,
} from "@/components/pipeline/intelligence/PipelineCardIntelligence";
import { WorkspaceOwnerBadge } from "@/components/pipeline/workspace/WorkspaceOwnerBadge";
import type { LeadWorkspaceMeta } from "@/types/pipeline-workspace";

export type PipelineCardVariant = "default" | "overlay" | "ghost";

interface PipelineCardProps {
  lead: Lead;
  stageId: PipelineStage;
  variant?: PipelineCardVariant;
  crmContext?: LeadCrmContext;
  workspaceMeta?: LeadWorkspaceMeta;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  onOpen?: () => void;
}

const VARIANT_CLASS: Record<PipelineCardVariant, string> = {
  default:
    "pipeline-card group/pipeline-card cursor-pointer rounded-[10px] border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_0_0_1px_rgba(255,255,255,0.6)_inset] transition-[transform,box-shadow,border-color,background,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-200/70 hover:from-white hover:to-white hover:shadow-[0_4px_14px_-2px_rgba(99,102,241,0.12),0_2px_6px_-2px_rgba(15,23,42,0.06)]",
  overlay:
    "pipeline-card--overlay cursor-grabbing rounded-[10px] border border-indigo-200/80 bg-white shadow-[0_12px_28px_-6px_rgba(99,102,241,0.22),0_4px_12px_-4px_rgba(15,23,42,0.12)] ring-1 ring-indigo-500/15",
  ghost:
    "pipeline-card--ghost rounded-[10px] border border-dashed border-slate-200/50 bg-slate-50/40 opacity-60",
};

function intelligenceMode(variant: PipelineCardVariant): IntelligenceDisplayMode {
  if (variant === "ghost") return "none";
  if (variant === "overlay") return "compact";
  return "full";
}

export function PipelineCard({
  lead,
  stageId,
  variant = "default",
  crmContext,
  workspaceMeta,
  dragHandleProps,
  onOpen,
}: PipelineCardProps) {
  const mode = intelligenceMode(variant);
  const isInteractive = variant === "default" && onOpen;

  return (
    <article
      data-lead-id={lead.id}
      data-pipeline-stage={stageId}
      data-urgency={crmContext?.urgency}
      className={`relative px-2.5 py-2 ${VARIANT_CLASS[variant]}`}
      onClick={isInteractive ? onOpen : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Open ${lead.companyName} workspace` : undefined}
    >
      {variant === "default" ? (
        <div
          className="pointer-events-none absolute inset-x-2.5 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent opacity-0 transition-opacity duration-200 group-hover/pipeline-card:opacity-100"
          aria-hidden
        />
      ) : null}

      <div className="flex gap-2">
        <CompanyAvatar companyName={lead.companyName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h4 className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-slate-900">
              {lead.companyName}
            </h4>
            <div className="flex shrink-0 items-center gap-0.5">
              {dragHandleProps ? (
                <PipelineCardDragHandle handleProps={dragHandleProps} />
              ) : null}
              {lead.saved ? (
                <span
                  className="text-indigo-500/80"
                  title="Saved lead"
                  aria-label="Saved"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </span>
              ) : null}
            </div>
          </div>

          <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500">
            {lead.founderName}
          </p>
        </div>
      </div>

      {crmContext ? (
        <PipelineCardIntelligence context={crmContext} mode={mode} />
      ) : null}

      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex max-w-[calc(100%-4rem)] truncate rounded-md bg-slate-100/80 px-1.5 py-px text-[10px] font-medium text-slate-600">
          {lead.industry}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-50/90 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/50"
          title={lead.fundingRound}
        >
          {lead.fundingRound.replace("Series ", "S")}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 border-t border-slate-100/90 pt-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
            Raised
          </p>
          <p className="text-[12px] font-semibold tabular-nums tracking-tight text-slate-900">
            {formatCurrency(lead.amountRaised)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PipelineScoreChip score={lead.leadScore} />
          {workspaceMeta && variant === "default" ? (
            <WorkspaceOwnerBadge meta={workspaceMeta} compact />
          ) : null}
        </div>
      </div>
    </article>
  );
}
