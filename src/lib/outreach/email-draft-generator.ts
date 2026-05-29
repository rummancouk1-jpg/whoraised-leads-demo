import type { Lead } from "@/types/lead";
import { formatCurrency } from "@/lib/lead-utils";
import {
  runOutreachIntelligence,
  STRATEGY_LABEL,
  type DraftConfidence,
  type OutreachIntelligence,
  type OutreachStrategy,
  type OutreachTone,
  type StageContext,
} from "@/lib/outreach/outreach-intelligence-engine";
import {
  assessDraftQuality,
  type DraftQualityAssessment,
} from "@/lib/outreach/draft-quality-checker";
import {
  DEFAULT_SENDER_PROFILE,
  type SenderProfile,
} from "@/lib/outreach/sender-profile";

export type { DraftConfidence, OutreachStrategy, OutreachTone } from "@/lib/outreach/outreach-intelligence-engine";

/**
 * Email draft generator — deterministic today, AI-ready by design.
 *
 * Pipeline:
 *   1. `runOutreachIntelligence(lead)` performs the structured lead review.
 *   2. Strategy is taken from the intel (or overridden by the user's pick
 *      via `options.strategy`).
 *   3. `composeSubject` + `composeBody` build copy that branches on
 *      strategy, tone, urgency, missing data, and a deterministic variant
 *      index seeded from the lead id — so the same lead always yields the
 *      same draft for the same strategy.
 *   4. `assessDraftQuality` runs over the composed draft as a final
 *      safety / quality gate. The assessment is returned alongside the
 *      draft for the UI to surface.
 *
 * --------------------------------------------------------------------
 * FUTURE AI INTEGRATION POINT
 * --------------------------------------------------------------------
 * To swap deterministic composition for a live LLM, replace `composeBody`
 * (and optionally `composeSubject`) with an async call. The LLM should
 * receive:
 *
 *   - sanitized lead facts (`Lead`)
 *   - the full `OutreachIntelligence` (strategy, tone, structure,
 *     `doNotMention` list — the safety contract)
 *   - the active `SenderProfile` (voice)
 *
 * Keep `assessDraftQuality` running over the LLM output so the same
 * safety/quality gate applies regardless of who composed the draft.
 * Set `mode: "ai-ready"` on the returned `EmailDraft` so callers can
 * tell the two modes apart.
 */

export type DraftGenerationMode = "deterministic" | "ai-ready";

export interface EmailDraft {
  strategy: OutreachStrategy;
  strategyLabel: string;
  subject: string;
  body: string;
  tone: OutreachTone;
  cta: string;
  confidence: DraftConfidence;
  personalizationPoints: string[];
  missingDataWarnings: string[];
  generatedAt: string;
  mode: DraftGenerationMode;
  intelligence: OutreachIntelligence;
  quality: DraftQualityAssessment;
}

export interface GenerateDraftOptions {
  /** Override the engine's recommended strategy. */
  strategy?: OutreachStrategy;
  /** Override the resolved tone (otherwise: profile preference → engine default). */
  tone?: OutreachTone;
  /** Sender / client voice profile. Falls back to DEFAULT_SENDER_PROFILE. */
  senderProfile?: SenderProfile;
  /** @deprecated — use senderProfile.senderName */
  senderName?: string;
  /** @deprecated — use senderProfile.companyName */
  senderCompany?: string;
  /** @deprecated — use senderProfile.valueProposition */
  valueProposition?: string;
  /** Reserved for future live-AI mode. Today only "deterministic" is honored. */
  mode?: DraftGenerationMode;
}

interface ResolvedSender {
  name: string;
  company: string;
  valueProp: string;
  signoff: string;
  customCta: string | null;
  preferredTone: OutreachTone | null;
}

// --------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------

export function generateLeadEmailDraft(
  lead: Lead,
  options: GenerateDraftOptions = {},
): EmailDraft {
  const intel = runOutreachIntelligence(lead);
  const sender = resolveSender(options);

  const strategy = options.strategy ?? intel.recommendedStrategy;
  const tone = resolveTone(options, intel, sender, strategy);
  const cta = resolveCta(strategy, lead, intel, sender);

  const subject = composeSubject(strategy, lead, intel);
  const body = composeBody(strategy, tone, lead, intel, sender, cta);

  const draft = {
    strategy,
    strategyLabel: STRATEGY_LABEL[strategy],
    subject,
    body,
    tone,
    cta,
    confidence: intel.confidence,
    personalizationPoints: intel.personalizationPoints,
    missingDataWarnings: intel.missingDataWarnings,
    generatedAt: new Date().toISOString(),
    mode: options.mode ?? ("deterministic" as DraftGenerationMode),
    intelligence: intel,
  };

  const quality = assessDraftQuality({ subject, body }, lead, intel);

  return { ...draft, quality };
}

