"use client";

import { useSyncExternalStore } from "react";
import type { OutreachTone } from "@/lib/outreach/outreach-intelligence-engine";

/**
 * Voice Profile Library.
 *
 * The user picks one of several **named voice profiles** ("Funded Outbound",
 * "Re-Engagement", "Founder-to-Founder", "Direct Sales", "Consultative
 * Advisor", plus any custom profiles they save). The selected profile feeds
 * the draft generator as a `SenderProfile` — so the generator's contract is
 * unchanged, and every draft sounds like the chosen voice without affecting
 * the engine-driven outreach strategy.
 *
 * --------------------------------------------------------------------
 * FUTURE AI INTEGRATION POINT
 * --------------------------------------------------------------------
 * Each `VoiceProfile` becomes a per-tenant **prompt-context bundle** when
 * a live LLM composer is wired in. The `voiceNotes` field is reserved for
 * the kind of small free-form steering ("avoid 'circle back' language",
 * "keep emails under 90 words") that's most useful as system-prompt
 * context. Nothing about the library shape needs to change.
 */

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/**
 * Sender contract used by the email draft generator. Kept as a stable
 * structural type so any `VoiceProfile` is a valid `SenderProfile`.
 */
export interface SenderProfile {
  senderName: string;
  companyName: string;
  /** Naturally completes the sentence "We ___". */
  valueProposition: string;
  targetAudience?: string;
  preferredTone?: OutreachTone;
  /** Optional first-touch CTA override. */
  defaultCTA?: string;
  /** Signoff word (no trailing comma — the generator adds it). */
  signoff?: string;
}

/**
 * A single voice example — a style reference written in this profile's
 * voice. Examples are stored alongside the profile and used today purely
 * as style references the user can read. Tomorrow, when a live LLM
 * composer is wired in, they become the few-shot exemplars in the
 * prompt context.
 *
 * Examples are NOT copied verbatim into generated drafts. They never
 * influence the deterministic generator's output.
 */
export interface VoiceExample {
  id: string;
  title: string;
  subject?: string;
  body: string;
  notes?: string;
  createdAt?: string;
}

/**
 * Named voice profile — a `SenderProfile` with library metadata and an
 * optional bank of style example emails.
 */
export interface VoiceProfile extends SenderProfile {
  id: string;
  name: string;
  description?: string;
  /** Optional free-form notes; reserved for future LLM prompt context. */
  voiceNotes?: string;
  /** Protected profiles cannot be deleted (only reset). */
  isProtected?: boolean;
  /** Style references written in this voice. Today: read-only UI. */
  examples?: VoiceExample[];
}

export interface VoiceProfileLibraryState {
  profiles: VoiceProfile[];
  selectedId: string;
}

// --------------------------------------------------------------------
// Defaults
// --------------------------------------------------------------------

