import type { HTMLAttributes, PointerEventHandler, Ref } from "react";
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

interface BodyDragProps {
  listeners?: {
    onPointerDown?: PointerEventHandler<HTMLElement>;
  } & Record<string, unknown>;
}

interface HandleProps {
  attributes?: HTMLAttributes<HTMLElement>;
  setActivatorNode?: Ref<HTMLButtonElement>;
}

interface PipelineCardProps {
  lead: Lead;
  stageId: PipelineStage;
  variant?: PipelineCardVariant;
  crmContext?: LeadCrmContext;
  workspaceMeta?: LeadWorkspaceMeta;
  bodyDragProps?: BodyDragProps;
  handleProps?: HandleProps;
  onOpen?: () => void;
}

const VARIANT_CLASS: Record<PipelineCardVariant, string> = {
  default:
    "pipeline-card group/pipeline-card cursor-pointer rounded-[10px] border border-white/[0.07] bg-[#151a23] shadow-[0_1px_2px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.035)] transition-[box-shadow,border-color,background-color] duration-150 ease-out hover:border-white/[0.13] hover:bg-[#171c26] hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c1018]",
  overlay:
    "pipeline-card--overlay cursor-grabbing rounded-[10px] border border-white/[0.12] bg-[#181e28] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.55),0_2px_4px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]",
  ghost:
    "pipeline-card--ghost rounded-[10px] border border-dashed border-white/[0.1] bg-[#12161d]/40",
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
  bodyDragProps,
  handleProps,
  onOpen,
}: PipelineCardProps) {
  const mode = intelligenceMode(variant);
  const isInteractive = variant === "default" && Boolean(onOpen);
  const onDarkSurface = variant !== "ghost";
  const bodyListeners = bodyDragProps?.listeners;
  const handleAttributes = handleProps?.attributes;
  const handleActivator = handleProps?.setActivatorNode;

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
                onOpen?.();
              }
            }
          : undefined
      }
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Open ${lead.companyName} workspace` : undefined}
      style={
        variant === "default"
          ? { touchAction: "none" }
          : undefined
      }
      {...(bodyListeners ?? {})}
    >
      {variant === "default" ? (
        <div
          className="pointer-events-none absolute inset-x-2.5 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent opacity-0 transition-opacity duration-150 group-hover/pipeline-card:opacity-100"
          aria-hidden
        />
      ) : null}

      <div className="flex gap-2">
        <CompanyAvatar companyName={lead.companyName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h4 className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-slate-100">
              {lead.companyName}
            </h4>
            <div className="flex shrink-0 items-center gap-0.5">
              {handleProps ? (
                <PipelineCardDragHandle
                  ref={handleActivator}
                  handleProps={handleAttributes ?? {}}
                />
              ) : null}
              {lead.saved ? (
                <span
                  className="text-indigo-400/90"
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
        <PipelineCardIntelligence
          context={crmContext}
          mode={mode}
          surface={onDarkSurface ? "pipeline" : "light"}
        />
      ) : null}

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="inline-flex max-w-[calc(100%-4rem)] truncate rounded-md bg-white/[0.05] px-1.5 py-px text-[10px] font-medium text-slate-300 ring-1 ring-inset ring-white/[0.05]">
          {lead.industry}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/[0.035] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-white/[0.05]"
          title={lead.fundingRound}
        >
          {lead.fundingRound.replace("Series ", "S")}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 border-t border-white/[0.05] pt-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Raised
          </p>
          <p className="text-[13px] font-semibold tabular-nums tracking-tight text-slate-100">
            {formatCurrency(lead.amountRaised)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PipelineScoreChip
            score={lead.leadScore}
            variant={onDarkSurface ? "pipeline" : "light"}
          />
          {workspaceMeta && variant === "default" ? (
            <WorkspaceOwnerBadge meta={workspaceMeta} compact />
          ) : null}
        </div>
      </div>
    </article>
  );
}
