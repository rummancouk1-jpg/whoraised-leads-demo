"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Lead } from "@/types/lead";
import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import { PipelineCrmProvider, usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { usePipelineWorkspace } from "@/contexts/PipelineWorkspaceContext";
import {
  findLeadStage,
  isColumnDndId,
  resolveDropStage,
} from "@/lib/pipeline-dnd";
import {
  moveLeadInBoard,
  reorderLeadInColumn,
} from "@/lib/pipeline-utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PipelineDndColumn } from "@/components/pipeline/PipelineDndColumn";
import { PipelineDragOverlay } from "@/components/pipeline/PipelineDragOverlay";
import { PipelineWorkspaceBridge } from "@/components/pipeline/PipelineWorkspaceBridge";
import { PipelineHealthStrip } from "@/components/pipeline/intelligence/PipelineHealthStrip";
import { PipelineWorkspaceHeader } from "@/components/pipeline/workspace/PipelineWorkspaceHeader";
import { PipelineBoardEmpty } from "@/components/pipeline/workspace/PipelineBoardEmpty";
import { LeadWorkspaceDrawer } from "@/components/lead-workspace/LeadWorkspaceDrawer";

interface PipelineDndBoardProps {
  initialBoard: PipelineBoardState;
}

interface PipelineDndBoardContentProps {
  board: PipelineBoardState;
  setBoard: Dispatch<SetStateAction<PipelineBoardState>>;
}

function PipelineDndBoardContent({
  board,
  setBoard,
}: PipelineDndBoardContentProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { recordStageChange, pulseStage } = usePipelineCrm();
  const { displayBoard, visibleCount } = usePipelineWorkspace();

  const boardSnapshot = useRef<PipelineBoardState | null>(null);
  const dragOverRef = useRef<{ activeId: string; overId: string } | null>(null);
  const dragOriginStage = useRef<PipelineStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeStage = activeLead
    ? findLeadStage(board, activeLead.id)
    : null;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const leadId = String(event.active.id);
      const stage = findLeadStage(board, leadId);
      if (!stage) return;

      boardSnapshot.current = board;
      dragOriginStage.current = stage;
      dragOverRef.current = null;
      const lead = board[stage].find((l) => l.id === leadId) ?? null;
      setActiveLead(lead);
    },
    [board],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (
        dragOverRef.current?.activeId === activeId &&
        dragOverRef.current?.overId === overId
      ) {
        return;
      }
      dragOverRef.current = { activeId, overId };

      setBoard((prev) => {
        const activeContainer = findLeadStage(prev, activeId);
        const overContainer = resolveDropStage(prev, overId);
        if (!activeContainer || !overContainer) return prev;

        if (activeContainer === overContainer) {
          if (isColumnDndId(overId) || activeId === overId) return prev;
          return reorderLeadInColumn(prev, activeContainer, activeId, overId);
        }

        const overItems = prev[overContainer];
        let toIndex = overItems.length;
        if (!isColumnDndId(overId)) {
          const overIndex = overItems.findIndex((l) => l.id === overId);
          if (overIndex >= 0) toIndex = overIndex;
        }

        return moveLeadInBoard(prev, activeId, overContainer, toIndex);
      });
    },
    [setBoard],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);
      const originStage = dragOriginStage.current;

      if (over) {
        const overId = String(over.id);

        setBoard((prev) => {
          const activeContainer = findLeadStage(prev, activeId);
          const overContainer = resolveDropStage(prev, overId);
          if (!activeContainer || !overContainer) return prev;

          let next = prev;

          if (
            activeContainer === overContainer &&
            !isColumnDndId(overId) &&
            activeId !== overId
          ) {
            next = reorderLeadInColumn(prev, activeContainer, activeId, overId);
          }

          if (originStage && overContainer && originStage !== overContainer) {
            recordStageChange(activeId, overContainer);
          }

          return next;
        });
      }

      setActiveLead(null);
      dragOverRef.current = null;
      boardSnapshot.current = null;
      dragOriginStage.current = null;
    },
    [recordStageChange, setBoard],
  );

  const handleDragCancel = useCallback(() => {
    if (boardSnapshot.current) {
      setBoard(boardSnapshot.current);
    }
    setActiveLead(null);
    dragOverRef.current = null;
    boardSnapshot.current = null;
    dragOriginStage.current = null;
  }, [setBoard]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <PipelineWorkspaceHeader />
      <PipelineHealthStrip />

      {visibleCount === 0 ? (
        <PipelineBoardEmpty />
      ) : (
        <div className="pipeline-board-shell relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#0d1118] to-transparent sm:w-10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#0d1118] to-transparent sm:w-10"
            aria-hidden
          />

          <div
            className="pipeline-board-scroll flex gap-2.5 overflow-x-auto overscroll-x-contain px-0.5 pb-1 pt-0.5 md:gap-3 lg:gap-3.5"
            role="region"
            aria-label="Lead pipeline board"
            aria-busy={activeLead ? true : undefined}
          >
            {PIPELINE_COLUMNS.map((column) => (
              <PipelineDndColumn
                key={column.id}
                column={column}
                leads={displayBoard[column.id]}
                reducedMotion={reducedMotion}
                isDropTarget={Boolean(activeLead)}
                isStagePulse={pulseStage === column.id}
              />
            ))}
          </div>
        </div>
      )}

      <DragOverlay
        dropAnimation={
          reducedMotion
            ? null
            : {
                duration: 220,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              }
        }
        modifiers={[restrictToWindowEdges]}
      >
        {activeLead && activeStage ? (
          <PipelineDragOverlay lead={activeLead} stageId={activeStage} />
        ) : null}
      </DragOverlay>

      <LeadWorkspaceDrawer />
    </DndContext>
  );
}

export function PipelineDndBoard({ initialBoard }: PipelineDndBoardProps) {
  const [board, setBoard] = useState<PipelineBoardState>(initialBoard);

  return (
    <PipelineCrmProvider board={board} setBoard={setBoard}>
      <PipelineWorkspaceBridge fullBoard={board}>
        <PipelineDndBoardContent board={board} setBoard={setBoard} />
      </PipelineWorkspaceBridge>
    </PipelineCrmProvider>
  );
}