export const DEFAULT_VOICE_PROFILES: readonly VoiceProfile[] = [
  {
    id: "funded-outbound",
    name: "Funded Outbound",
    description: "Best for recently funded leads — anchored on the funding event.",
    isProtected: true,
    senderName: "Your Name",
    companyName: "Your Company",
    valueProposition:
      "help funded teams turn investor momentum into qualified pipeline",
    targetAudience: "recently funded teams",
    preferredTone: "Warm",
    defaultCTA: "Would it be worth a quick conversation next week?",
    signoff: "Best",
    voiceNotes: "Keep it timely; assume the founder has limited attention.",
    examples: [
      {
        id: "example-funded-outbound-1",
        title: "Series A momentum",
        subject: "Congrats on the raise at [Company]",
        body:
          "Hi [Founder First Name],\n\n" +
          "Saw the announcement on [Company]'s recent [Round] — congrats to the team. The work on [focus area] is the kind of build I keep an eye on.\n\n" +
          "On our side, we help funded teams turn investor momentum into qualified pipeline. Post-funding tends to be the cleanest window to evaluate options without disrupting what's already working.\n\n" +
          "Would it be worth a quick conversation next week?\n\n" +
          "Best,\n[Your Name]\n[Your Company]",
        notes: "Anchors on the funding moment without inventing investor names or revenue claims.",
      },
    ],
  },
  {
    id: "re-engagement",
    name: "Re-Engagement",
    description: "Best for contacted, nurturing, or dormant leads.",
    isProtected: true,
    senderName: "Your Name",
    companyName: "Your Company",
    valueProposition:
      "help teams revisit growth conversations when the timing becomes more relevant",
    targetAudience: "mid-pipeline and dormant leads",
    preferredTone: "Warm",
    defaultCTA: "Open to a quick reintro call?",
    signoff: "Best",
    voiceNotes: "Acknowledge the gap. Never assume a prior thread that isn't on the lead.",
    examples: [
      {
        id: "example-re-engagement-1",
        title: "Soft re-open",
        subject: "Following up on [Company]",
        body:
          "Hi [Founder First Name],\n\n" +
          "Wanted to revisit briefly given the team's continued work on [focus area] — the context has likely shifted since this was last active on our side.\n\n" +
          "On our end, we help teams revisit growth conversations when the timing becomes more relevant. Worth comparing notes again if useful.\n\n" +
          "Open to a quick reintro call?\n\n" +
          "Best,\n[Your Name]\n[Your Company]",
        notes: "Treats the lead as a continuation, not a cold open. Stays low-pressure.",
      },
    ],
  },
  {
    id: "founder-to-founder",
    name: "Founder-to-Founder",
    description: "More personal, founder-style outreach.",
    isProtected: true,
    senderName: "Your Name",
    companyName: "Your Company",
    valueProposition:
      "help founders identify timely growth opportunities without adding manual prospecting work",
    targetAudience: "founders at funded teams",
    preferredTone: "Consultative",
    defaultCTA: "Worth comparing notes for 15 minutes?",
    signoff: "Best",
    voiceNotes: "Read like a peer note. No corporate hedging, no formal asks.",
    examples: [
      {
        id: "example-founder-to-founder-1",
        title: "Peer note",
        subject: "Quick thought on [Company]",
        body:
          "Hi [Founder First Name],\n\n" +
          "[Company]'s angle on [focus area] caught my eye — wanted to reach out directly, founder to founder.\n\n" +
          "We help founders identify timely growth opportunities without adding manual prospecting work. If any of that's relevant to where you're focused right now, I'd be glad to share what we've seen.\n\n" +
          "Worth comparing notes for 15 minutes?\n\n" +
          "Best,\n[Your Name]\n[Your Company]",
        notes: "Personal tone. No formal hedging. Treats the founder as a peer, not a prospect.",
      },
    ],
  },
  {
    id: "direct-sales",
    name: "Direct Sales",
    description: "Clear, concise outbound for revenue-led conversations.",
    isProtected: true,
    senderName: "Your Name",
    companyName: "Your Company",
    valueProposition:
      "help revenue teams prioritize the right accounts and start better conversations faster",
    targetAudience: "revenue and GTM leaders",
    preferredTone: "Direct",
    defaultCTA: "Worth a 15-minute call this week?",
    signoff: "Best",
    voiceNotes: "Short sentences. One clear ask. No softeners.",
    examples: [
      {
        id: "example-direct-sales-1",
        title: "Concise outreach",
        subject: "[Company] — quick ask",
        body:
          "[Founder First Name],\n\n" +
          "[Company] keeps showing up in the kinds of teams we work well with.\n\n" +
          "We help revenue teams prioritize the right accounts and start better conversations faster. The clearest way to know if there's a fit is a short call.\n\n" +
          "Worth 15 minutes this week?\n\n" +
          "Best,\n[Your Name]\n[Your Company]",
        notes: "Short sentences. One clear ask. No softeners.",
      },
    ],
  },
  {
    id: "consultative-advisor",
    name: "Consultative Advisor",
    description: "Problem-aware, signal-based outreach for advisor-style asks.",
    isProtected: true,
    senderName: "Your Name",
    companyName: "Your Company",
    valueProposition:
      "help teams translate market signals into practical go-to-market next steps",
    targetAudience: "operators thinking about category positioning",
    preferredTone: "Consultative",
    defaultCTA: "Would it be useful to compare notes?",
    signoff: "Best",
    voiceNotes: "Lead with observation, not pitch. Offer perspective before any ask.",
    examples: [
      {
        id: "example-consultative-advisor-1",
        title: "Pattern observation",
        subject: "A thought on [Company]'s [category] work",
        body:
          "Hi [Founder First Name],\n\n" +
          "Been watching what's happening in [Company]'s category — the recent shift toward [focus area] is one of the more interesting signals this quarter.\n\n" +
          "We help teams translate market signals into practical go-to-market next steps. Often the most useful angle is sharing what we've seen work for similar teams — no pitch attached.\n\n" +
          "Would it be useful to compare notes?\n\n" +
          "Best,\n[Your Name]\n[Your Company]",
        notes: "Leads with observation, not pitch. Offers perspective before any ask.",
      },
    ],
  },
];

