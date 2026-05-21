"use client";

import type { PipelineHealthMetrics } from "@/types/crm-workflow";
import { usePipelineWorkspaceOptional } from "@/contexts/PipelineWorkspaceContext";

interface PipelineHealthStripProps {
  health?: PipelineHealthMetrics;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium tabular-nums text-slate-200">
        {value}
      </span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

export function PipelineHealthStrip({ health: healthProp }: PipelineHealthStripProps) {
  const workspace = usePipelineWorkspaceOptional();
  const health = healthProp ?? workspace?.filteredHealth;

  if (!health) return null;

  return (
    <div
      className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 ring-1 ring-white/[0.05] backdrop-blur-sm"
      aria-label="Pipeline health summary"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Metric label="in view" value={health.total} />
        <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden />
        <Metric label="hot leads" value={health.hotLeads} />
        <Metric label="active" value={health.activeOpportunities} />
        <Metric label="touched" value={health.recentlyTouched} />
      </div>
      <p className="text-[10px] font-medium text-indigo-300/80">{health.velocityLabel}</p>
    </div>
  );
}
