import { getScoreTier } from "@/lib/lead-utils";

interface PipelineScoreChipProps {
  score: number;
  variant?: "light" | "pipeline";
}

const TIER_STYLES_LIGHT = {
  high: {
    chip: "bg-emerald-50/95 text-emerald-800 ring-emerald-200/50",
    dot: "bg-emerald-500",
    label: "High fit",
  },
  medium: {
    chip: "bg-amber-50/95 text-amber-900 ring-amber-200/50",
    dot: "bg-amber-500",
    label: "Strong",
  },
  low: {
    chip: "bg-slate-50/95 text-slate-700 ring-slate-200/55",
    dot: "bg-slate-400",
    label: "Developing",
  },
} as const;

const TIER_STYLES_PIPELINE = {
  high: {
    chip: "bg-emerald-500/15 text-emerald-200/95 ring-emerald-400/25",
    dot: "bg-emerald-400",
    label: "High fit",
  },
  medium: {
    chip: "bg-amber-500/12 text-amber-200/95 ring-amber-400/20",
    dot: "bg-amber-400",
    label: "Strong",
  },
  low: {
    chip: "bg-white/[0.06] text-slate-300 ring-white/[0.08]",
    dot: "bg-slate-500",
    label: "Developing",
  },
} as const;

export function PipelineScoreChip({
  score,
  variant = "light",
}: PipelineScoreChipProps) {
  const tier = getScoreTier(score);
  const styles =
    variant === "pipeline" ? TIER_STYLES_PIPELINE[tier] : TIER_STYLES_LIGHT[tier];
  const labelMuted =
    variant === "pipeline" ? "text-slate-500" : "text-slate-500/90";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset ${styles.chip}`}
      title={`Lead score ${score} · ${styles.label}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      <span className={`font-medium ${labelMuted}`}>Score</span>
      <span>{score}</span>
    </span>
  );
}
