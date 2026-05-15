import type { Lead } from "@/types/lead";
import {
  OUTREACH_READINESS_STYLES,
  SIGNAL_STYLES,
} from "@/lib/lead-intelligence";

interface LeadIntelligencePanelProps {
  lead: Lead;
}

export function LeadIntelligencePanel({ lead }: LeadIntelligencePanelProps) {
  const readinessStyle = OUTREACH_READINESS_STYLES[lead.outreachReadiness];

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="min-w-[140px] flex-1 rounded-xl border border-slate-200/70 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Outreach readiness
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${readinessStyle.dot}`}
              aria-hidden
            />
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${readinessStyle.badge}`}
            >
              {lead.outreachReadiness}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Score {lead.leadScore} · outreach window
          </p>
        </div>
      </div>

      {lead.signals.length > 0 && (
        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3.5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Intelligence signals
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {lead.signals.map((signal) => (
              <li key={signal}>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SIGNAL_STYLES[signal]}`}
                >
                  <SignalIcon signal={signal} />
                  {signal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-sm ring-1 ring-slate-900/[0.03]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Why this lead is high priority
        </p>
        <ul className="space-y-2">
          {lead.priorityReasons.map((reason) => (
            <li key={reason} className="flex gap-2.5 text-sm leading-snug text-slate-700">
              <span
                className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                aria-hidden
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/90 to-violet-50/50 p-4 ring-1 ring-indigo-100/80">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          Lead intelligence note
        </p>
        <p className="mt-2 text-sm leading-relaxed text-indigo-950/80">
          {lead.intelligenceNote}
        </p>
      </div>
    </div>
  );
}

function SignalIcon({ signal }: { signal: Lead["signals"][number] }) {
  const className = "h-3 w-3 opacity-70";
  switch (signal) {
    case "Recently funded":
    case "Fresh funding event":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "Founder reachable":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case "Strong investor signal":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case "Hiring growth":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    case "High outreach fit":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    default:
      return null;
  }
}
