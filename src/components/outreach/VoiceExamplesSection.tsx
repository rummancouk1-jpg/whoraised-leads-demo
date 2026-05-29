"use client";

import { useState } from "react";
import type {
  UseVoiceProfileLibraryResult,
  VoiceExample,
  VoiceProfile,
} from "@/lib/outreach/sender-profile";

interface VoiceExamplesSectionProps {
  profile: VoiceProfile;
  library: UseVoiceProfileLibraryResult;
}

/**
 * Compact, collapsible Voice Examples section for the editor.
 *
 * Today these examples are pure style references — they are stored
 * with the voice profile and shown to the user, but they do NOT
 * influence the deterministic draft generator. When a live LLM is
 * wired in, the same examples become few-shot prompt context via
 * `buildVoiceProfilePromptContext`.
 */
export function VoiceExamplesSection({
  profile,
  library,
}: VoiceExamplesSectionProps) {
  const { addExample, updateExample, deleteExample, resetExamples, isDefault } =
    library;
  const examples = profile.examples ?? [];
  const isProtectedDefault = isDefault(profile.id);

  const [open, setOpen] = useState(false);
  const [draftingNew, setDraftingNew] = useState(false);

  const handleAdd = (patch: Partial<VoiceExample>) => {
    // `ExampleEditor` enforces title + body before allowing save, so it's
    // safe to fall back here. Belt-and-braces in case the contract drifts.
    addExample(profile.id, {
      title: patch.title?.trim() || "Untitled example",
      subject: patch.subject?.trim() || undefined,
      body: patch.body ?? "",
      notes: patch.notes?.trim() || undefined,
    });
    setDraftingNew(false);
  };

  const handleReset = () => {
    resetExamples(profile.id);
  };

  return (
    <details
      className="rounded-md border border-slate-200/80 bg-slate-50/40"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          <BookIcon className="h-3 w-3 text-slate-500" />
          Voice examples
          <span className="rounded bg-white px-1 py-px text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
            {examples.length}
          </span>
          <Chevron open={open} />
        </span>
        {open && examples.length > 0 ? (
          <span className="text-[10px] text-slate-400">
            Style references · used to guide future AI composition
          </span>
        ) : null}
      </summary>

      <div className="space-y-2 border-t border-slate-200/80 px-2.5 py-2">
        {examples.length === 0 && !draftingNew ? (
          <p className="rounded-md bg-white px-2 py-2 text-[11px] leading-snug text-slate-500 ring-1 ring-slate-200/70">
            No examples saved yet. Add 1–3 short emails written in this voice to
            build AI-ready context for later.
          </p>
        ) : null}

        {examples.map((ex) => (
          <ExampleCard
            key={ex.id}
            example={ex}
            onSave={(patch) => updateExample(profile.id, ex.id, patch)}
            onDelete={() => deleteExample(profile.id, ex.id)}
          />
        ))}

        {draftingNew ? (
          <ExampleEditor
            mode="new"
            initial={EMPTY_EXAMPLE_DRAFT}
            onSave={(patch) => handleAdd(patch)}
            onCancel={() => setDraftingNew(false)}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setDraftingNew(true)}
            disabled={draftingNew}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
              draftingNew
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-indigo-300/80 bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            Add example
          </button>
          {isProtectedDefault ? (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              title="Restore this default profile's original example bank"
            >
              Reset examples
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

// --------------------------------------------------------------------
// Example card (collapsed preview + expand-to-edit)
// --------------------------------------------------------------------

function ExampleCard({
  example,
  onSave,
  onDelete,
}: {
  example: VoiceExample;
  onSave: (patch: Partial<VoiceExample>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ExampleEditor
        mode="edit"
        initial={example}
        onSave={(patch) => {
          onSave(patch);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-md bg-white px-2.5 py-2 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-slate-800">
            {example.title}
          </p>
          {example.subject ? (
            <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
              <span className="font-medium text-slate-600">Subject:</span>{" "}
              {example.subject}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
            aria-label={`Delete example: ${example.title}`}
          >
            Delete
          </button>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[11px] leading-snug text-slate-600">
        {example.body}
      </p>
      {example.notes ? (
        <p className="mt-1 text-[10px] italic leading-snug text-slate-400">
          {example.notes}
        </p>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------
// Example editor (used for both new + edit)
// --------------------------------------------------------------------

const EMPTY_EXAMPLE_DRAFT: VoiceExample = {
  id: "__new__",
  title: "",
  subject: "",
  body: "",
  notes: "",
};

function ExampleEditor({
  mode,
  initial,
  onSave,
  onCancel,
}: {
  mode: "new" | "edit";
  initial: VoiceExample;
  onSave: (patch: Partial<VoiceExample>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<VoiceExample>(initial);

  const dirty =
    mode === "new"
      ? draft.title.trim().length > 0 || draft.body.trim().length > 0
      : !sameExample(draft, initial);

  const canSave = draft.title.trim().length > 0 && draft.body.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: draft.title.trim(),
      subject: draft.subject?.trim() || undefined,
      body: draft.body,
      notes: draft.notes?.trim() || undefined,
    });
  };

  return (
    <div className="space-y-1.5 rounded-md bg-white p-2 ring-1 ring-slate-200/80">
      <ExampleField
        label="Title"
        value={draft.title}
        placeholder="e.g. Funding moment outreach"
        onChange={(v) => setDraft({ ...draft, title: v })}
      />
      <ExampleField
        label="Subject (optional)"
        value={draft.subject ?? ""}
        placeholder="Quick note on [Company]'s [Round]"
        onChange={(v) => setDraft({ ...draft, subject: v })}
      />
      <ExampleField
        label="Body"
        value={draft.body}
        placeholder={
          "Hi [Founder First Name],\n\n[Short email written in this voice — use brackets for variables.]"
        }
        onChange={(v) => setDraft({ ...draft, body: v })}
        multiline
        rows={5}
      />
      <ExampleField
        label="Notes (optional)"
        value={draft.notes ?? ""}
        placeholder="What this example demonstrates."
        onChange={(v) => setDraft({ ...draft, notes: v })}
      />

      <div className="flex items-center justify-end gap-1.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || !dirty}
          className={`rounded-md border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
            canSave && dirty
              ? "border-indigo-300/80 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          }`}
        >
          {mode === "new" ? "Save example" : "Update example"}
        </button>
      </div>
    </div>
  );
}

function ExampleField({
  label,
  value,
  placeholder,
  multiline = false,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  onChange: (v: string) => void;
}) {
  const inputCls =
    "w-full rounded-md border border-slate-200/80 bg-white px-2 py-1 text-[11.5px] text-slate-800 placeholder:text-slate-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/30";

  return (
    <label className="block">
      <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${inputCls} mt-0.5 resize-y font-sans leading-snug`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} mt-0.5`}
        />
      )}
    </label>
  );
}

function sameExample(a: VoiceExample, b: VoiceExample): boolean {
  return (
    a.title === b.title &&
    (a.subject ?? "") === (b.subject ?? "") &&
    a.body === b.body &&
    (a.notes ?? "") === (b.notes ?? "")
  );
}

// --------------------------------------------------------------------
// Icons
// --------------------------------------------------------------------

function BookIcon({ className = "" }: { className?: string }) {
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
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
