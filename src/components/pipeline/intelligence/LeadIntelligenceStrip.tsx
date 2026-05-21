import type {
  LeadCrmContext,
  OperationalIndicatorTone,
} from "@/types/crm-workflow";

const TONE_LIGHT: Record<OperationalIndicatorTone, string> = {
  neutral: "text-slate-500 bg-slate-100/70 ring-slate-200/50",
  positive: "text-emerald-700/90 bg-emerald-50/80 ring-emerald-200/45",
  attention: "text-amber-800/90 bg-amber-50/75 ring-amber-200/45",
  fresh: "text-indigo-700/90 bg-indigo-50/80 ring-indigo-200/50",
};

const TONE_PIPELINE: Record<OperationalIndicatorTone, string> = {
  neutral: "text-slate-400 bg-white/[0.05] ring-white/[0.08]",
  positive: "text-emerald-300/95 bg-emerald-500/12 ring-emerald-400/20",
  attention: "text-amber-200/95 bg-amber-500/12 ring-amber-400/20",
  fresh: "text-indigo-200/95 bg-indigo-500/12 ring-indigo-400/20",
};

interface LeadIntelligenceStripProps {
  context: LeadCrmContext;
  compact?: boolean;
  surface?: "light" | "pipeline";
}

export function LeadIntelligenceStrip({
  context,
  compact = false,
  surface = "light",
}: LeadIntelligenceStripProps) {
  const visible = compact
    ? context.indicators.slice(0, 2)
    : context.indicators;
  const tones = surface === "pipeline" ? TONE_PIPELINE : TONE_LIGHT;
  const activityDot =
    surface === "pipeline" ? "bg-slate-500" : "bg-slate-300";
  const activityText =
    surface === "pipeline" ? "text-slate-500" : "text-slate-400";

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      aria-label="Lead operational signals"
    >
      <span
        className={`inline-flex items-center gap-1 text-[9px] ${activityText}`}
        title={`Last activity ${context.lastActivityLabel}`}
      >
        <span className={`h-1 w-1 rounded-full ${activityDot}`} aria-hidden />
        {context.lastActivityLabel}
      </span>
      {visible.map((ind) => (
        <span
          key={ind.id}
          className={`inline-flex max-w-full truncate rounded-md px-1.5 py-px text-[9px] font-medium ring-1 ring-inset ${tones[ind.tone]}`}
        >
          {ind.label}
        </span>
      ))}
    </div>
  );
}
