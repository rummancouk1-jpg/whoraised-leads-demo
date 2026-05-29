import type { VoiceExample, VoiceProfile } from "@/lib/outreach/sender-profile";

/**
 * Serialize a voice profile (and its example bank) into a clean,
 * LLM-ready prompt context block.
 *
 * --------------------------------------------------------------------
 * CURRENT BEHAVIOR
 * --------------------------------------------------------------------
 * This helper is **not called by the deterministic generator**. It
 * exists so the voice profile and its examples are already in a
 * production-ready prompt shape the moment a live LLM is wired in.
 * Calling it today returns a string the UI could log, copy, or persist
 * — but no API call is made.
 *
 * --------------------------------------------------------------------
 * FUTURE AI INTEGRATION
 * --------------------------------------------------------------------
 * When the `email-draft-generator` switches `mode: "ai-ready"`, the
 * returned string slots directly into the system prompt above:
 *   - the sanitized lead facts (Lead)
 *   - the OutreachIntelligence (strategy, doNotMention safety contract)
 *
 * Voice examples become **few-shot style references** the model is
 * instructed to mirror — never to copy verbatim. The deterministic
 * `assessDraftQuality` still runs against the LLM output to catch
 * spammy phrasing, unsupported claims, or anything that violates the
 * doNotMention contract.
 */
export function buildVoiceProfilePromptContext(
  profile: VoiceProfile,
): string {
  const lines: string[] = [];

  lines.push(`You are writing in the voice of "${profile.name}".`);
  if (profile.description) {
    lines.push(profile.description);
  }
  lines.push("");

  lines.push("SENDER PROFILE");
  lines.push(`- Sender: ${profile.senderName} (${profile.companyName})`);
  if (profile.targetAudience) {
    lines.push(`- Target audience: ${profile.targetAudience}`);
  }
  lines.push(`- Preferred tone: ${profile.preferredTone ?? "Warm"}`);
  if (profile.defaultCTA?.trim()) {
    lines.push(`- Preferred first-touch CTA: "${profile.defaultCTA.trim()}"`);
  }
  lines.push(`- Signoff: "${(profile.signoff ?? "Best").trim()}"`);
  lines.push("");

  lines.push("VOICE PROPOSITION");
  lines.push(`We ${profile.valueProposition.trim()}.`);
  lines.push("");

  if (profile.voiceNotes?.trim()) {
    lines.push("VOICE NOTES");
    lines.push(profile.voiceNotes.trim());
    lines.push("");
  }

  const examples = profile.examples ?? [];
  if (examples.length === 0) {
    lines.push("STYLE EXAMPLES");
    lines.push("(No examples saved yet for this voice.)");
  } else {
    lines.push(`STYLE EXAMPLES (${examples.length})`);
    examples.forEach((ex, idx) => {
      lines.push("");
      lines.push(`Example ${idx + 1} — "${ex.title}"`);
      if (ex.subject?.trim()) {
        lines.push(`Subject: ${ex.subject.trim()}`);
      }
      lines.push("Body:");
      // Indent the body for readability inside the prompt block.
      for (const bodyLine of ex.body.split("\n")) {
        lines.push(`  ${bodyLine}`);
      }
      if (ex.notes?.trim()) {
        lines.push(`Notes: ${ex.notes.trim()}`);
      }
    });
  }

  lines.push("");
  lines.push("USAGE RULES");
  lines.push(
    "- Mirror the voice and pacing of the style examples. Do NOT copy any sentence verbatim.",
  );
  lines.push("- Never invent facts that are not on the lead record.");
  lines.push("- Stay within 50–170 words.");
  lines.push("- Always end with a clear meeting/call question.");

  return lines.join("\n");
}

/**
 * Tiny utility — exposes the per-example payload as a structured object,
 * useful if a future API call wants to send each example as its own
 * message rather than concatenating them into one block.
 */
export function buildVoiceExampleMessages(profile: VoiceProfile): Array<{
  role: "system";
  name: string;
  content: string;
}> {
  const examples: VoiceExample[] = profile.examples ?? [];
  return examples.map((ex) => ({
    role: "system" as const,
    name: `voice-example-${ex.id}`,
    content: [
      ex.subject ? `Subject: ${ex.subject}` : null,
      "Body:",
      ex.body,
      ex.notes ? `Notes: ${ex.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  }));
}