export function formatDraftAsPlainText(draft: EmailDraft): string {
  return `Subject: ${draft.subject}\n\n${draft.body}`;
}

// --------------------------------------------------------------------
// Sender + tone + CTA resolution
// --------------------------------------------------------------------

function resolveSender(options: GenerateDraftOptions): ResolvedSender {
  const profile = options.senderProfile ?? DEFAULT_SENDER_PROFILE;
  const trimOr = (raw: string | undefined, fallback: string) => {
    const t = raw?.trim();
    return t && t.length > 0 ? t : fallback;
  };

  return {
    name: trimOr(options.senderName, trimOr(profile.senderName, DEFAULT_SENDER_PROFILE.senderName)),
    company: trimOr(options.senderCompany, trimOr(profile.companyName, DEFAULT_SENDER_PROFILE.companyName)),
    valueProp: trimOr(
      options.valueProposition,
      trimOr(profile.valueProposition, DEFAULT_SENDER_PROFILE.valueProposition),
    ),
    signoff: trimOr(profile.signoff, DEFAULT_SENDER_PROFILE.signoff ?? "Best"),
    customCta: (profile.defaultCTA ?? "").trim() || null,
    preferredTone: profile.preferredTone ?? null,
  };
}

function resolveTone(
  options: GenerateDraftOptions,
  intel: OutreachIntelligence,
  sender: ResolvedSender,
  strategy: OutreachStrategy,
): OutreachTone {
  if (options.tone) return options.tone;
  // Qualified-stage leads always read better in a Direct voice regardless
  // of the user's preferred tone — it's about relationship stage, not taste.
  if (strategy === "qualified-next-step") return intel.recommendedTone;
  if (sender.preferredTone) return sender.preferredTone;
  return intel.recommendedTone;
}

function resolveCta(
  strategy: OutreachStrategy,
  lead: Lead,
  intel: OutreachIntelligence,
  sender: ResolvedSender,
): string {
  // Profile CTA wins for first-touch only. Engaged / qualified / dormant
  // stages keep their stage-specific CTA so the email reads correctly.
  if (intel.stageContext === "first-touch" && sender.customCta) {
    return sender.customCta;
  }
  return pickCtaVariant(strategy, lead, intel);
}

// --------------------------------------------------------------------
// Deterministic variant selection
// --------------------------------------------------------------------

function hash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickIndex(lead: Lead, strategy: OutreachStrategy, key: string, count: number): number {
  if (count <= 1) return 0;
  return hash32(`${lead.id}:${strategy}:${key}`) % count;
}

// --------------------------------------------------------------------
// Subject (per strategy + 2 variants each)
// --------------------------------------------------------------------

function composeSubject(
  strategy: OutreachStrategy,
  lead: Lead,
  intel: OutreachIntelligence,
): string {
  const v = pickIndex(lead, strategy, "subject", 2);
  const company = lead.companyName;
  const round = lead.fundingRound;

  switch (strategy) {
    case "funding-trigger":
      return v === 0
        ? `Congrats on the ${round} at ${company}`
        : `Quick note on ${company}'s ${round}`;
    case "growth-signal":
      return v === 0
        ? `On ${company}'s next growth chapter`
        : `Quick thought for ${company}`;
    case "problem-aware":
      return v === 0
        ? `A note on ${company}'s ${shortIndustry(lead.industry)} work`
        : `One thought on ${company}`;
    case "re-engagement":
      if (intel.stageContext === "dormant") {
        return v === 0
          ? `Reopening the thread on ${company}`
          : `${company} — worth another look?`;
      }
      return v === 0
        ? `Following up on ${company}`
        : `Picking back up on ${company}`;
    case "qualified-next-step":
      return v === 0
        ? `Next step on ${company}`
        : `${company} — lining up the next step`;
    case "warm-intro":
      return v === 0 ? `Intro — ${company}` : `Quick intro on ${company}`;
    case "low-data-safe":
    default:
      return v === 0 ? `Quick hello — ${company}` : `Wanted to introduce myself — ${company}`;
  }
}

// --------------------------------------------------------------------
// Body assembly
// --------------------------------------------------------------------