/**
 * Convenience export — the generator's existing contract still imports this
 * single-profile default. Mapped to the first default voice profile.
 */
export const DEFAULT_SENDER_PROFILE: SenderProfile = stripProfileMeta(
  DEFAULT_VOICE_PROFILES[0]!,
);

const DEFAULT_LIBRARY: VoiceProfileLibraryState = {
  profiles: DEFAULT_VOICE_PROFILES.map((p) => ({ ...p })),
  selectedId: DEFAULT_VOICE_PROFILES[0]!.id,
};

// --------------------------------------------------------------------
// Storage helpers
// --------------------------------------------------------------------

export const VOICE_PROFILE_LIBRARY_STORAGE_KEY = "whoraised.voiceProfiles.v1";
export const VOICE_PROFILE_SELECTED_STORAGE_KEY = "whoraised.selectedVoiceProfile.v1";
export const LEGACY_SENDER_PROFILE_STORAGE_KEY = "whoraised.senderProfile.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeRead(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota / disabled storage — fall back to in-memory only
  }
}

function safeRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function cloneLibrary(state: VoiceProfileLibraryState): VoiceProfileLibraryState {
  return {
    selectedId: state.selectedId,
    profiles: state.profiles.map((p) => ({ ...p })),
  };
}

function stripProfileMeta(profile: VoiceProfile): SenderProfile {
  // The generator only needs SenderProfile fields. Strip library metadata.
  const { /* eslint-disable @typescript-eslint/no-unused-vars */ id, name, description, voiceNotes, isProtected, /* eslint-enable @typescript-eslint/no-unused-vars */ ...rest } = profile;
  return rest;
}

function generateCustomId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `custom-${t}-${r}`;
}

function findProfile(
  state: VoiceProfileLibraryState,
  id: string,
): VoiceProfile | null {
  return state.profiles.find((p) => p.id === id) ?? null;
}

/**
 * Ensure a profile object has a sane `examples` array. Older library JSON
 * (pre-example-bank) may not include the field.
 */
function normalizeExamples(profile: Partial<VoiceProfile>): VoiceExample[] {
  if (!Array.isArray(profile.examples)) return [];
  return profile.examples
    .filter((e): e is VoiceExample => Boolean(e && typeof e.id === "string" && typeof e.body === "string"))
    .map((e) => ({
      id: e.id,
      title: typeof e.title === "string" ? e.title : "Untitled example",
      subject: typeof e.subject === "string" ? e.subject : undefined,
      body: e.body,
      notes: typeof e.notes === "string" ? e.notes : undefined,
      createdAt: typeof e.createdAt === "string" ? e.createdAt : undefined,
    }));
}

function generateExampleId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `example-${t}-${r}`;
}

function ensureValidSelection(
  state: VoiceProfileLibraryState,
): VoiceProfileLibraryState {
  if (state.profiles.length === 0) {
    return cloneLibrary(DEFAULT_LIBRARY);
  }
  if (!findProfile(state, state.selectedId)) {
    return { ...state, selectedId: state.profiles[0]!.id };
  }
  return state;
}

// --------------------------------------------------------------------
// Load / migrate
// --------------------------------------------------------------------

