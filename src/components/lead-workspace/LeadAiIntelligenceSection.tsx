import type { LeadDrawerProfile } from "@/types/lead-drawer";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";

export function LeadAiIntelligenceSection({ profile }: { profile: LeadDrawerProfile }) {
  const { ai, lead } = profile;

  return (
    <DrawerSection id="drawer-ai" title="AI intelligence">
      <div className="rounded-md border border-indigo-100/90 bg-indigo-50/40 px-3 py-2.5 ring-1 ring-inset ring-indigo-200/35">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600/90">
          Primary insight
        </p>
        <p className="mt-1 text-[13px] font-medium leading-snug text-indigo-950/90">
          {ai.primaryInsight}
        </p>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">{ai.reasoning}</p>

      <p className="mt-2 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">Timing · </span>
        {ai.timingNote}
      </p>

      {ai.signals.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {ai.signals.map((signal) => (
            <li
              key={signal}
              className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/50"
            >
              {signal}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-500">
        {lead.intelligenceNote}
      </p>
    </DrawerSection>
  );
}
