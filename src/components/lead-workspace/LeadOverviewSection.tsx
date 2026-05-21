import type { LeadDrawerProfile } from "@/types/lead-drawer";
import type { LeadWorkspaceMeta } from "@/types/pipeline-workspace";
import { WorkspaceOwnerBadge } from "@/components/pipeline/workspace/WorkspaceOwnerBadge";
import { formatCurrency } from "@/lib/lead-utils";
import { CompanyAvatar } from "@/components/pipeline/CompanyAvatar";
import { PipelineScoreChip } from "@/components/pipeline/PipelineScoreChip";
import { LeadIntelligenceStrip } from "@/components/pipeline/intelligence/LeadIntelligenceStrip";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";

const HEALTH_LABEL = {
  high: "High engagement",
  steady: "Steady engagement",
  low: "Low engagement",
} as const;

const URGENCY_LABEL = {
  high: "High urgency",
  medium: "Medium urgency",
  low: "Low urgency",
} as const;

export function LeadOverviewSection({
  profile,
  workspaceMeta,
}: {
  profile: LeadDrawerProfile;
  workspaceMeta?: LeadWorkspaceMeta;
}) {
  const { lead, crm, stageLabel } = profile;

  return (
    <DrawerSection id="drawer-overview" title="Lead overview">
      <div className="flex gap-3">
        <CompanyAvatar companyName={lead.companyName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{lead.companyName}</p>
          <p className="text-xs text-slate-500">
            {lead.founderName} · {lead.founderTitle}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{lead.industry}</p>
        </div>
        <PipelineScoreChip score={lead.leadScore} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Raised" value={formatCurrency(lead.amountRaised)} />
        <Metric label="Stage" value={stageLabel} />
        <Metric label="Engagement" value={HEALTH_LABEL[crm.engagementHealth]} />
        <Metric label="Urgency" value={URGENCY_LABEL[crm.urgency]} />
        <Metric label="Outreach" value={lead.outreachReadiness} />
        <Metric label="Warmth" value={crm.warmth} className="capitalize" />
      </div>

      {workspaceMeta ? (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
              Assigned to
            </p>
            <WorkspaceOwnerBadge meta={workspaceMeta} />
          </div>
          <p className="text-[10px] text-slate-500">
            Touched {workspaceMeta.lastTouchedLabel}
          </p>
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-100 pt-2.5">
        <LeadIntelligenceStrip context={crm} />
      </div>
    </DrawerSection>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 text-[11px] font-semibold text-slate-800 ${className}`}>
        {value}
      </p>
    </div>
  );
}
