/**
 * Compatibility shim.
 *
 * The lead analyzer has been promoted into the full Outreach Intelligence
 * Engine (`outreach-intelligence-engine.ts`). This file re-exports the
 * legacy names so existing imports keep working while the codebase
 * migrates.
 *
 * Prefer importing directly from `@/lib/outreach/outreach-intelligence-engine`
 * in new code.
 */

export {
  runOutreachIntelligence as analyzeLeadForOutreach,
  extractFirstName,
  type OutreachIntelligence as LeadOutreachAnalysis,
  type OutreachTone as DraftTone,
  type DraftConfidence,
  type OutreachUrgency,
  type StageContext,
  type ContactRoute,
  type OutreachStrategy,
  type OutreachReadiness,
} from "@/lib/outreach/outreach-intelligence-engine";
