interface LeadAiInsightPanelProps {
  insight: string;
  compact?: boolean;
  surface?: "light" | "pipeline";
}

export function LeadAiInsightPanel({
  insight,
  compact = false,
  surface = "light",
}: LeadAiInsightPanelProps) {
  const isPipeline = surface === "pipeline";

  return (
    <div
      className={`rounded-md px-2 py-1 ring-1 ring-inset ${
        isPipeline
          ? "border border-indigo-400/15 bg-indigo-500/[0.08] ring-indigo-400/15"
          : "border border-indigo-100/80 bg-indigo-50/35 ring-indigo-200/30"
      } ${compact ? "" : "mt-1.5"}`}
      role="note"
      aria-label="AI insight"
    >
      <div className="flex items-start gap-1.5">
        <span
          className={`mt-px shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] ${
            isPipeline ? "text-indigo-300/80" : "text-indigo-500/90"
          }`}
          aria-hidden
        >
          Insight
        </span>
        <p
          className={`min-w-0 flex-1 text-[10px] leading-snug ${
            isPipeline ? "text-slate-300" : "text-indigo-950/85"
          }`}
        >
          {insight}
        </p>
      </div>
    </div>
  );
}
