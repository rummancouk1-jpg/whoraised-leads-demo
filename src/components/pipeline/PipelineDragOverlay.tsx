"use client";

import type { Lead } from "@/types/lead";
import type { PipelineStage } from "@/types/pipeline";
import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { PipelineCard } from "@/components/pipeline/PipelineCard";

interface PipelineDragOverlayProps {
  lead: Lead;
  stageId: PipelineStage;
}

export function PipelineDragOverlay({ lead, stageId }: PipelineDragOverlayProps) {
  const { getLeadContext } = usePipelineCrm();
  const crmContext = getLeadContext(lead.id);

  return (
    <div className="pipeline-drag-overlay w-[248px] max-w-[280px] will-change-transform">
      <PipelineCard
        lead={lead}
        stageId={stageId}
        variant="overlay"
        crmContext={crmContext}
      />
    </div>
  );
}
