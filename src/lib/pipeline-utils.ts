import { arrayMove } from "@dnd-kit/sortable";
import type { Lead, LeadStatus } from "@/types/lead";
import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import { findLeadStage } from "@/lib/pipeline-dnd";

/** Maps dashboard lead statuses into the four Kanban pipeline stages. */
export function leadStatusToPipelineStage(status: LeadStatus): PipelineStage {
  switch (status) {
    case "New":
      return "new";
    case "Contacted":
      return "contacted";
    case "Qualified":
      return "qualified";
    case "Nurturing":
    case "Archived":
      return "closed";
    default:
      return "new";
  }
}

function sortColumnLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => b.leadScore - a.leadScore);
}

/** Groups enriched leads into pipeline columns for static (and future interactive) boards. */
export function groupLeadsByPipelineStage(leads: Lead[]): PipelineBoardState {
  const grouped: PipelineBoardState = {
    new: [],
    contacted: [],
    qualified: [],
    closed: [],
  };

  for (const lead of leads) {
    const stage = leadStatusToPipelineStage(lead.status);
    grouped[stage].push(lead);
  }

  for (const column of PIPELINE_COLUMNS) {
    grouped[column.id] = sortColumnLeads(grouped[column.id]);
  }

  return grouped;
}

/** Maps pipeline stage to CRM lead status for future API persistence. */
export function pipelineStageToLeadStatus(stage: PipelineStage): LeadStatus {
  switch (stage) {
    case "new":
      return "New";
    case "contacted":
      return "Contacted";
    case "qualified":
      return "Qualified";
    case "closed":
      return "Nurturing";
    default:
      return "New";
  }
}

/**
 * Moves a lead between columns (or repositions within one column).
 * Returns a new board reference — safe for optimistic React state updates.
 */
export function moveLeadInBoard(
  board: PipelineBoardState,
  leadId: string,
  toStage: PipelineStage,
  toIndex: number,
): PipelineBoardState {
  const fromStage = findLeadStage(board, leadId);
  if (!fromStage) return board;

  const lead = board[fromStage].find((l) => l.id === leadId);
  if (!lead) return board;

  const fromItems = board[fromStage].filter((l) => l.id !== leadId);
  const toItems = board[toStage].filter((l) => l.id !== leadId);
  const clampedIndex = Math.max(0, Math.min(toIndex, toItems.length));
  toItems.splice(clampedIndex, 0, lead);

  if (fromStage === toStage) {
    return { ...board, [toStage]: toItems };
  }

  return {
    ...board,
    [fromStage]: fromItems,
    [toStage]: toItems,
  };
}

/** Reorders a lead within a single column by active/over card ids. */
export function reorderLeadInColumn(
  board: PipelineBoardState,
  stage: PipelineStage,
  activeId: string,
  overId: string,
): PipelineBoardState {
  const items = board[stage];
  const oldIndex = items.findIndex((l) => l.id === activeId);
  const newIndex = items.findIndex((l) => l.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return board;

  return {
    ...board,
    [stage]: arrayMove(items, oldIndex, newIndex),
  };
}

/** Applies stage-derived status to lead records (for persistence layer). */
export function syncBoardLeadStatuses(
  board: PipelineBoardState,
): PipelineBoardState {
  const next = { ...board };
  for (const { id: stage } of PIPELINE_COLUMNS) {
    const status = pipelineStageToLeadStatus(stage);
    next[stage] = board[stage].map((lead) =>
      lead.status === status ? lead : { ...lead, status },
    );
  }
  return next;
}
