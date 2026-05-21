import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";

const COLUMN_PREFIX = "column:" as const;

export function columnDndId(stage: PipelineStage): string {
  return `${COLUMN_PREFIX}${stage}`;
}

export function parseColumnDndId(id: string): PipelineStage | null {
  if (!id.startsWith(COLUMN_PREFIX)) return null;
  const stage = id.slice(COLUMN_PREFIX.length) as PipelineStage;
  return PIPELINE_COLUMNS.some((c) => c.id === stage) ? stage : null;
}

export function isColumnDndId(id: string | number): boolean {
  return String(id).startsWith(COLUMN_PREFIX);
}

export function findLeadStage(
  board: PipelineBoardState,
  leadId: string,
): PipelineStage | null {
  for (const { id } of PIPELINE_COLUMNS) {
    if (board[id].some((l) => l.id === leadId)) return id;
  }
  return null;
}

/** Resolves which column a drag pointer is over (card id or column droppable id). */
export function resolveDropStage(
  board: PipelineBoardState,
  overId: string | number,
): PipelineStage | null {
  const overStr = String(overId);
  const column = parseColumnDndId(overStr);
  if (column) return column;
  return findLeadStage(board, overStr);
}

export function getColumnLeadIds(board: PipelineBoardState): string[] {
  return PIPELINE_COLUMNS.flatMap((c) => board[c.id].map((l) => l.id));
}
