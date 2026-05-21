import type {
  LeadCrmContext,
  OperationalIndicatorTone,
} from "@/types/crm-workflow";

const TONE_CLASS: Record<OperationalIndicatorTone, string> = {
  neutral: "text-slate-500 bg-slate-100/70 ring-slate-200/50",
  positive: "text-emerald-700/90 bg-emerald-50/80 ring-emerald-200/45",
  attention: "text-amber-800/90 bg-amber-50/75 ring-amber-200/45",
  fresh: "text-indigo-700/90 bg-indigo-50/80 ring-indigo-200/50",
};

interface LeadIntelligenceStripProps {
  context: LeadCrmContext;
  compact?: boolean;
}

export function LeadIntelligenceStrip({
  context,
  compact = false,
}: LeadIntelligenceStripProps) {
  const visible = compact
    ? context.indicators.slice(0, 2)
    : context.indicators;

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      aria-label="Lead operational signals"
    >
      <span
        className="inline-flex items-center gap-1 text-[9px] text-slate-400"
        title={`Last activity ${context.lastActivityLabel}`}
      >
        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
        {context.lastActivityLabel}
      </span>
      {visible.map((ind) => (
        <span
          key={ind.id}
          className={`inline-flex max-w-full truncate rounded-md px-1.5 py-px text-[9px] font-medium ring-1 ring-inset ${TONE_CLASS[ind.tone]}`}
        >
          {ind.label}
        </span>
      ))}
    </div>
  );
}
