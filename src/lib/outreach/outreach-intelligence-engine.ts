import type { Lead } from "@/types/lead";
import { formatCurrency } from "@/lib/lead-utils";

/**
 * Deterministic Outreach Intelligence Engine.
 *
 * Reviews a lead across every intelligence field on the record and produces
 * a structured outreach decision: lead fit score, readiness, recommended
 * strategy + alternatives, tone, email structure, supporting reasoning,
 * risks, missing-data warnings, and a `doNotMention` list the composer
 * must respect to avoid invented facts.
 *
 * The engine is the single source of truth for *what* to say. The draft
 * composer is the single source of truth for *how* to phrase it. The
 * sender profile decides *who* the sender is. Splitting those concerns
 * keeps every layer testable and lets a future LLM replace only the
 * composition step.
 *
 * --------------------------------------------------------------------
 * FUTURE AI INTEGRATION POINT
 * --------------------------------------------------------------------
 * When a real model is wired in, this engine stays exactly as is. It is
 * cheap, predictable, and acts as the safety/feature-gate ahead of any
 * LLM call. The composer (email-draft-generator.ts) is the seam that
 * swaps from deterministic to AI-backed — it will receive:
 *
 *   - the sanitized `Lead`
 *   - this `OutreachIntelligence` object (strategy, tone, structure)
 *   - the `SenderProfile` (voice)
 *   - the `doNotMention` array (safety)
 *
 * and return the same `EmailDraft` shape so no UI changes are required.
 */

// --------------------------------------------------------------------
// Public types
// --------------------------------------------------------------------

export type OutreachStrategy =
  | "funding-trigger"
  | "growth-signal"
  | "problem-aware"
  | "re-engagement"
  | "qualified-next-step"
  | "warm-intro"
  | "low-data-safe";

export type OutreachTone = "Warm" | "Professional" | "Direct" | "Consultative";

export type OutreachReadiness = "High" | "Medium" | "Low";

export type DraftConfidence = "High" | "Medium" | "Needs Review";

export type PersonalizationStrength = "Strong" | "Moderate" | "Light";

export type OutreachUrgency = "high" | "medium" | "low";

export type StageContext =
  | "first-touch"
  | "already-contacted"
  | "qualified"
  | "dormant";

export type ContactRoute = "email-and-phone" | "email" | "phone" | "none";

export type OpenerType =
  | "funding-mention"
  | "category-mention"
  | "growth-mention"
  | "follow-up"
  | "next-step"
  | "soft-reintro"
  | "neutral-intro";

export type BridgeType =
  | "post-funding-window"
  | "category-pattern"
  | "growth-execution"
  | "continuation"
  | "next-step"
  | "low-pressure"
  | "neutral";

export type CtaType =
  | "timely-call"
  | "near-term-call"
  | "follow-up-call"
  | "working-session"
  | "soft-call"
  | "open-chat";

export interface EmailStructure {
  openerType: OpenerType;
  valueBridgeType: BridgeType;
  ctaType: CtaType;
}

export interface OutreachIntelligence {
  // Top-line scoring
  leadFitScore: number;
  outreachReadiness: OutreachReadiness;
  confidence: DraftConfidence;
  personalizationStrength: PersonalizationStrength;
  urgency: OutreachUrgency;

  // Strategy
  recommendedStrategy: OutreachStrategy;
  alternativeStrategies: OutreachStrategy[];
  recommendedTone: OutreachTone;
  emailStructure: EmailStructure;

  // Reasoning surfaced to the user
  primaryReason: string;
  supportingReasons: string[];
  leadRisks: string[];
  missingDataWarnings: string[];
  /** Things the composer must NOT reference because they aren't on the lead. */
  doNotMention: string[];

  // Reference data used by the composer (no need to recompute)
  personalizationPoints: string[];
  stageContext: StageContext;
  contactRoute: ContactRoute;
  hasFirstName: boolean;
  firstName: string | null;
  isRecentlyFunded: boolean;
  daysSinceFunding: number;
}

export const STRATEGY_LABEL: Record<OutreachStrategy, string> = {
  "funding-trigger": "Funding Trigger",
  "growth-signal": "Growth Signal",
  "problem-aware": "Problem-Aware",
  "re-engagement": "Re-Engagement",
  "qualified-next-step": "Qualified Next Step",
  "warm-intro": "Warm Intro",
  "low-data-safe": "Low Data Safe",
};