function migrateLegacyIfPresent(): VoiceProfileLibraryState | null {
  const raw = safeRead(LEGACY_SENDER_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const legacy = JSON.parse(raw) as Partial<SenderProfile>;
    const migrated: VoiceProfile = {
      id: "custom-migrated",
      name: "Custom (Migrated)",
      description: "Imported from your previous single sender profile.",
      isProtected: false,
      senderName: legacy.senderName?.trim() || DEFAULT_VOICE_PROFILES[0]!.senderName,
      companyName: legacy.companyName?.trim() || DEFAULT_VOICE_PROFILES[0]!.companyName,
      valueProposition:
        legacy.valueProposition?.trim() ||
        DEFAULT_VOICE_PROFILES[0]!.valueProposition,
      targetAudience: legacy.targetAudience,
      preferredTone: legacy.preferredTone,
      defaultCTA: legacy.defaultCTA,
      signoff: legacy.signoff,
      examples: [],
    };
    // Remove the legacy key once we've successfully migrated. The new
    // library write below is what makes the migration permanent.
    safeRemove(LEGACY_SENDER_PROFILE_STORAGE_KEY);
    return {
      profiles: [migrated, ...DEFAULT_VOICE_PROFILES.map((p) => ({ ...p }))],
      selectedId: migrated.id,
    };
  } catch {
    return null;
  }
}

function loadLibrary(): VoiceProfileLibraryState {
  if (!isBrowser()) return cloneLibrary(DEFAULT_LIBRARY);

  const libRaw = safeRead(VOICE_PROFILE_LIBRARY_STORAGE_KEY);
  if (libRaw) {
    try {
      const parsed = JSON.parse(libRaw) as Partial<VoiceProfileLibraryState>;
      if (
        parsed &&
        Array.isArray(parsed.profiles) &&
        parsed.profiles.length > 0
      ) {
        const selectedRaw = safeRead(VOICE_PROFILE_SELECTED_STORAGE_KEY);
        const selectedId =
          selectedRaw ?? parsed.selectedId ?? parsed.profiles[0]!.id;
        return ensureValidSelection({
          profiles: parsed.profiles.map((p) => ({
            ...DEFAULT_LIBRARY.profiles[0]!,
            ...p,
            // Normalize examples — pre-example-bank library JSON won't have it.
            examples: normalizeExamples(p),
          })),
          selectedId,
        });
      }
    } catch {
      // fall through to migration / default
    }
  }

  const migrated = migrateLegacyIfPresent();
  if (migrated) return migrated;

  return cloneLibrary(DEFAULT_LIBRARY);
}

function persist(state: VoiceProfileLibraryState): void {
  try {
    safeWrite(
      VOICE_PROFILE_LIBRARY_STORAGE_KEY,
      JSON.stringify({ profiles: state.profiles, selectedId: state.selectedId }),
    );
    safeWrite(VOICE_PROFILE_SELECTED_STORAGE_KEY, state.selectedId);
  } catch {
    // ignore — state still lives in memory for the session
  }
}

// --------------------------------------------------------------------
// Reactive store
// --------------------------------------------------------------------

type Listener = () => void;

const store = (() => {
  let cached: VoiceProfileLibraryState = cloneLibrary(DEFAULT_LIBRARY);
  let hydrated = false;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach((cb) => cb());

  return {
    get: () => cached,
    set: (next: VoiceProfileLibraryState, options?: { persistChanges?: boolean }) => {
      cached = ensureValidSelection(next);
      if (options?.persistChanges !== false) persist(cached);
      notify();
    },
    subscribe: (cb: Listener) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    hydrateIfNeeded: () => {
      if (hydrated || !isBrowser()) return;
      hydrated = true;
      const loaded = loadLibrary();
      cached = loaded;
      // Persist the migrated/initial state so we don't repeatedly read the
      // legacy key on every reload.
      persist(cached);
      notify();
    },
  };
})();

function subscribe(cb: Listener): () => void {
  store.hydrateIfNeeded();

  const handleStorage = (e: StorageEvent) => {
    if (
      e.key !== VOICE_PROFILE_LIBRARY_STORAGE_KEY &&
      e.key !== VOICE_PROFILE_SELECTED_STORAGE_KEY
    ) {
      return;
    }
    const next = loadLibrary();
    store.set(next, { persistChanges: false });
  };

  if (isBrowser()) {
    window.addEventListener("storage", handleStorage);
  }

  const off = store.subscribe(cb);
  return () => {
    off();
    if (isBrowser()) window.removeEventListener("storage", handleStorage);
  };
}

