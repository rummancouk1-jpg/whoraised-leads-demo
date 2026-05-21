import type { LeadDrawerProfile } from "@/types/lead-drawer";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";

const EXTRA_ACTIONS = [
  { id: "enrich", label: "Enrich profile", actionKey: "enrich_profile" },
  { id: "verify", label: "Verify email", actionKey: "verify_email" },
] as const;

export function LeadActionsSection({ profile }: { profile: LeadDrawerProfile }) {
  const actions = [
    ...profile.crm.nextActions,
    ...EXTRA_ACTIONS.filter(
      (e) => !profile.crm.nextActions.some((a) => a.actionKey === e.actionKey),
    ).map((e) => ({ ...e, priority: "normal" as const })),
  ].slice(0, 5);

  return (
    <DrawerSection id="drawer-actions" title="Recommended actions">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-inset transition-colors ${
              action.priority === "high"
                ? "bg-slate-900 text-white ring-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-700 ring-slate-200/80 hover:bg-slate-50"
            }`}
            data-action-key={action.actionKey}
          >
            {action.label}
          </button>
        ))}
      </div>
    </DrawerSection>
  );
}