const MS_PER_DAY = 86_400_000;
const FRESH_FUNDING_DAYS = 7;
const RECENT_FUNDING_DAYS = 60;
const STALE_FUNDING_DAYS = 180;

// --------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------

export function runOutreachIntelligence(lead: Lead): OutreachIntelligence {
  const daysSinceFunding = computeDaysSince(lead.fundingDate);
  const fresh = daysSinceFunding <= FRESH_FUNDING_DAYS;
  const recent = daysSinceFunding <= RECENT_FUNDING_DAYS;
  const stale = daysSinceFunding > STALE_FUNDING_DAYS;

  const firstName = extractFirstName(lead.founderName);
  const hasFirstName = Boolean(firstName);
  const contactRoute = resolveContactRoute(lead);
  const stageContext = resolveStageContext(lead);

  const recommendedStrategy = selectStrategy(lead, {
    fresh,
    recent,
    stale,
    stageContext,
  });

  const alternativeStrategies = selectAlternativeStrategies(
    lead,
    recommendedStrategy,
    { recent, stageContext },
  );

  const urgency = computeUrgency(lead, recent);
  const leadFitScore = computeLeadFitScore(lead, {
    recent,
    stale,
    contactRoute,
    hasFirstName,
    stageContext,
  });
  const outreachReadiness = leadFitToReadiness(leadFitScore);

  const personalizationPoints = collectPersonalizationPoints(lead, recent);
  const personalizationStrength = scorePersonalization(personalizationPoints);

  const recommendedTone = selectTone(recommendedStrategy, lead);
  const emailStructure = selectEmailStructure(recommendedStrategy, stageContext);

  const missingDataWarnings = buildMissingDataWarnings(lead, {
    hasFirstName,
    contactRoute,
  });
  const leadRisks = buildLeadRisks(lead, {
    recent,
    stale,
    stageContext,
    contactRoute,
    leadFitScore,
  });
  const doNotMention = buildDoNotMention(lead);

  const confidence = scoreConfidence(lead, personalizationPoints, {
    hasFirstName,
    recent,
    contactRoute,
    leadFitScore,
  });

  const primaryReason = composePrimaryReason(lead, recommendedStrategy, {
    fresh,
    recent,
    stale,
    stageContext,
    daysSinceFunding,
  });
  const supportingReasons = composeSupportingReasons(lead, recommendedStrategy, {
    recent,
  });

  return {
    leadFitScore,
    outreachReadiness,
    confidence,
    personalizationStrength,
    urgency,
    recommendedStrategy,
    alternativeStrategies,
    recommendedTone,
    emailStructure,
    primaryReason,
    supportingReasons,
    leadRisks,
    missingDataWarnings,
    doNotMention,
    personalizationPoints,
    stageContext,
    contactRoute,
    hasFirstName,
    firstName,
    isRecentlyFunded: recent,
    daysSinceFunding,
  };
}

// --------------------------------------------------------------------
// Lead-data helpers
// --------------------------------------------------------------------

function computeDaysSince(fundingDate: string): number {
  const ts = new Date(fundingDate).getTime();
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - ts) / MS_PER_DAY));
}

export function extractFirstName(fullName: string): string | null {
  if (!fullName) return null;
  const cleaned = fullName.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Prof\.?)\s+/i, "");
  const [first] = cleaned.split(/\s+/);
  if (!first) return null;
  if (/^[A-Z]\.?$/.test(first)) return null;
  return first;
}

function resolveContactRoute(lead: Lead): ContactRoute {
  const hasEmail = Boolean(lead.email?.trim());
  const hasPhone = Boolean(lead.phone?.trim());
  if (hasEmail && hasPhone) return "email-and-phone";
  if (hasEmail) return "email";
  if (hasPhone) return "phone";
  return "none";
}

function resolveStageContext(lead: Lead): StageContext {
  switch (lead.status) {
    case "Contacted":
    case "Nurturing":
      return "already-contacted";
    case "Qualified":
      return "qualified";
    case "Archived":
      return "dormant";
    case "New":
    default:
      return "first-touch";
  }
}

// --------------------------------------------------------------------
// Strategy selection
// --------------------------------------------------------------------

