"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/types/lead";
import type { PipelineStage } from "@/types/pipeline";
import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";
import { PipelineCard } from "@/components/pipeline/PipelineCard";

interface SortablePipelineCardProps {
  lead: Lead;
  stageId: PipelineStage;
  reducedMotion: boolean;
}

export function SortablePipelineCard({
  lead,
  stageId,
  reducedMotion,
}: SortablePipelineCardProps) {
  const { getLeadContext, openLeadDrawer } = usePipelineCrm();
  const { getWorkspaceMeta } = usePipelineWorkspace();
  const crmContext = getLeadContext(lead.id);
  const workspaceMeta = getWorkspaceMeta(lead.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "lead", stageId, lead },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[10px] outline-none focus-within:ring-2 focus-within:ring-indigo-400/40 focus-within:ring-offset-1 focus-within:ring-offset-[#0c1018] ${
        isDragging ? "pipeline-card-slot--active" : ""
      }`}
    >
      {isDragging ? (
        <div
          className="pipeline-card-slot rounded-[10px] border border-dashed border-white/[0.09] bg-white/[0.015]"
          style={{ height: "var(--pipeline-card-h, 132px)" }}
          aria-hidden
        />
      ) : (
        <PipelineCard
          lead={lead}
          stageId={stageId}
          crmContext={crmContext}
          workspaceMeta={workspaceMeta}
          bodyDragProps={{ listeners }}
          handleProps={{
            attributes,
            setActivatorNode: setActivatorNodeRef,
          }}
          onOpen={() => openLeadDrawer(lead, stageId)}
        />
      )}
    </div>
  );
}
