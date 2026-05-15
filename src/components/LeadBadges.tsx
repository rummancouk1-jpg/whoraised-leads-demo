import type { FundingRound, LeadStatus } from "@/types/lead";
import { getScoreTier } from "@/lib/lead-utils";

export function IndustryBadge({ industry }: { industry: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200/60">
      {industry}
    </span>
  );
}

export function FundingRoundBadge({ round }: { round: FundingRound }) {
  const styles: Record<FundingRound, string> = {
    "Pre-Seed": "bg-sky-50 text-sky-700 ring-sky-200/60",
    Seed: "bg-cyan-50 text-cyan-700 ring-cyan-200/60",
    "Series A": "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
    "Series B": "bg-violet-50 text-violet-700 ring-violet-200/60",
    "Series C": "bg-purple-50 text-purple-700 ring-purple-200/60",
    Bridge: "bg-amber-50 text-amber-700 ring-amber-200/60",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[round]}`}
    >
      {round}
    </span>
  );
}

export function LeadScoreBadge({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const styles = {
    high: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    medium: "bg-amber-50 text-amber-700 ring-amber-200/70",
    low: "bg-slate-100 text-slate-600 ring-slate-200/70",
  };
  const dotStyles = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset ${styles[tier]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotStyles[tier]}`}
        aria-hidden
      />
      {score}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const styles: Record<LeadStatus, string> = {
    New: "bg-blue-50 text-blue-700 ring-blue-200/60",
    Contacted: "bg-violet-50 text-violet-700 ring-violet-200/60",
    Qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    Nurturing: "bg-amber-50 text-amber-700 ring-amber-200/60",
    Archived: "bg-slate-100 text-slate-500 ring-slate-200/60",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}