function getServerSnapshot(): VoiceProfileLibraryState {
  return DEFAULT_LIBRARY;
}

// --------------------------------------------------------------------
// Public hook
// --------------------------------------------------------------------

export interface UseVoiceProfileLibraryResult {
  library: VoiceProfileLibraryState;
  selected: VoiceProfile;
  selectProfile: (id: string) => void;
  updateSelected: (patch: Partial<VoiceProfile>) => void;
  updateProfile: (id: string, patch: Partial<VoiceProfile>) => void;
  duplicateProfile: (id: string) => string | null;
  deleteProfile: (id: string) => void;
  resetProfile: (id: string) => void;
  resetAll: () => void;
  isDefault: (id: string) => boolean;
  // Example bank operations
  addExample: (
    profileId: string,
    example: Omit<VoiceExample, "id" | "createdAt"> & { id?: string },
  ) => string;
  updateExample: (
    profileId: string,
    exampleId: string,
    patch: Partial<VoiceExample>,
  ) => void;
  deleteExample: (profileId: string, exampleId: string) => void;
  resetExamples: (profileId: string) => void;
}

export function useVoiceProfileLibrary(): UseVoiceProfileLibraryResult {
  const library = useSyncExternalStore(subscribe, store.get, getServerSnapshot);

  const selected =
    findProfile(library, library.selectedId) ?? library.profiles[0]!;

  return {
    library,
    selected,
    selectProfile: (id) => {
      const current = store.get();
      if (!findProfile(current, id)) return;
      store.set({ ...current, selectedId: id });
    },
    updateSelected: (patch) => {
      const current = store.get();
      store.set({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === current.selectedId
            ? { ...p, ...patch, id: p.id, isProtected: p.isProtected }
            : p,
        ),
      });
    },
    updateProfile: (id, patch) => {
      const current = store.get();
      store.set({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === id ? { ...p, ...patch, id: p.id, isProtected: p.isProtected } : p,
        ),
      });
    },
    duplicateProfile: (id) => {
      const current = store.get();
      const source = findProfile(current, id);
      if (!source) return null;
      const newId = generateCustomId();
      const dup: VoiceProfile = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        isProtected: false,
        description: source.description
          ? `${source.description} — duplicated`
          : "Duplicated from a default profile.",
        // Carry the source examples across but give them fresh IDs so they
        // don't collide with the original profile's example IDs.
        examples: (source.examples ?? []).map((ex) => ({
          ...ex,
          id: generateExampleId(),
        })),
      };
      store.set({
        ...current,
        profiles: [...current.profiles, dup],
        selectedId: newId,
      });
      return newId;
    },
    deleteProfile: (id) => {
      const current = store.get();
      const target = findProfile(current, id);
      if (!target || target.isProtected) return;
      const next = current.profiles.filter((p) => p.id !== id);
      const nextSelectedId =
        current.selectedId === id ? next[0]?.id ?? "" : current.selectedId;
      store.set({ profiles: next, selectedId: nextSelectedId });
    },
    resetProfile: (id) => {
      const current = store.get();
      const def = DEFAULT_VOICE_PROFILES.find((p) => p.id === id);
      if (!def) return;
      store.set({
        ...current,
        profiles: current.profiles.map((p) => (p.id === id ? { ...def } : p)),
      });
    },
    resetAll: () => {
      safeRemove(VOICE_PROFILE_LIBRARY_STORAGE_KEY);
      safeRemove(VOICE_PROFILE_SELECTED_STORAGE_KEY);
      store.set(cloneLibrary(DEFAULT_LIBRARY));
    },
    isDefault: (id) => DEFAULT_VOICE_PROFILES.some((p) => p.id === id),
    addExample: (profileId, example) => {
      const current = store.get();
      const target = findProfile(current, profileId);
      if (!target) return "";
      const newExample: VoiceExample = {
        id: example.id ?? generateExampleId(),
        title: example.title?.trim() || "Untitled example",
        subject: example.subject?.trim() || undefined,
        body: example.body ?? "",
        notes: example.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      store.set({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === profileId
            ? { ...p, examples: [...(p.examples ?? []), newExample] }
            : p,
        ),
      });
      return newExample.id;
    },
    updateExample: (profileId, exampleId, patch) => {
      const current = store.get();
      const target = findProfile(current, profileId);
      if (!target) return;
      store.set({
        ...current,
        profiles: current.profiles.map((p) => {
          if (p.id !== profileId) return p;
          return {
            ...p,
            examples: (p.examples ?? []).map((ex) =>
              ex.id === exampleId
                ? {
                    ...ex,
                    ...patch,
                    id: ex.id,
                    // Preserve createdAt if the patch didn't supply one.
                    createdAt: patch.createdAt ?? ex.createdAt,
                  }
                : ex,
            ),
          };
        }),
      });
    },
    deleteExample: (profileId, exampleId) => {
      const current = store.get();
      const target = findProfile(current, profileId);
      if (!target) return;
      store.set({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === profileId
            ? {
                ...p,
                examples: (p.examples ?? []).filter((ex) => ex.id !== exampleId),
              }
            : p,
        ),
      });
    },
    resetExamples: (profileId) => {
      const def = DEFAULT_VOICE_PROFILES.find((p) => p.id === profileId);
      if (!def) return;
      const current = store.get();
      store.set({
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === profileId
            ? { ...p, examples: (def.examples ?? []).map((e) => ({ ...e })) }
            : p,
        ),
      });
    },
  };
}

