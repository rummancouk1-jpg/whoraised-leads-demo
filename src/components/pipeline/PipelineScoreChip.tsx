import { getScoreTier } from "@/lib/lead-utils";

interface PipelineScoreChipProps {
  score: number;
}

const TIER_STYLES = {
  high: {
    chip: "bg-emerald-50/95 text-emerald-800 ring-emerald-200/50",
    dot: "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]",
    label: "High fit",
  },
  medium: {
    chip: "bg-amber-50/95 text-amber-900 ring-amber-200/50",
    dot: "bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.12)]",
    label: "Strong",
  },
  low: {
    chip: "bg-slate-50/95 text-slate-700 ring-slate-200/55",
    dot: "bg-slate-400",
    label: "Developing",
  },
} as const;

export function PipelineScoreChip({ score }: PipelineScoreChipProps) {
  const tier = getScoreTier(score);
  const styles = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset ${styles.chip}`}
      title={`Lead score ${score} · ${styles.label}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      <span className="text-slate-500/90 font-medium">Score</span>
      <span>{score}</span>
    </span>
  );
}
