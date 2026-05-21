import type { Lead } from "@/types/lead";

/** Kanban column identifiers — stable for future drag-and-drop state keys. */
export type PipelineStage = "new" | "contacted" | "qualified" | "closed";

export interface PipelineColumnConfig {
  id: PipelineStage;
  title: string;
  description: string;
}

export const PIPELINE_COLUMNS: PipelineColumnConfig[] = [
  {
    id: "new",
    title: "New",
    description: "Fresh funding signals awaiting first touch",
  },
  {
    id: "contacted",
    title: "Contacted",
    description: "Outreach started — awaiting response",
  },
  {
    id: "qualified",
    title: "Qualified",
    description: "High-fit opportunities in active evaluation",
  },
  {
    id: "closed",
    title: "Closed",
    description: "Won, lost, or parked for later",
  },
];

export type PipelineBoardState = Record<PipelineStage, Lead[]>;
