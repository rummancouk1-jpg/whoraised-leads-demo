import type { Lead } from "@/types/lead";
import type { OutreachIntelligence } from "@/lib/outreach/outreach-intelligence-engine";

/**
 * Deterministic post-composition safety + quality check.
 *
 * Runs over the composed draft AFTER the generator produces it and
 * returns a structured assessment the UI can surface. The check is
 * intentionally cheap and rule-based — it catches the kinds of mistakes
 * a careless template (or a future LLM) is most likely to make:
 * spammy phrasing, unsupported claims, missing personalization, weak
 * or missing CTA, overlong copy.
 *
 * --------------------------------------------------------------------
 * FUTURE AI INTEGRATION POINT
 * --------------------------------------------------------------------
 * When a live LLM is wired into the composer, this checker stays as is
 * and runs against the LLM output. The `revisionHints` array is shaped
 * to feed straight back into the LLM as a refinement prompt ("rewrite
 * to fix: X, Y, Z").
 */

export type DraftQualityStatus = "High" | "Good" | "Needs Review";

export interface DraftQualityChecks {
  noInventedFacts: boolean;
  hasPersonalization: boolean;
  hasClearCTA: boolean;
  notTooLong: boolean;
  noSpammyPhrases: boolean;
  noUnsupportedClaims: boolean;
}

export interface DraftQualityAssessment {
  qualityScore: number;
  status: DraftQualityStatus;
  checks: DraftQualityChecks;
  warnings: string[];
  revisionHints: string[];
}

interface DraftLike {
  subject: string;
  body: string;
}

const MIN_WORDS = 50;
const MAX_WORDS = 170;

const SPAM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bguarantee[sd]?\b/i, label: '"guarantee" language' },
  { pattern: /\b100\s*%\b/, label: '"100%" claim' },
  { pattern: /\bact\s+now\b/i, label: '"act now" urgency tactic' },
  { pattern: /\blimited\s+time\b/i, label: '"limited time" urgency tactic' },
  { pattern: /\bno[- ]risk\b/i, label: '"no risk" claim' },
  { pattern: /\bbest\s+in\s+(the\s+)?(world|industry|market|class)\b/i, label: '"best in the X" superlative' },
  { pattern: /\bgame[\s-]?chang(er|ing)\b/i, label: '"game-changer" cliché' },
  { pattern: /\brevolution(ary|ize|ising|izing)\b/i, label: '"revolutionary" cliché' },
];

const UNSUPPORTED_CLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bwe\s+helped\s+\w+\s+(grow|scale|increase|boost|double|triple)\b/i, label: 'Unsupported "we helped X grow" claim' },
  { pattern: /\bcustomers\s+(like|including)\s+\w+/i, label: 'Named-customer reference without data backing' },
  { pattern: /\bas\s+you\s+(probably\s+)?know\b/i, label: 'Fake familiarity ("as you know")' },
  { pattern: /\b(your|the)\s+investors?\s+\w+/i, label: 'Personalized investor reference (likely invented)' },
  { pattern: /\bi\s+noticed\s+your\s+(post|tweet|linkedin)\b/i, label: 'Fake activity reference' },
  { pattern: /\bmutual\s+(friend|connection|contact)\b/i, label: 'Fake mutual connection' },
  { pattern: /\$\d+(\.\d+)?[MBK]?\s+(in\s+)?(arr|revenue)\b/i, label: 'Revenue/ARR figure not present in lead data' },
];

const CTA_HINT_WORDS =
  /\b(call|meeting|chat|conversation|step|sync|intro|reintro|connect|catch[- ]?up|huddle|working\s+session|compare\s+notes|follow[- ]?up|\d{1,3}\s*minutes?|coffee|demo|walk\s*through|talk)\b/i;

const SIGNOFF_OPENERS =
  /^(best|regards|thanks|thank\s+you|cheers|sincerely|kind\s+regards|all\s+the\s+best|talk\s+soon|yours|warmly)\b/i;

