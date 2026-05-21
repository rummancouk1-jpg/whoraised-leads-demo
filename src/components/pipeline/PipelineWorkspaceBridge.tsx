"use client";

import type { ReactNode } from "react";
import type { PipelineBoardState } from "@/types/pipeline";
import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { PipelineWorkspaceProvider } from "@/contexts/PipelineWorkspaceContext";

export function PipelineWorkspaceBridge({
  fullBoard,
  children,
}: {
  fullBoard: PipelineBoardState;
  children: ReactNode;
}) {
  const { getLeadContext } = usePipelineCrm();

  return (
    <PipelineWorkspaceProvider
      fullBoard={fullBoard}
      getCrmContext={getLeadContext}
    >
      {children}
    </PipelineWorkspaceProvider>
  );
}