function composeBody(
  strategy: OutreachStrategy,
  tone: OutreachTone,
  lead: Lead,
  intel: OutreachIntelligence,
  sender: ResolvedSender,
  cta: string,
): string {
  const greeting = composeGreeting(tone, intel);
  const opener = composeOpener(strategy, lead, intel);
  const bridge = composeBridge(strategy, tone, lead, intel, sender);
  const sign = composeSignoff(sender);
  return [greeting, "", opener, "", bridge, "", cta, "", sign].join("\n");
}

function composeGreeting(tone: OutreachTone, intel: OutreachIntelligence): string {
  const handle = intel.hasFirstName ? intel.firstName! : "there";
  // Direct tone drops the "Hi" but only if we have a first name to use.
  if (tone === "Direct" && intel.hasFirstName) return `${handle},`;
  return `Hi ${handle},`;
}

function composeSignoff(sender: ResolvedSender): string {
  const closing = sender.signoff.replace(/[,.]+$/, "");
  return `${closing},\n${sender.name}\n${sender.company}`;
}

// --------------------------------------------------------------------
// Openers (per strategy + 2-3 variants each)
// --------------------------------------------------------------------

function composeOpener(
  strategy: OutreachStrategy,
  lead: Lead,
  intel: OutreachIntelligence,
): string {
  const company = lead.companyName;
  const focus = describeFocus(lead);
  const amount = formatCurrency(lead.amountRaised);
  const round = lead.fundingRound;
  const industry = shortIndustry(lead.industry);

  switch (strategy) {
    case "funding-trigger": {
      const v = pickIndex(lead, strategy, "opener", 3);
      if (v === 0) {
        return focus
          ? `Saw the ${amount} ${round} close at ${company} — congrats to the team. The work on ${focus} is what caught my attention.`
          : `Saw the ${amount} ${round} close at ${company} — congrats to the team.`;
      }
      if (v === 1) {
        return focus
          ? `Quick note on the ${amount} ${round} at ${company}. The team's work on ${focus} is what brought me here.`
          : `Quick note on the ${amount} ${round} at ${company}.`;
      }
      return focus
        ? `Noticed the ${round} close at ${company} — congrats. Particularly interested in the focus on ${focus}.`
        : `Noticed the ${round} close at ${company} — congrats.`;
    }

    case "growth-signal": {
      const v = pickIndex(lead, strategy, "opener", 2);
      const teamSize = lead.employeeCount;
      if (v === 0) {
        return focus
          ? `Came across ${company} while looking at fast-growing ${industry} teams — and the work on ${focus} stood out.`
          : `Came across ${company} while looking at fast-growing ${industry} teams.`;
      }
      return teamSize >= 30
        ? `${company} stood out while I was looking at execution-stage ${industry} teams — the ${teamSize}-person crew and visible hiring posture made it hard to scroll past.`
        : `${company} stood out while I was looking at ${industry} teams in active growth mode${focus ? `, particularly the focus on ${focus}` : ""}.`;
    }

    case "problem-aware": {
      const v = pickIndex(lead, strategy, "opener", 3);
      if (v === 0) {
        return focus
          ? `Came across ${company} while reading through notable ${industry} teams — the work on ${focus} caught my eye.`
          : `Came across ${company} while reading through notable ${industry} teams.`;
      }
      if (v === 1) {
        return focus
          ? `Spent some time looking at ${industry} teams this week and kept coming back to ${company} — the angle on ${focus} is what stuck.`
          : `Spent some time looking at ${industry} teams this week and ${company} kept coming up.`;
      }
      return focus
        ? `Wanted to reach out directly — ${company}'s work on ${focus} is one of the more focused angles I've seen in ${industry} lately.`
        : `Wanted to reach out directly — ${company}'s position in ${industry} stood out.`;
    }

    case "re-engagement": {
      const v = pickIndex(lead, strategy, "opener", 2);
      if (intel.stageContext === "dormant") {
        if (v === 0) {
          return focus
            ? `Reaching back out on ${company} — the team's work on ${focus} is still on our radar, and the context around it has likely shifted.`
            : `Reaching back out on ${company} — the picture has likely shifted since this was last active on our side.`;
        }
        return focus
          ? `Wanted to put ${company} back on the screen — the ongoing work on ${focus} is the reason it stayed there.`
          : `Wanted to put ${company} back on the screen given how the space has moved.`;
      }
      // Mid-pipeline already-contacted
      if (intel.isRecentlyFunded) {
        return v === 0
          ? `Following up on ${company} — congrats on closing the ${amount} ${round}. That changes the context for what we last discussed, so wanted to revisit.`
          : `Quick follow-up on ${company} — the ${amount} ${round} announcement gives a clean reason to pick the thread back up.`;
      }
      return v === 0
        ? `Following up on ${company} — wanted to revisit briefly${focus ? ` given the team's continued work on ${focus}` : ""}.`
        : `Picking back up on ${company}${focus ? ` — the angle on ${focus} feels worth re-opening` : ""}.`;
    }

    case "qualified-next-step": {
      const v = pickIndex(lead, strategy, "opener", 2);
      if (intel.isRecentlyFunded) {
        return v === 0
          ? `Wanted to circle back — ${company} closed the ${amount} ${round} not long ago, and it feels like a natural moment to take this further.`
          : `Circling back on ${company} — the ${amount} ${round} gives a clean lane for the next step.`;
      }
      return v === 0
        ? `Wanted to circle back on ${company}${focus ? `, particularly given the team's work on ${focus}` : ""}. I think there's a clear next step worth lining up.`
        : `Following through on ${company} — there's a clean next step here worth putting on the calendar.`;
    }

    case "warm-intro": {
      const v = pickIndex(lead, strategy, "opener", 2);
      const loc = lead.location ? ` around ${lead.location}` : "";
      if (v === 0) {
        return focus
          ? `I've been tracking ${industry} teams${loc}, and ${company}'s work on ${focus} stood out.`
          : `I've been tracking ${industry} teams${loc}, and ${company} stood out.`;
      }
      return focus
        ? `${company} has been on my list of ${industry} teams to keep an eye on${loc} — the work on ${focus} is the reason.`
        : `${company} has been on my list of ${industry} teams to keep an eye on${loc}.`;
    }

    case "low-data-safe":
    default: {
      const v = pickIndex(lead, strategy, "opener", 2);
      if (v === 0) {
        return `I've been looking at notable ${industry} teams${lead.location ? ` around ${lead.location}` : ""}, and ${company} came up.`;
      }
      return `Wanted to introduce myself briefly — ${company} stood out among the ${industry} teams I've been reading about.`;
    }
  }
}

