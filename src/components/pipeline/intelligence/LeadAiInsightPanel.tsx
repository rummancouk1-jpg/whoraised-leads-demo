interface LeadAiInsightPanelProps {
  insight: string;
  compact?: boolean;
}

export function LeadAiInsightPanel({
  insight,
  compact = false,
}: LeadAiInsightPanelProps) {
  return (
    <div
      className={`rounded-md border border-indigo-100/80 bg-indigo-50/35 px-2 py-1 ring-1 ring-inset ring-indigo-200/30 ${
        compact ? "" : "mt-1.5"
      }`}
      role="note"
      aria-label="AI insight"
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-px shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-indigo-500/90"
          aria-hidden
        >
          Insight
        </span>
        <p className="min-w-0 flex-1 text-[10px] leading-snug text-indigo-950/85">
          {insight}
        </p>
      </div>
    </div>
  );
}
