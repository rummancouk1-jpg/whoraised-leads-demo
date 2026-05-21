import type { PipelineActivityEvent } from "@/types/crm-workflow";

interface LeadActivityTimelineProps {
  activities: PipelineActivityEvent[];
  surface?: "light" | "pipeline";
}

export function LeadActivityTimeline({
  activities,
  surface = "light",
}: LeadActivityTimelineProps) {
  if (activities.length === 0) return null;

  const preview = activities.slice(0, 3);
  const isPipeline = surface === "pipeline";

  return (
    <details className="pipeline-activity-details group/tl mt-1.5">
      <summary
        className={`cursor-pointer list-none text-[9px] font-medium uppercase tracking-wider transition-colors [&::-webkit-details-marker]:hidden ${
          isPipeline
            ? "text-slate-500 hover:text-slate-300"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          Activity
          <span
            className={`rounded px-1 py-px tabular-nums text-[8px] ring-1 ring-inset ${
              isPipeline
                ? "bg-white/[0.06] text-slate-400 ring-white/[0.08]"
                : "bg-slate-100/90 text-slate-500 ring-slate-200/50"
            }`}
          >
            {activities.length}
          </span>
          <svg
            className="h-2.5 w-2.5 transition-transform duration-200 group-open/tl:rotate-180"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <ul
        className={`mt-1.5 space-y-1 border-t pt-1.5 ${
          isPipeline ? "border-white/[0.06]" : "border-slate-100/90"
        }`}
      >
        {preview.map((event) => (
          <li
            key={event.id}
            className="flex items-baseline justify-between gap-2 text-[10px] leading-snug"
          >
            <span
              className={`min-w-0 truncate ${
                isPipeline ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {event.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {event.relativeTime}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