interface StrategyFlags {
  fresh: boolean;
  recent: boolean;
  stale: boolean;
  stageContext: StageContext;
}

function selectStrategy(lead: Lead, flags: StrategyFlags): OutreachStrategy {
  // Stage-driven strategies fire first — they're about relationship, not data.
  if (flags.stageContext === "qualified") return "qualified-next-step";
  if (flags.stageContext === "already-contacted") return "re-engagement";
  if (flags.stageContext === "dormant") return "re-engagement";

  // First-touch: data-driven.
  if (flags.recent && lead.amountRaised >= 1_000_000) return "funding-trigger";
  if (lead.employeeCount >= 50 || lead.signals.includes("Hiring growth")) {
    return "growth-signal";
  }

  const hasDescription = (lead.description?.trim().length ?? 0) >= 60;
  const hasSomeSignal = lead.signals.length > 0 || lead.investors.length > 0;

  if (hasDescription && hasSomeSignal) return "problem-aware";
  if (lead.email?.trim() && hasSomeSignal) return "warm-intro";
  return "low-data-safe";
}

function selectAlternativeStrategies(
  lead: Lead,
  primary: OutreachStrategy,
  flags: { recent: boolean; stageContext: StageContext },
): OutreachStrategy[] {
  // Build a candidate set ranked by relevance for this lead.
  const candidates: OutreachStrategy[] = [];

  // For mid/late stages, the alternatives are always softer variants.
  if (flags.stageContext === "qualified") {
    candidates.push("re-engagement", "warm-intro");
  } else if (flags.stageContext === "already-contacted") {
    candidates.push("warm-intro", "problem-aware");
  } else if (flags.stageContext === "dormant") {
    candidates.push("warm-intro", "low-data-safe");
  } else {
    // First-touch: the alternatives offer a different angle.
    if (primary !== "funding-trigger" && flags.recent) {
      candidates.push("funding-trigger");
    }
    if (primary !== "problem-aware") candidates.push("problem-aware");
    if (primary !== "warm-intro") candidates.push("warm-intro");
    if (primary !== "growth-signal" && lead.employeeCount >= 25) {
      candidates.push("growth-signal");
    }
    if (primary !== "low-data-safe") candidates.push("low-data-safe");
  }

  // Dedupe, drop the primary, return top 2.
  const seen = new Set<OutreachStrategy>([primary]);
  const out: OutreachStrategy[] = [];
  for (const s of candidates) {
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 2) break;
  }
  return out;
}

// --------------------------------------------------------------------
// Tone, structure, urgency, scoring
// --------------------------------------------------------------------

function selectTone(strategy: OutreachStrategy, lead: Lead): OutreachTone {
  switch (strategy) {
    case "qualified-next-step":
      return "Direct";
    case "re-engagement":
      return lead.status === "Archived" ? "Warm" : "Professional";
    case "funding-trigger":
      return lead.amountRaised >= 25_000_000 ? "Professional" : "Warm";
    case "growth-signal":
    case "problem-aware":
      return "Consultative";
    case "warm-intro":
    case "low-data-safe":
    default:
      return "Warm";
  }
}

function selectEmailStructure(
  strategy: OutreachStrategy,
  stage: StageContext,
): EmailStructure {
  switch (strategy) {
    case "funding-trigger":
      return {
        openerType: "funding-mention",
        valueBridgeType: "post-funding-window",
        ctaType: "timely-call",
      };
    case "growth-signal":
      return {
        openerType: "growth-mention",
        valueBridgeType: "growth-execution",
        ctaType: "near-term-call",
      };
    case "problem-aware":
      return {
        openerType: "category-mention",
        valueBridgeType: "category-pattern",
        ctaType: "near-term-call",
      };
    case "re-engagement":
      return {
        openerType: stage === "dormant" ? "soft-reintro" : "follow-up",
        valueBridgeType: stage === "dormant" ? "low-pressure" : "continuation",
        ctaType: stage === "dormant" ? "soft-call" : "follow-up-call",
      };
    case "qualified-next-step":
      return {
        openerType: "next-step",
        valueBridgeType: "next-step",
        ctaType: "working-session",
      };
    case "warm-intro":
      return {
        openerType: "neutral-intro",
        valueBridgeType: "neutral",
        ctaType: "open-chat",
      };
    case "low-data-safe":
    default:
      return {
        openerType: "neutral-intro",
        valueBridgeType: "low-pressure",
        ctaType: "soft-call",
      };
  }
}

