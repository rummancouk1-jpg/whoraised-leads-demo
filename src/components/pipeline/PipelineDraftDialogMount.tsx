"use client";

import { usePipelineCrm } from "@/contexts/PipelineCrmContext";
import { LeadEmailDraftDialog } from "@/components/outreach/LeadEmailDraftDialog";

/**
 * Mounts the dedicated Outreach Draft Studio dialog for the pipeline board.
 * State lives in `PipelineCrmContext` so the pipeline card chip and the
 * lead workspace drawer can both open it without prop-drilling.
 */
export function PipelineDraftDialogMount() {
  const { resolveDraftDialogLead, draftDialogLeadId, closeDraftDialog } =
    usePipelineCrm();
  const lead = resolveDraftDialogLead();

  return (
    <LeadEmailDraftDialog
      lead={lead}
      open={Boolean(lead && draftDialogLeadId)}
      onClose={closeDraftDialog}
    />
  );
}
