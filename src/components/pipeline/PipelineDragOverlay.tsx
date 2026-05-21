"use client";

import type { Lead } from "@/types/lead";
import type { PipelineStage } from "@/types/pipeline";
import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { PipelineCard } from "@/components/pipeline/PipelineCard";

interface PipelineDragOverlayProps {
  lead: Lead;
  stageId: PipelineStage;
  /** Pixel width of the source card, captured on drag start. */
  width?: number;
}

export function PipelineDragOverlay({
  lead,
  stageId,
  width,
}: PipelineDragOverlayProps) {
  const { getLeadContext } = usePipelineCrm();
  const crmContext = getLeadContext(lead.id);

  return (
    <div
      className="pipeline-drag-overlay will-change-transform"
      style={width ? { width: `${width}px` } : undefined}
    >
      <PipelineCard
        lead={lead}
        stageId={stageId}
        variant="overlay"
        crmContext={crmContext}
      />
    </div>
  );
}