// --------------------------------------------------------------------
// Bridges (per strategy + per tone variants)
//
// The value proposition completes the sentence "We ___" — bridges are
// designed around that grammatical hook to keep insertions natural.
// --------------------------------------------------------------------

function composeBridge(
  strategy: OutreachStrategy,
  tone: OutreachTone,
  lead: Lead,
  intel: OutreachIntelligence,
  sender: ResolvedSender,
): string {
  const value = sender.valueProp;
  const company = lead.companyName;

  switch (strategy) {
    case "funding-trigger": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      if (tone === "Direct") {
        return v === 0
          ? `We ${value}. Post-funding is usually the cleanest window for that conversation.`
          : `We ${value}. Worth taking 15 minutes while the timing is on your side.`;
      }
      if (tone === "Professional") {
        return v === 0
          ? `On our end, we ${value}. Post-funding tends to be the cleanest window to evaluate options without disrupting what's already working.`
          : `What we do: we ${value}. The post-funding window is usually when this conversation is easiest to have.`;
      }
      // Warm / Consultative
      return v === 0
        ? `On our side, we ${value} — and post-funding is usually the cleanest window to evaluate options without disrupting what's already working.`
        : `On our side, we ${value}. The timing tends to be helpful: post-funding is when most teams have the headspace for this conversation.`;
    }

    case "growth-signal": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      if (tone === "Consultative") {
        return v === 0
          ? `On our side, we ${value}. The patterns we see in teams at ${company}'s growth stage tend to be more about pipeline shape than tooling — happy to walk through what's worked.`
          : `We ${value}. Teams in ${company}'s growth stage usually have one or two pipeline questions worth pressure-testing — no pitch attached.`;
      }
      return v === 0
        ? `On our end, we ${value}. As teams hit the growth-execution stretch, this is usually when the question of pipeline shape gets sharper.`
        : `We ${value} — and the conversation tends to land best with teams at exactly ${company}'s stage of growth.`;
    }

    case "problem-aware": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      if (tone === "Consultative") {
        return v === 0
          ? `What we do sits close to that — we ${value}. If any of it overlaps with what ${company} is tackling now, happy to share a couple of patterns we've seen.`
          : `On our side, we ${value}. There are usually 2–3 patterns we see with teams working in this space — worth a short read if useful.`;
      }
      return v === 0
        ? `We ${value} — happy to share a couple of patterns that have been useful for teams working on similar problems.`
        : `On our side, we ${value}. Worth comparing notes if any of it's relevant to what ${company} is building.`;
    }

    case "re-engagement": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      if (intel.stageContext === "dormant") {
        return v === 0
          ? `On our side, we ${value}. If any of that lands closer to where ${company} is today, I'd be glad to share what's changed.`
          : `We ${value}. No pressure — just wanted to put it back in front of you in case the timing is better now.`;
      }
      if (tone === "Direct") {
        return v === 0
          ? `Quick reminder of what we do — we ${value}. Worth comparing notes again now that the context around ${company} has moved.`
          : `We ${value}. The shift in context on ${company}'s side is a clean reason to revisit briefly.`;
      }
      return v === 0
        ? `On our end, we ${value} — worth comparing notes again now that the context around ${company} has moved.`
        : `What we focus on hasn't changed — we ${value}. But the context around ${company} has, which is the reason for the nudge.`;
    }

    case "qualified-next-step": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      return v === 0
        ? `We ${value}. For ${company}, the cleanest next step is probably a short working session to size the fit concretely.`
        : `We ${value}. Rather than another educational note, I'd rather use the time to map out the next step together.`;
    }

    case "warm-intro": {
      const v = pickIndex(lead, strategy, "bridge", 2);
      return v === 0
        ? `Briefly — we ${value}, and ${company} looked like a credible fit based on what's public so far.`
        : `Quick context — we ${value}. ${company} stood out as the kind of team this tends to land well with.`;
    }

    case "low-data-safe":
    default: {
      const v = pickIndex(lead, strategy, "bridge", 2);
      return v === 0
        ? `Briefly — we ${value}. Wanted to keep this short and just open the door.`
        : `Quick context — we ${value}. Happy to keep it light unless any of that resonates.`;
    }
  }
}