export function assessDraftQuality(
  draft: DraftLike,
  lead: Lead,
  intel: OutreachIntelligence,
): DraftQualityAssessment {
  const body = draft.body;
  const wordCount = countWords(`${draft.subject} ${body}`);

  const checks: DraftQualityChecks = {
    noInventedFacts: checkNoInventedFacts(body, lead, intel),
    hasPersonalization: checkHasPersonalization(body, lead),
    hasClearCTA: checkHasClearCTA(body),
    notTooLong: wordCount >= MIN_WORDS && wordCount <= MAX_WORDS,
    noSpammyPhrases: !SPAM_PATTERNS.some((p) => p.pattern.test(body)),
    noUnsupportedClaims: !UNSUPPORTED_CLAIM_PATTERNS.some((p) => p.pattern.test(body)),
  };

  const warnings: string[] = [];
  const revisionHints: string[] = [];

  if (!checks.noSpammyPhrases) {
    const matches = SPAM_PATTERNS.filter((p) => p.pattern.test(body)).map((p) => p.label);
    warnings.push(`Spammy language detected: ${matches.join(", ")}.`);
    revisionHints.push("Remove urgency-tactic or superlative language and replace with neutral phrasing.");
  }
  if (!checks.noUnsupportedClaims) {
    const matches = UNSUPPORTED_CLAIM_PATTERNS.filter((p) => p.pattern.test(body)).map((p) => p.label);
    warnings.push(`Unsupported claim detected: ${matches.join(", ")}.`);
    revisionHints.push("Drop any reference that isn't backed by the lead data on this record.");
  }
  if (!checks.noInventedFacts) {
    warnings.push("Body may reference details that aren't on the lead record.");
    revisionHints.push("Review the email against the lead's data and remove any unverifiable specifics.");
  }
  if (!checks.hasPersonalization) {
    warnings.push("Email does not reference the company by name.");
    revisionHints.push("Mention the company at least once so the email doesn't read as templated.");
  }
  if (!checks.hasClearCTA) {
    warnings.push("No clear call to action — the reader has nothing to respond to.");
    revisionHints.push("End with a concrete ask (a short call, a working session, an intro).");
  }
  if (!checks.notTooLong) {
    if (wordCount > MAX_WORDS) {
      warnings.push(`Body is ${wordCount} words — over the ${MAX_WORDS}-word ceiling for cold outbound.`);
      revisionHints.push("Trim the bridge sentence and remove any line that doesn't earn its place.");
    } else {
      warnings.push(`Body is only ${wordCount} words — may read as too thin to take seriously.`);
      revisionHints.push("Add one factual sentence anchored on lead data (industry, signal, or stage).");
    }
  }

  // Cross-check against intelligence: if intel flagged "do not mention investors"
  // but the body references investors, that's an unsupported-claim flavor.
  if (
    intel.doNotMention.some((label) =>
      /investor/i.test(label),
    ) &&
    /\binvestors?\b/i.test(body)
  ) {
    checks.noInventedFacts = false;
    if (!warnings.some((w) => w.includes("investor"))) {
      warnings.push("Body references investors but the lead has no investor data on file.");
      revisionHints.push("Remove investor mentions or add investor data to the lead.");
    }
  }

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.values(checks).length;
  const qualityScore = Math.round((passed / total) * 100);
  const status = scoreToStatus(qualityScore);

  return {
    qualityScore,
    status,
    checks,
    warnings,
    revisionHints,
  };
}

// --------------------------------------------------------------------
// Individual checks
// --------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkNoInventedFacts(
  body: string,
  lead: Lead,
  intel: OutreachIntelligence,
): boolean {
  // Cheap deterministic check: scan the body for things that should only
  // appear if they're on the lead. Anything on the doNotMention list that
  // shows up in the body is treated as an invented-fact risk.
  for (const label of intel.doNotMention) {
    const lower = label.toLowerCase();
    if (lower.includes("specific revenue") || lower.includes("arr")) {
      if (/\bARR\b/.test(body) || /\$\d+(\.\d+)?[MBK]?\s+(in\s+)?(revenue|arr)\b/i.test(body)) {
        return false;
      }
    }
    if (lower.includes("named customers")) {
      if (/\b(customers?|clients?)\s+(like|including)\b/i.test(body)) {
        return false;
      }
    }
    if (lower.includes("prior conversation") && lead.status === "New") {
      if (/\b(last\s+time\s+we\s+spoke|as\s+we\s+discussed|when\s+we\s+chatted)\b/i.test(body)) {
        return false;
      }
    }
  }
  return true;
}

function checkHasPersonalization(body: string, lead: Lead): boolean {
  if (!lead.companyName) return true;
  return body.toLowerCase().includes(lead.companyName.toLowerCase());
}

function checkHasClearCTA(body: string): boolean {
  // A clear CTA in B2B outreach is a question (or imperative ask) that
  // references a meeting/call/conversation/working-session word. The CTA
  // typically sits just before the signoff, but a multi-line signoff
  // (closing + name + company) can push it out of the "last few lines"
  // window — so we strip signoff lines first, then scan the remaining
  // body for a CTA anywhere within it.
  const lines = body.split("\n").map((l) => l.trim());
  const ctaLines: string[] = [];
  let hitSignoff = false;
  for (const line of lines) {
    if (!line) continue;
    if (SIGNOFF_OPENERS.test(line)) {
      hitSignoff = true;
      continue;
    }
    // Once we've started consuming a signoff block, treat subsequent
    // short non-questioning lines (name, company) as part of it.
    if (hitSignoff && !line.includes("?") && line.split(/\s+/).length <= 6) {
      continue;
    }
    ctaLines.push(line);
  }

  // Look at every sentence containing a question mark — the CTA can be
  // anywhere in the body, not just on the final line.
  const bodyForScan = ctaLines.join(" ");
  const sentences = bodyForScan
    .split(/(?<=[?.!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences.some(
    (sentence) => sentence.includes("?") && CTA_HINT_WORDS.test(sentence),
  );
}

function scoreToStatus(score: number): DraftQualityStatus {
  if (score >= 100) return "High";
  if (score >= 83) return "Good";
  return "Needs Review";
}
