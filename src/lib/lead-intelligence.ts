import type { Lead, LeadInput, LeadSignal, OutreachReadiness } from "@/types/lead";
import { formatCurrency, isNewThisWeek } from "@/lib/lead-utils";

const MS_PER_DAY = 86_400_000;
const RECENT_FUNDING_DAYS = 45;

export function deriveOutreachReadiness(score: number): OutreachReadiness {
  if (score >= 90) return "Very High";
  if (score >= 80) return "High";
  if (score >= 70) return "Moderate";
  return "Developing";
}

export const OUTREACH_READINESS_STYLES: Record<
  OutreachReadiness,
  { badge: string; dot: string }
> = {
  "Very High": {
    badge: "bg-indigo-50 text-indigo-800 ring-indigo-200/80",
    dot: "bg-indigo-500",
  },
  High: {
    badge: "bg-violet-50 text-violet-800 ring-violet-200/80",
    dot: "bg-violet-500",
  },
  Moderate: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200/80",
    dot: "bg-slate-400",
  },
  Developing: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200/80",
    dot: "bg-amber-500",
  },
};

export const SIGNAL_STYLES: Record<LeadSignal, string> = {
  "Recently funded": "bg-emerald-50 text-emerald-800 ring-emerald-200/70",
  "Founder reachable": "bg-sky-50 text-sky-800 ring-sky-200/70",
  "Strong investor signal": "bg-violet-50 text-violet-800 ring-violet-200/70",
  "Hiring growth": "bg-cyan-50 text-cyan-800 ring-cyan-200/70",
  "High outreach fit": "bg-indigo-50 text-indigo-800 ring-indigo-200/70",
  "Fresh funding event": "bg-teal-50 text-teal-800 ring-teal-200/70",
};

function isRecentlyFunded(fundingDate: string): boolean {
  if (isNewThisWeek(fundingDate)) return true;
  const days =
    (Date.now() - new Date(fundingDate).getTime()) / MS_PER_DAY;
  return days <= RECENT_FUNDING_DAYS;
}

function buildPriorityReasons(lead: LeadInput): string[] {
  const reasons: string[] = [];
  const amount = formatCurrency(lead.amountRaised);

  reasons.push(`Raised ${amount} ${lead.fundingRound} recently`);

  if (lead.email && lead.phone) {
    reasons.push("Founder contact available");
  } else if (lead.email) {
    reasons.push("Founder email available for outreach");
  }

  if (lead.investors.length >= 2) {
    reasons.push("Strong investor participation");
  } else if (lead.investors.length === 1) {
    reasons.push("Notable investor backing");
  }

  if (lead.employeeCount >= 25 || isRecentlyFunded(lead.fundingDate)) {
    reasons.push("Hiring and growth signal detected");
  }

  if (lead.leadScore >= 85) {
    reasons.push("Fits high-intent outreach criteria");
  } else if (lead.leadScore >= 70) {
    reasons.push("Meets active outreach timing window");
  }

  return reasons.slice(0, 5);
}

function buildSignals(lead: LeadInput): LeadSignal[] {
  const signals: LeadSignal[] = [];

  if (isNewThisWeek(lead.fundingDate)) {
    signals.push("Fresh funding event");
  }
  if (isRecentlyFunded(lead.fundingDate)) {
    signals.push("Recently funded");
  }
  if (lead.email) {
    signals.push("Founder reachable");
  }
  if (
    lead.investors.length >= 2 ||
    lead.amountRaised >= 15_000_000
  ) {
    signals.push("Strong investor signal");
  }
  if (lead.employeeCount >= 20) {
    signals.push("Hiring growth");
  }
  if (lead.leadScore >= 80) {
    signals.push("High outreach fit");
  }

  return [...new Set(signals)];
}

function buildIntelligenceNote(lead: LeadInput): string {
  const factors: string[] = [];

  if (isRecentlyFunded(lead.fundingDate)) {
    factors.push("recent funding activity");
  }
  if (lead.email) {
    factors.push("available founder contact data");
  }
  factors.push(`strong ${lead.industry.toLowerCase()} category fit`);

  const factorText =
    factors.length > 1
      ? `${factors.slice(0, -1).join(", ")}, and ${factors[factors.length - 1]}`
      : factors[0] ?? "current market signals";

  return `This company appears well-timed for outreach due to ${factorText}.`;
}

export function enrichLead(lead: LeadInput): Lead {
  return {
    ...lead,
    outreachReadiness: deriveOutreachReadiness(lead.leadScore),
    priorityReasons: buildPriorityReasons(lead),
    signals: buildSignals(lead),
    intelligenceNote: buildIntelligenceNote(lead),
  };
}