/**
 * Lightweight summary of the example bank for the given profile.
 * Used by the UI to render the "Voice examples: N" / readiness indicator
 * without leaking any expectation that examples currently rewrite the
 * draft. Examples become functional only when a live LLM composer is
 * wired in — see `voice-profile-context.ts`.
 */
export interface VoiceExampleSummary {
  exampleCount: number;
  hasExamples: boolean;
  /** Honest, short hint for the UI. Never claims live AI behavior. */
  styleHint: string;
}

export function getVoiceExampleSummary(profile: VoiceProfile): VoiceExampleSummary {
  const count = profile.examples?.length ?? 0;
  let styleHint: string;
  if (count === 0) {
    styleHint = "No examples yet. Add a few to improve future AI voice matching.";
  } else if (count === 1) {
    styleHint = "1 example saved as future AI voice context.";
  } else {
    styleHint = `${count} examples saved as future AI voice context.`;
  }
  return {
    exampleCount: count,
    hasExamples: count > 0,
    styleHint,
  };
}

/**
 * Convenience: returns true if a protected profile has been edited away
 * from its default values. Used by the UI to show an "Edited" hint.
 */
export function isProfileEditedFromDefault(profile: VoiceProfile): boolean {
  if (!profile.isProtected) return false;
  const def = DEFAULT_VOICE_PROFILES.find((p) => p.id === profile.id);
  if (!def) return false;
  if (
    profile.name !== def.name ||
    profile.description !== def.description ||
    profile.senderName !== def.senderName ||
    profile.companyName !== def.companyName ||
    profile.valueProposition !== def.valueProposition ||
    (profile.targetAudience ?? "") !== (def.targetAudience ?? "") ||
    (profile.preferredTone ?? "") !== (def.preferredTone ?? "") ||
    (profile.defaultCTA ?? "") !== (def.defaultCTA ?? "") ||
    (profile.signoff ?? "") !== (def.signoff ?? "") ||
    (profile.voiceNotes ?? "") !== (def.voiceNotes ?? "")
  ) {
    return true;
  }
  // Example bank diff — count + per-example field comparison.
  const profileExamples = profile.examples ?? [];
  const defExamples = def.examples ?? [];
  if (profileExamples.length !== defExamples.length) return true;
  for (let i = 0; i < profileExamples.length; i++) {
    const a = profileExamples[i]!;
    const b = defExamples[i]!;
    if (
      a.id !== b.id ||
      a.title !== b.title ||
      (a.subject ?? "") !== (b.subject ?? "") ||
      a.body !== b.body ||
      (a.notes ?? "") !== (b.notes ?? "")
    ) {
      return true;
    }
  }
  return false;
}