function computeUrgency(lead: Lead, recent: boolean): OutreachUrgency {
  if (lead.leadScore >= 88 && recent) return "high";
  if (lead.leadScore >= 78) return "medium";
  return "low";
}

function computeLeadFitScore(
  lead: Lead,
  flags: {
    recent: boolean;
    stale: boolean;
    contactRoute: ContactRoute;
    hasFirstName: boolean;
    stageContext: StageContext;
  },
): number {
  let score = lead.leadScore; // 0-100 base
  if (flags.recent) score += 6;
  if (flags.stale) score -= 8;
  if (flags.contactRoute === "email-and-phone") score += 4;
  else if (flags.contactRoute === "email") score += 2;
  else if (flags.contactRoute === "none") score -= 8;
  if (flags.hasFirstName) score += 2;
  if (lead.investors.length >= 2) score += 3;
  if (flags.stageContext === "dormant") score -= 10;
  if (flags.stageContext === "qualified") score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function leadFitToReadiness(score: number): OutreachReadiness {
  if (score >= 82) return "High";
  if (score >= 65) return "Medium";
  return "Low";
}

function scorePersonalization(points: string[]): PersonalizationStrength {
  if (points.length >= 5) return "Strong";
  if (points.length >= 3) return "Moderate";
  return "Light";
}

function scoreConfidence(
  lead: Lead,
  personalizationPoints: string[],
  flags: {
    hasFirstName: boolean;
    recent: boolean;
    contactRoute: ContactRoute;
    leadFitScore: number;
  },
): DraftConfidence {
  let score = 0;
  if (lead.description && lead.description.length >= 60) score += 2;
  if (flags.recent) score += 2;
  if (lead.investors.length >= 2) score += 1;
  if (flags.contactRoute === "email" || flags.contactRoute === "email-and-phone") {
    score += 1;
  }
  if (flags.hasFirstName) score += 1;
  if (personalizationPoints.length >= 5) score += 1;
  if (flags.leadFitScore >= 80) score += 1;

  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Needs Review";
}

// --------------------------------------------------------------------
// Reasoning copy
// --------------------------------------------------------------------

function composePrimaryReason(
  lead: Lead,
  strategy: OutreachStrategy,
  flags: {
    fresh: boolean;
    recent: boolean;
    stale: boolean;
    stageContext: StageContext;
    daysSinceFunding: number;
  },
): string {
  const amount = formatCurrency(lead.amountRaised);
  const days = flags.daysSinceFunding;

  switch (strategy) {
    case "qualified-next-step":
      return `Lead is in "Qualified" — ready for a direct next-step conversation, not another educational touch.`;
    case "re-engagement":
      if (flags.stageContext === "dormant") {
        return `Lead is archived — needs a soft, low-pressure reintroduction rather than a fresh pitch.`;
      }
      return flags.recent
        ? `Mid-pipeline lead with a fresh ${amount} ${lead.fundingRound} close — the new context is a clean reason to revisit.`
        : `Mid-pipeline lead — frame as a continuation of the existing conversation, not a cold open.`;
    case "funding-trigger":
      if (flags.fresh) {
        return `Closed ${amount} ${lead.fundingRound} in the last week — peak attention window for funded teams.`;
      }
      return `Closed ${amount} ${lead.fundingRound} ${days} days ago — budget and hiring cycles still forming.`;
    case "growth-signal":
      return `Active growth signals (${lead.employeeCount} headcount, hiring posture) — anchor on execution, not the round.`;
    case "problem-aware":
      return `Strong ${lead.industry} positioning — opener should reference what they actually do, not the round.`;
    case "warm-intro":
      return `Clear category fit but no urgent trigger — short warm opener keeps the door open without over-claiming.`;
    case "low-data-safe":
    default:
      return `Public signals are thin — keep the opener safe, short, and free of specific claims.`;
  }
}

function composeSupportingReasons(
  lead: Lead,
  strategy: OutreachStrategy,
  flags: { recent: boolean },
): string[] {
  const out: string[] = [];

  if (flags.recent && strategy !== "funding-trigger") {
    out.push(`Recently closed ${formatCurrency(lead.amountRaised)} ${lead.fundingRound}`);
  }
  if (lead.industry) {
    out.push(`${lead.industry} category fit`);
  }
  if (lead.investors.length >= 1) {
    out.push(`Backed by ${lead.investors.slice(0, 2).join(" & ")}`);
  }
  if (lead.employeeCount >= 25 && strategy !== "growth-signal") {
    out.push(`Team at ${lead.employeeCount} — execution-mode signal`);
  }
  if (lead.outreachReadiness === "Very High" || lead.outreachReadiness === "High") {
    out.push(`${lead.outreachReadiness} outreach readiness`);
  }
  if (lead.signals[0]) {
    out.push(`Signal · ${lead.signals[0]}`);
  }
  return out.slice(0, 4);
}

function collectPersonalizationPoints(lead: Lead, recent: boolean): string[] {
  const points: string[] = [];
  points.push(
    recent
      ? `Recently closed ${formatCurrency(lead.amountRaised)} ${lead.fundingRound}`
      : `${lead.fundingRound} round · ${formatCurrency(lead.amountRaised)}`,
  );
  if (lead.industry) points.push(`${lead.industry}`);
  if (lead.investors.length > 0) {
    const names = lead.investors.slice(0, 2).join(" & ");
    const extra =
      lead.investors.length > 2 ? ` (+${lead.investors.length - 2} more)` : "";
    points.push(`Backed by ${names}${extra}`);
  }
  if (lead.location) points.push(`Based in ${lead.location}`);
  if (lead.signals[0]) points.push(`Signal · ${lead.signals[0]}`);
  if (lead.outreachReadiness) {
    points.push(`${lead.outreachReadiness} readiness · score ${lead.leadScore}`);
  }
  return points.slice(0, 6);
}

// --------------------------------------------------------------------
// Safety: missing-data warnings, risks, do-not-mention
// --------------------------------------------------------------------

function buildMissingDataWarnings(
  lead: Lead,
  flags: { hasFirstName: boolean; contactRoute: ContactRoute },
): string[] {
  const out: string[] = [];
  if (!flags.hasFirstName) {
    out.push(`Founder name not on file — greeting uses a neutral fallback.`);
  }
  if (flags.contactRoute === "none") {
    out.push(`No email or phone on file — add a contact route before sending.`);
  } else if (flags.contactRoute === "phone") {
    out.push(`Only a phone number on file — no direct email address to send to.`);
  }
  if (!lead.description || lead.description.trim().length < 40) {
    out.push(`Company description is thin — draft stays factual and brief.`);
  }
  if (lead.investors.length === 0) {
    out.push(`No investor data on file — left out of the draft.`);
  }
  return out;
}

function buildLeadRisks(
  lead: Lead,
  flags: {
    recent: boolean;
    stale: boolean;
    stageContext: StageContext;
    contactRoute: ContactRoute;
    leadFitScore: number;
  },
): string[] {
  const out: string[] = [];
  if (flags.stageContext === "dormant") {
    out.push(`Archived status suggests prior disengagement — keep the tone low-pressure.`);
  }
  if (flags.stale) {
    out.push(`Funding is over six months old — don't anchor the email on the raise.`);
  }
  if (flags.leadFitScore < 60) {
    out.push(`Lead fit score is below 60 — review before adding to a high-volume sequence.`);
  }
  if (flags.contactRoute === "none") {
    out.push(`No usable contact route on file.`);
  }
  if (lead.leadScore < 70 && flags.stageContext === "first-touch") {
    out.push(`Lead score is under 70 — strategy stays soft.`);
  }
  return out;
}

function buildDoNotMention(lead: Lead): string[] {
  const out: string[] = [];
  if (lead.investors.length === 0) {
    out.push("Specific investors or investor names");
  }
  if (!lead.description || lead.description.trim().length < 30) {
    out.push("Specific product details or company focus");
  }
  if (lead.status === "New") {
    out.push("Any prior conversation or relationship");
  }
  if (lead.employeeCount === 0) {
    out.push("Team size or hiring posture");
  }
  if (!lead.location) {
    out.push("Office location or geography");
  }
  // Always-on guardrails:
  out.push("Specific revenue, ARR, or customer numbers");
  out.push("Named customers or case studies");
  out.push("Personal details about the founder beyond their role");
  return out;
}
