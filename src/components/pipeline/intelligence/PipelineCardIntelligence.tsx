import type { LeadCrmContext } from "@/types/crm-workflow";
import { LeadActivityTimeline } from "@/components/pipeline/intelligence/LeadActivityTimeline";
import { LeadAiInsightPanel } from "@/components/pipeline/intelligence/LeadAiInsightPanel";
import { LeadIntelligenceStrip } from "@/components/pipeline/intelligence/LeadIntelligenceStrip";
import { LeadNextActions } from "@/components/pipeline/intelligence/LeadNextActions";

export type IntelligenceDisplayMode = "full" | "compact" | "none";

interface PipelineCardIntelligenceProps {
  context: LeadCrmContext;
  mode: IntelligenceDisplayMode;
}

export function PipelineCardIntelligence({
  context,
  mode,
}: PipelineCardIntelligenceProps) {
  if (mode === "none") return null;

  const compact = mode === "compact";

  return (
    <div className="pipeline-card-intelligence">
      <div className="mt-1.5">
        <LeadIntelligenceStrip context={context} compact={compact} />
      </div>

      <LeadAiInsightPanel insight={context.aiInsight} compact={compact} />

      {!compact ? (
        <>
          <div
            className="hidden group-hover/pipeline-card:block sm:block"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <LeadNextActions actions={context.nextActions} />
          </div>
          <div className="group-hover/pipeline-card:hidden sm:hidden">
            {context.nextActions[0] ? (
              <p className="mt-1 truncate text-[9px] text-slate-500">
                Next: {context.nextActions[0].label}
              </p>
            ) : null}
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <LeadActivityTimeline activities={context.activities} />
          </div>
        </>
      ) : null}
    </div>
  );
}
