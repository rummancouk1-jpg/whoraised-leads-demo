import type { OutreachStrategy } from "@/lib/outreach/outreach-intelligence-engine";
import type { VoiceProfile } from "@/lib/outreach/sender-profile";

/**
 * Strategy → recommended voice profile IDs. The first id is the strongest
 * fit; subsequent entries are sensible alternates worth trying for the
 * same lead. These are recommendations only — the user can still switch
 * to any profile in the library.
 */
const STRATEGY_TO_VOICE_RECOMMENDATIONS: Record<OutreachStrategy, readonly string[]> = {
  "funding-trigger": ["funded-outbound", "founder-to-founder", "direct-sales"],
  "re-engagement": ["re-engagement", "consultative-advisor", "founder-to-founder"],
  "qualified-next-step": ["direct-sales", "consultative-advisor"],
  "growth-signal": ["consultative-advisor", "funded-outbound", "direct-sales"],
  "problem-aware": ["consultative-advisor", "founder-to-founder"],
  "warm-intro": ["founder-to-founder", "funded-outbound"],
  "low-data-safe": ["founder-to-founder", "re-engagement", "funded-outbound"],
};

/**
 * Short, demo-friendly hint shown under each recommended voice chip.
 * Falls back to a generic label if a profile id is unrecognized.
 */
const VOICE_HINTS: Record<string, string> = {
  "funded-outbound": "timely funding-led",
  "re-engagement": "soft follow-up",
  "founder-to-founder": "personal founder tone",
  "direct-sales": "short and direct",
  "consultative-advisor": "signal-led advisor tone",
};

export interface VoiceRecommendation {
  profile: VoiceProfile;
  hint: string;
}

/**
 * Resolve 2–3 voice-profile recommendations for the given strategy from
 * the available library. Missing or deleted profiles are skipped silently
 * so the recommendation row degrades gracefully when the user's library
 * is incomplete.
 */
export function recommendVoicesForStrategy(
  strategy: OutreachStrategy,
  available: VoiceProfile[],
): VoiceRecommendation[] {
  const wantedIds = STRATEGY_TO_VOICE_RECOMMENDATIONS[strategy] ?? [];
  const byId = new Map(available.map((p) => [p.id, p]));
  const out: VoiceRecommendation[] = [];
  for (const id of wantedIds) {
    const profile = byId.get(id);
    if (!profile) continue;
    out.push({
      profile,
      hint: VOICE_HINTS[id] ?? "alternative voice",
    });
  }
  return out;
}

/**
 * Convenience: returns true if there is at least one recommendation
 * resolvable from the library for the given strategy. Used by the UI
 * to decide whether to render the "Try another voice" row at all.
 */
export function hasVoiceRecommendations(
  strategy: OutreachStrategy,
  available: VoiceProfile[],
): boolean {
  return recommendVoicesForStrategy(strategy, available).length > 0;
}