// --------------------------------------------------------------------
// CTAs (per stage + 2 variants each; urgency tunes first-touch)
// --------------------------------------------------------------------

function pickCtaVariant(
  strategy: OutreachStrategy,
  lead: Lead,
  intel: OutreachIntelligence,
): string {
  const stage = intel.stageContext;
  const urgency = intel.urgency;

  type CtaKey =
    | "qualified"
    | "already-contacted"
    | "dormant"
    | "first-touch-high"
    | "first-touch-medium"
    | "first-touch-low";

  const variants: Record<CtaKey, string[]> = {
    qualified: [
      "Could we lock in 20 minutes this week to move the conversation forward?",
      "Worth a short working session this week to map out the next step?",
    ],
    "already-contacted": [
      "Worth a brief follow-up call to pick this back up?",
      "Could we grab 15 minutes this week to revisit?",
    ],
    dormant: [
      "Open to a low-pressure reintro call in the next couple of weeks?",
      "Worth a short call to compare notes on where things stand now?",
    ],
    "first-touch-high": [
      "Could we grab 15 minutes in the next few days while the timing is right?",
      "Worth a short call this week to see if it lines up?",
    ],
    "first-touch-medium": [
      "Would a short call next week make sense?",
      "Worth a brief conversation next week to see if there's a fit?",
    ],
    "first-touch-low": [
      "Open to a quick intro chat in the next couple of weeks?",
      "Worth a short conversation when the timing works on your side?",
    ],
  };

  let key: CtaKey;
  if (stage === "qualified") key = "qualified";
  else if (stage === "already-contacted") key = "already-contacted";
  else if (stage === "dormant") key = "dormant";
  else if (urgency === "high") key = "first-touch-high";
  else if (urgency === "medium") key = "first-touch-medium";
  else key = "first-touch-low";

  const list = variants[key];
  const idx = pickIndex(lead, strategy, `cta:${key}`, list.length);
  return list[idx]!;
}

// --------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------

function shortIndustry(industry: string): string {
  if (!industry) return "your";
  return industry.replace(/\bTech\b/g, "tech").toLowerCase();
}

function describeFocus(lead: Lead): string | null {
  const desc = lead.description?.trim();
  if (!desc || desc.length < 30) return null;
  const firstSentence = desc.split(/(?<=[.!?])\s+/)[0] ?? desc;
  const trimmed = firstSentence.replace(/[.!?]+$/, "").trim();
  if (trimmed.length < 20) return null;
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return lower.length > 140 ? `${lower.slice(0, 137)}…` : lower;
}

// --------------------------------------------------------------------
// Re-exports used by the panel
// --------------------------------------------------------------------

export type { StageContext };
