import type { NextActionRecommendation } from "@/types/crm-workflow";

interface LeadNextActionsProps {
  actions: NextActionRecommendation[];
  surface?: "light" | "pipeline";
}

export function LeadNextActions({
  actions,
  surface = "pipeline",
}: LeadNextActionsProps) {
  if (actions.length === 0) return null;

  const isPipeline = surface === "pipeline";

  return (
    <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Recommended next actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset transition-colors duration-150 ${
            action.priority === "high"
              ? isPipeline
                ? "bg-white/[0.08] text-slate-200 ring-white/[0.12] hover:bg-white/[0.12]"
                : "bg-slate-900/[0.04] text-slate-800 ring-slate-300/60 hover:bg-slate-900/[0.07]"
              : isPipeline
                ? "bg-white/[0.04] text-slate-400 ring-white/[0.08] hover:bg-white/[0.07] hover:text-slate-300"
                : "bg-white/80 text-slate-600 ring-slate-200/55 hover:bg-slate-50"
          }`}
          data-action-key={action.actionKey}
          onClick={(e) => e.stopPropagation()}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
