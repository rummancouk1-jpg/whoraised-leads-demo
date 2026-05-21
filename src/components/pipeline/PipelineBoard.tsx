"use client";

import type { PipelineBoardState } from "@/types/pipeline";
import { PipelineDndBoard } from "@/components/pipeline/PipelineDndBoard";

interface PipelineBoardProps {
  initialBoard: PipelineBoardState;
}

export function PipelineBoard({ initialBoard }: PipelineBoardProps) {
  return <PipelineDndBoard initialBoard={initialBoard} />;
}
