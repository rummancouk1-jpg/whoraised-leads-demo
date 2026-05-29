"use client";

import type { Lead } from "@/types/lead";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";
import { LeadEmailDraftSummaryCard } from "@/components/outreach/LeadEmailDraftSummaryCard";
import { usePipelineCrmOptional } from "@/contexts/PipelineCrmContext";

interface LeadEmailDraftSectionProps {
  lead: Lead;
  onSave?: (leadId: string) => void;
}

export function LeadEmailDraftSection({
  lead,
  onSave,
}: LeadEmailDraftSectionProps) {
  const crm = usePipelineCrmOptional();
  const handleOpenDialog = () => crm?.openDraftDialog(lead.id);

  return (
    <DrawerSection
      id="drawer-email-draft"
      title="AI outreach draft"
      className="border-indigo-200/70 bg-gradient-to-b from-indigo-50/40 to-white"
    >
      <LeadEmailDraftSummaryCard
        lead={lead}
        onSave={onSave ? () => onSave(lead.id) : undefined}
        onOpenDialog={handleOpenDialog}
      />
    </DrawerSection>
  );
}
