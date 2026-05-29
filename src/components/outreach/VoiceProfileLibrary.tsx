"use client";

import { useState } from "react";
import type { OutreachTone } from "@/lib/outreach/outreach-intelligence-engine";
import {
  DEFAULT_VOICE_PROFILES,
  getVoiceExampleSummary,
  isProfileEditedFromDefault,
  type UseVoiceProfileLibraryResult,
  type VoiceProfile,
} from "@/lib/outreach/sender-profile";
import { VoiceExamplesSection } from "@/components/outreach/VoiceExamplesSection";

interface VoiceProfileLibraryProps {
  library: UseVoiceProfileLibraryResult;
  /** Compact mode tightens spacing for nested-drawer contexts. */
  compact?: boolean;
}

const TONE_OPTIONS: { id: OutreachTone; label: string; hint: string }[] = [
  { id: "Professional", label: "Professional", hint: "Measured and businesslike" },
  { id: "Warm", label: "Warm", hint: "Friendly and direct" },
  { id: "Direct", label: "Direct", hint: "Short and to the point" },
  { id: "Consultative", label: "Consultative", hint: "Advisor-led, lower pressure" },
];

export function VoiceProfileLibrary({
  library,
  compact = false,
}: VoiceProfileLibraryProps) {
  const {
    library: state,
    selected,
    selectProfile,
    updateSelected,
    duplicateProfile,
    deleteProfile,
    resetProfile,
    resetAll,
    isDefault,
  } = library;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VoiceProfile>(selected);
  // Reset the edit buffer whenever the selected profile changes externally
  // (e.g. user clicks a different chip, or cross-tab sync).
  const [lastSyncedId, setLastSyncedId] = useState(selected.id);
  if (lastSyncedId !== selected.id) {
    setLastSyncedId(selected.id);
    setDraft(selected);
  }

  const isEditedFromDefault = isProfileEditedFromDefault(selected);
  const isDefaultProfile = isDefault(selected.id);
  const summary = composeSummary(selected);
  const dirty = !sameProfile(draft, selected);
  const exampleSummary = getVoiceExampleSummary(selected);

  const handleSave = () => {
    updateSelected({
      name: draft.name.trim() || selected.name,
      description: draft.description?.trim() || undefined,
      senderName: draft.senderName.trim() || selected.senderName,
      companyName: draft.companyName.trim() || selected.companyName,
      valueProposition:
        draft.valueProposition.trim() || selected.valueProposition,
      targetAudience: draft.targetAudience?.trim() || undefined,
      preferredTone: draft.preferredTone ?? selected.preferredTone,
      defaultCTA: draft.defaultCTA?.trim() || undefined,
      signoff: draft.signoff?.trim() || selected.signoff,
      voiceNotes: draft.voiceNotes?.trim() || undefined,
    });
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(selected);
    setOpen(false);
  };

  const handleResetProfile = () => {
    if (!isDefaultProfile) return;
    resetProfile(selected.id);
  };

  const handleDuplicate = () => {
    duplicateProfile(selected.id);
    setOpen(true);
  };

  const handleDelete = () => {
    if (selected.isProtected) return;
    deleteProfile(selected.id);
    setOpen(false);
  };

  const handleResetAll = () => {
    resetAll();
    setOpen(false);
  };

  const padding = compact ? "p-2.5" : "p-3";

  return (
    <section
      aria-label="Voice profile"
      className={`relative overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm ${padding}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <UserIcon className="h-3 w-3" />
            Voice profile
            <BadgeChip
              kind={isDefaultProfile ? (isEditedFromDefault ? "edited" : "default") : "custom"}
            />
            <ExampleCountChip count={exampleSummary.exampleCount} />
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
            {summary}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Used to shape this draft. Strategy is still lead-driven.{" "}
            <span className="text-slate-500">{exampleSummary.styleHint}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {open ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              aria-expanded={open}
            >
              <PencilIcon className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
      </header>

      <ProfileChips
        profiles={state.profiles}
        selectedId={selected.id}
        onSelect={(id) => {
          // Selecting a different chip cancels any in-progress edits.
          if (id !== selected.id && open) setOpen(false);
          selectProfile(id);
        }}
      />

      {open ? (
        <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
          <Field
            label="Profile name"
            value={draft.name}
            placeholder={selected.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
          />
          <Field
            label="Description"
            value={draft.description ?? ""}
            placeholder={selected.description ?? ""}
            onChange={(v) => setDraft({ ...draft, description: v })}
            hint="One line describing when to use this voice."
          />
          <Field
            label="Sender name"
            value={draft.senderName}
            placeholder={selected.senderName}
            onChange={(v) => setDraft({ ...draft, senderName: v })}
          />
          <Field
            label="Company"
            value={draft.companyName}
            placeholder={selected.companyName}
            onChange={(v) => setDraft({ ...draft, companyName: v })}
          />
          <Field
            label="Value proposition"
            value={draft.valueProposition}
            placeholder={selected.valueProposition}
            hint='Naturally completes "We ___" in the draft body.'
            onChange={(v) => setDraft({ ...draft, valueProposition: v })}
            multiline
          />
          <Field
            label="Target audience (optional)"
            value={draft.targetAudience ?? ""}
            placeholder={selected.targetAudience ?? "e.g. recently funded teams"}
            onChange={(v) => setDraft({ ...draft, targetAudience: v })}
          />

          <ToneSelector
            value={draft.preferredTone ?? "Warm"}
            onChange={(t) => setDraft({ ...draft, preferredTone: t })}
          />

          <Field
            label="First-touch CTA (optional)"
            value={draft.defaultCTA ?? ""}
            placeholder={selected.defaultCTA ?? ""}
            hint="Used when the lead has not been engaged yet. Stage-based CTAs take over for qualified / contacted / dormant leads."
            onChange={(v) => setDraft({ ...draft, defaultCTA: v })}
          />

          <Field
            label="Signoff"
            value={draft.signoff ?? ""}
            placeholder={selected.signoff ?? "Best"}
            onChange={(v) => setDraft({ ...draft, signoff: v })}
          />

          <Field
            label="Voice notes (optional)"
            value={draft.voiceNotes ?? ""}
            placeholder={selected.voiceNotes ?? "Short notes on how this voice should sound."}
            hint="Reserved for future LLM prompt context. Doesn't affect today's draft text."
            onChange={(v) => setDraft({ ...draft, voiceNotes: v })}
            multiline
          />

          <VoiceExamplesSection profile={selected} library={library} />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleDuplicate}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                title="Save a copy of this profile as a custom voice"
              >
                Duplicate
              </button>
              {isDefaultProfile ? (
                <button
                  type="button"
                  onClick={handleResetProfile}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  title="Restore this default profile's original values"
                  disabled={!isEditedFromDefault}
                >
                  Reset profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                  title="Delete this custom profile"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
                title="Restore the full default library"
              >
                Reset library
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty}
                className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                  dirty
                    ? "border-indigo-300/80 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                Update profile
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------
// Internals
// --------------------------------------------------------------------

function composeSummary(profile: VoiceProfile): string {
  const tone = profile.preferredTone ?? "Warm";
  const vp = truncate(profile.valueProposition, 70);
  return `${profile.name} · ${tone} · "We ${vp}"`;
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

function sameProfile(a: VoiceProfile, b: VoiceProfile): boolean {
  return (
    a.name === b.name &&
    (a.description ?? "") === (b.description ?? "") &&
    a.senderName === b.senderName &&
    a.companyName === b.companyName &&
    a.valueProposition === b.valueProposition &&
    (a.targetAudience ?? "") === (b.targetAudience ?? "") &&
    (a.preferredTone ?? "Warm") === (b.preferredTone ?? "Warm") &&
    (a.defaultCTA ?? "") === (b.defaultCTA ?? "") &&
    (a.signoff ?? "Best") === (b.signoff ?? "Best") &&
    (a.voiceNotes ?? "") === (b.voiceNotes ?? "")
  );
}

function ProfileChips({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: VoiceProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Voice profiles">
      {profiles.map((p) => {
        const isActive = p.id === selectedId;
        const isDefault = DEFAULT_VOICE_PROFILES.some((d) => d.id === p.id);
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(p.id)}
            title={p.description ?? p.name}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
              isActive
                ? "bg-slate-900 text-white ring-1 ring-slate-800"
                : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50"
            }`}
          >
            {!isDefault ? (
              <span
                aria-hidden
                className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-amber-500"}`}
                title="Custom profile"
              />
            ) : null}
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

function ExampleCountChip({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span
        className="rounded-sm bg-slate-100 px-1 py-px text-[9px] font-semibold text-slate-500 ring-1 ring-slate-200/80"
        title="No voice examples saved for this profile yet."
      >
        0 examples
      </span>
    );
  }
  return (
    <span
      className="rounded-sm bg-indigo-50 px-1 py-px text-[9px] font-semibold text-indigo-700 ring-1 ring-indigo-200/80"
      title="Used as future AI voice context — not copied into today's draft."
    >
      {count} {count === 1 ? "example" : "examples"}
    </span>
  );
}

function BadgeChip({ kind }: { kind: "default" | "edited" | "custom" }) {
  if (kind === "default") {
    return (
      <span className="rounded-sm bg-slate-100 px-1 py-px text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
        Default
      </span>
    );
  }
  if (kind === "edited") {
    return (
      <span className="rounded-sm bg-amber-50 px-1 py-px text-[9px] font-semibold text-amber-700 ring-1 ring-amber-200/80">
        Edited
      </span>
    );
  }
  return (
    <span className="rounded-sm bg-emerald-50 px-1 py-px text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
      Custom
    </span>
  );
}

function Field({
  label,
  value,
  placeholder,
  hint,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const inputCls =
    "w-full rounded-md border border-slate-200/80 bg-white px-2 py-1.5 text-[12px] text-slate-800 placeholder:text-slate-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/30";

  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`${inputCls} mt-1 resize-none leading-snug`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} mt-1`}
        />
      )}
      {hint ? (
        <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function ToneSelector({
  value,
  onChange,
}: {
  value: OutreachTone;
  onChange: (next: OutreachTone) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Preferred tone
      </p>
      <div
        className="mt-1 flex flex-wrap gap-1"
        role="radiogroup"
        aria-label="Preferred tone"
      >
        {TONE_OPTIONS.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              title={opt.hint}
              className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                active
                  ? "bg-slate-900 text-white ring-1 ring-slate-800"
                  : "bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
        Qualified leads stay on a direct tone regardless of this setting.
      </p>
    </div>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  );
}
