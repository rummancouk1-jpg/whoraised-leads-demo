import type { LeadDrawerProfile } from "@/types/lead-drawer";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";

const TYPE_DOT: Record<string, string> = {
  stage_change: "bg-violet-400",
  outreach: "bg-sky-400",
  verification: "bg-emerald-400",
  research: "bg-slate-400",
  save: "bg-indigo-400",
  signal: "bg-amber-400",
  team: "bg-slate-400",
};

export function LeadActivitySection({ profile }: { profile: LeadDrawerProfile }) {
  const { crm } = profile;

  return (
    <DrawerSection id="drawer-activity" title="Activity timeline">
      <ul className="space-y-0">
        {crm.activities.map((event, i) => (
          <li
            key={event.id}
            className="relative flex gap-2.5 pb-3 pl-1 last:pb-0"
          >
            {i < crm.activities.length - 1 ? (
              <span
                className="absolute left-[5px] top-3 h-[calc(100%-4px)] w-px bg-slate-200"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-[1] mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[event.type] ?? "bg-slate-300"}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-slate-700">{event.label}</p>
              <p className="text-[10px] text-slate-400">{event.relativeTime}</p>
            </div>
          </li>
        ))}
      </ul>
    </DrawerSection>
  );
}
