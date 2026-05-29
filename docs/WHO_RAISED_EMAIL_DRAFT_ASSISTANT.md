# AI Outreach Draft Assistant

Turns a saved lead into a tailored outreach email the user can refine, copy,
and send. Architected as a deterministic **Outreach Intelligence Engine** with
a separate **safety / quality checker** and a **sender voice profile** — so
the system feels powerful today and can swap in a live LLM later by replacing
just the composition step.

## Four-layer architecture

```
Lead data
   ↓
1. Outreach Intelligence Engine     (deterministic, runOutreachIntelligence)
       ├─ lead fit score
       ├─ outreach readiness
       ├─ recommended strategy + alternatives
       ├─ recommended tone + email structure
       ├─ primary + supporting reasons
       ├─ lead risks
       ├─ missing data warnings
       ├─ doNotMention safety contract
       └─ personalization points
   ↓
2. Sender / client voice profile     (browser-persisted)
       ├─ sender name, company, value proposition
       ├─ preferred tone
       ├─ first-touch CTA, signoff
   ↓
3. Email draft generator             (deterministic composition)
       ├─ strategy-driven subject + opener + bridge + CTA
       ├─ tone-driven phrasing
       ├─ deterministic variant selection per lead+strategy
       └─ honors the doNotMention contract
   ↓
4. Draft quality checker             (post-composition gate)
       ├─ noInventedFacts
       ├─ hasPersonalization
       ├─ hasClearCTA
       ├─ notTooLong
       ├─ noSpammyPhrases
       ├─ noUnsupportedClaims
       └─ status: High / Good / Needs Review
   ↓
EmailDraft (subject, body, strategy, tone, cta, intelligence, quality)
```

Every layer is deterministic today. The seam where a live LLM plugs in later
is **layer 3 only** — see *Future API integration point* below.

## Files

### New
- `src/lib/outreach/outreach-intelligence-engine.ts` — the engine (layer 1).
- `src/lib/outreach/draft-quality-checker.ts` — the safety/quality gate (layer 4).
- `src/lib/outreach/email-draft-generator.ts` — strategy-aware composer (layer 3).
- `src/lib/outreach/sender-profile.ts` — voice profile library + SSR-safe
  `useVoiceProfileLibrary` hook backed by `localStorage` (layer 2). Owns the
  `VoiceProfile` and `VoiceExample` types.
- `src/lib/outreach/voice-profile-context.ts` — `buildVoiceProfilePromptContext`
  + `buildVoiceExampleMessages` helpers used by the future-AI prompt seam.
- `src/lib/outreach/voice-profile-recommendations.ts` — strategy → recommended
  voice profile mapping powering the "Try another voice" row in the panel.
- `src/components/outreach/LeadEmailDraftPanel.tsx` — premium UI: header with
  Quality + Urgency chips, voice profile library, "Why this draft" card with
  collapsible risks and signals, strategy selector with recommendation dot,
  copy controls, missing-data warnings.
- `src/components/outreach/VoiceProfileLibrary.tsx` — voice profile chips,
  editor, example count chip.
- `src/components/outreach/VoiceExamplesSection.tsx` — collapsible Voice
  Examples section embedded inside the editor.
- `src/components/outreach/DraftEmptyState.tsx` — shared empty state.
- `src/components/outreach/SavedDraftToast.tsx` — save-confirmation toast.
- `src/components/outreach/LeadEmailDraftDialog.tsx` — dedicated **Outreach
  Draft Studio** modal that hosts the full draft workspace in a wider,
  premium layout outside the cramped lead details drawer.
- `src/components/outreach/LeadEmailDraftSummaryCard.tsx` — compact summary
  card shown inside the drawer with strategy / voice / quality status and
  the **Open email draft** primary action.
- `src/components/lead-workspace/LeadEmailDraftSection.tsx` — wrapper for the
  pipeline workspace drawer.
- `src/components/pipeline/PipelineDraftDialogMount.tsx` — pipeline-side
  dialog mount that pulls state from `PipelineCrmContext`.
- `src/lib/outreach/lead-outreach-analyzer.ts` — thin compatibility shim that
  re-exports from the engine.

### Modified
- `src/components/LeadDashboard.tsx` — save → toast → opens the Outreach
  Draft Studio dialog. Also mounts the dialog at dashboard level and
  owns `handleSaveAndOpenDraft` for the table's hover chip.
- `src/components/LeadTable.tsx` — adds a hover/focus-reveal **Draft**
  chip (saved leads) / **Save & draft** chip (unsaved leads) inside
  the sticky actions column.
- `src/components/LeadDetailDrawer.tsx` — drawer now renders the compact
  `LeadEmailDraftSummaryCard` instead of the full panel. Routes the
  "Open email draft" CTA into the dialog mounted by the dashboard.
- `src/components/lead-workspace/LeadWorkspaceDrawer.tsx` — adds the draft tab.
- `src/contexts/PipelineCrmContext.tsx` — owns `draftDialogLeadId` so the
  pipeline drawer summary card AND the saved-card Draft chip can both
  open the dedicated dialog.
- `src/components/pipeline/SortablePipelineCard.tsx` — passes `onOpenDraft`
  to the card so the Draft chip is now a clickable shortcut.
- `src/types/lead-drawer.ts` — registers the `email-draft` section.
- `src/components/pipeline/PipelineCard.tsx` — "Draft" chip on saved cards
  is now a button that opens the studio (drag/keyboard semantics preserved
  via `stopPropagation`).
- `src/components/pipeline/PipelineDndBoard.tsx` — mounts
  `PipelineDraftDialogMount` next to the workspace drawer.
- `src/lib/outreach/draft-quality-checker.ts` — fixed CTA detection so a
  CTA question is recognized **anywhere** in the body (signoff lines are
  stripped before scanning, and the CTA hint vocabulary now covers
  `quick conversation`, `compare notes`, `15/20 minutes`, `follow-up`,
  `working session`, `reintro`, etc.).
- `src/app/globals.css` — toast keyframe + Outreach Draft Studio dialog
  entrance animation.

## Layer 1 — Outreach Intelligence Engine

`runOutreachIntelligence(lead)` reviews every intelligence field on `Lead`:

| Output | Derived from |
| --- | --- |
| `leadFitScore` (0-100) | `leadScore` + recency bonus + contact-route bonus + status penalty + investor bonus + first-name bonus |
| `outreachReadiness` (High/Medium/Low) | `leadFitScore` buckets at 82 / 65 |
| `recommendedStrategy` | strategy ladder (see below) |
| `alternativeStrategies` | top 2 next-best strategies for this lead |
| `recommendedTone` | strategy + lead context (e.g. large round → Professional) |
| `emailStructure` | `openerType` / `valueBridgeType` / `ctaType` |
| `primaryReason` | one-sentence intel summary |
| `supportingReasons[]` | 2–4 short facts from the lead |
| `leadRisks[]` | e.g. archived stage, stale funding, low fit, no contact route |
| `missingDataWarnings[]` | first name, contact, description, investors |
| `doNotMention[]` | the safety contract the composer must honor |
| `personalizationPoints[]` | what the email is allowed to reference |
| `confidence` (High/Medium/Needs Review) | composite of data density |
| `personalizationStrength` (Strong/Moderate/Light) | personalization-points count |
| `urgency` (high/medium/low) | leadScore + recency |
| `stageContext` | derived from `status` |
| `contactRoute` | `email-and-phone` / `email` / `phone` / `none` |
| `hasFirstName` / `firstName` | strips titles, rejects single initials |

### Strategy selection ladder

```
status = Qualified                                  → qualified-next-step
status = Contacted or Nurturing                     → re-engagement
status = Archived                                   → re-engagement (dormant variant)
status = New + recent funding ≥ $1M                 → funding-trigger
status = New + ≥50 employees or hiring growth       → growth-signal
status = New + strong description + some signal     → problem-aware
status = New + has email + some signal              → warm-intro
otherwise                                           → low-data-safe
```

### Strategy → tone matrix

| Strategy | Tone |
| --- | --- |
| funding-trigger | Warm (Professional if round ≥ $25M) |
| growth-signal | Consultative |
| problem-aware | Consultative |
| re-engagement | Professional (Warm if dormant) |
| qualified-next-step | Direct |
| warm-intro | Warm |
| low-data-safe | Warm |

Sender profile `preferredTone` overrides these **except** for
`qualified-next-step`, which always stays `Direct` (it's a relationship
signal, not a stylistic preference).

## Layer 2 — Voice Profile Library

The user picks one of several **named voice profiles** ("Funded Outbound",
"Re-Engagement", "Founder-to-Founder", "Direct Sales", "Consultative
Advisor", plus any custom profiles they save). The selected profile is fed
to the generator as the `senderProfile` option — the generator's contract
is unchanged because `VoiceProfile extends SenderProfile`.

### Types

```ts
interface SenderProfile {
  senderName: string;
  companyName: string;
  valueProposition: string;   // completes "We ___"
  targetAudience?: string;
  preferredTone?: "Warm" | "Professional" | "Direct" | "Consultative";
  defaultCTA?: string;        // first-touch only
  signoff?: string;
}

interface VoiceProfile extends SenderProfile {
  id: string;
  name: string;
  description?: string;
  voiceNotes?: string;        // reserved for future LLM prompt context
  isProtected?: boolean;      // protects default profiles from deletion
}

interface VoiceProfileLibraryState {
  profiles: VoiceProfile[];
  selectedId: string;
}
```

### Default profiles

Five protected defaults ship with the build:

| ID | Name | Tone | Default CTA |
| --- | --- | --- | --- |
| `funded-outbound` | Funded Outbound | Warm | Would it be worth a quick conversation next week? |
| `re-engagement` | Re-Engagement | Warm | Open to a quick reintro call? |
| `founder-to-founder` | Founder-to-Founder | Consultative | Worth comparing notes for 15 minutes? |
| `direct-sales` | Direct Sales | Direct | Worth a 15-minute call this week? |
| `consultative-advisor` | Consultative Advisor | Consultative | Would it be useful to compare notes? |

Each carries its own value proposition (drops into the `"We ___"` bridge)
and `voiceNotes` reserved for future LLM prompt-context use.

### Storage keys

- `whoraised.voiceProfiles.v1` — the full library JSON.
- `whoraised.selectedVoiceProfile.v1` — the currently selected ID.
- `whoraised.senderProfile.v1` — **legacy** single-profile key. Migrated
  into a `Custom (Migrated)` non-protected profile on first hydration, then
  removed.

### Hook

`useVoiceProfileLibrary()` exposes:

```ts
{
  library: { profiles, selectedId },
  selected: VoiceProfile,            // currently active profile
  selectProfile(id),
  updateSelected(patch),             // edits the active profile
  updateProfile(id, patch),
  duplicateProfile(id) -> newId,     // creates non-protected copy, selects it
  deleteProfile(id),                 // protected profiles ignored
  resetProfile(id),                  // restores a single default to its original
  resetAll(),                        // restores the full default library
  isDefault(id),
}
```

Backed by `useSyncExternalStore` over a module-level store + `localStorage`.
SSR-safe (server snapshot returns defaults), survives hydration, syncs
across tabs via the `storage` event, degrades gracefully when storage is
unavailable.

### What a voice profile controls

| Profile field | Affects |
| --- | --- |
| `senderName` | Signoff line 2 |
| `companyName` | Signoff line 3 |
| `valueProposition` | Drop-in for the `"We ___"` bridge sentence |
| `preferredTone` | Greeting + bridge cadence (Qualified overrides to Direct) |
| `defaultCTA` | First-touch CTA (other stages keep stage-specific CTAs) |
| `signoff` | Closing word |
| `voiceNotes` | Not used today — reserved for future LLM prompt context |

### What a voice profile never controls

- The recommended strategy (engine decides).
- Stage-aware framing (Qualified, Contacted, Archived).
- The `doNotMention` safety contract.
- Whether to mention funding, investors, or specific facts.
- The Quality checker thresholds.
- Tone for `Qualified` leads (always Direct regardless of profile).

**Strategy is lead-driven. Voice is sender-driven.** The two never collapse
into each other — even on `Direct Sales` voice, an Archived lead still
uses the soft re-engagement framing, the dormant-stage CTA, and the
low-pressure opener.

## Example Email Bank

Each `VoiceProfile` carries an **example bank** — short emails written in
that profile's voice, used as style references. Five protected defaults
ship with one example each. Users can add, edit, delete, and reset
examples on any profile.

### Why it exists

The example bank is the deliberate stepping stone between today's
deterministic composer and a future live LLM:

- **Today** — examples are visible to the user as style references and
  give the panel an honest "voice training readiness" indicator. They
  do **not** influence the deterministic generator's output. No example
  sentence is ever copied into a generated draft.
- **Tomorrow** — the same examples become the few-shot exemplars that
  ship in the LLM system prompt via
  `buildVoiceProfilePromptContext(profile)`. Schema unchanged.

### `VoiceExample` shape

```ts
interface VoiceExample {
  id: string;
  title: string;
  subject?: string;
  body: string;
  notes?: string;     // "What this example demonstrates"
  createdAt?: string;
}
```

Stored as `VoiceProfile.examples: VoiceExample[]` inside the existing
`whoraised.voiceProfiles.v1` localStorage payload — no new storage key.

### How they're stored

- All examples (default and custom) live in the library JSON alongside
  the profile that owns them.
- `loadLibrary()` normalizes the `examples` field — older library JSON
  without examples is treated as `examples: []`, so existing users
  upgrading to this version don't lose their profile setup.
- Legacy migration from the v0 `whoraised.senderProfile.v1` key initializes
  the migrated profile with an empty example bank.
- `duplicateProfile(id)` carries the source's examples across with **fresh
  example IDs** so the originals stay untouched.
- `resetExamples(id)` restores a single default profile's original example
  bank without touching the rest of the profile.
- `resetAll()` restores the full default library, examples included.

### How they affect the product today

- The voice profile card header shows a small **example count chip** next
  to the Default/Edited/Custom badge — "0 examples" / "1 example" /
  "3 examples".
- A short, honest style hint sits under the summary line, e.g. *"2 examples
  saved as future AI voice context."* — never *"trained"* or *"learning"*.
- The editor includes a collapsible **Voice examples** section with the
  example cards, an Add button, and a Reset button on protected defaults.
- The deterministic draft generator does **not** read the examples. The
  bridge sentence still uses `valueProposition`, the greeting still uses
  the resolved tone, and the CTA still follows stage/urgency. Examples
  are stored but invisible to the composer.

### How they support future API mode

`src/lib/outreach/voice-profile-context.ts` exports:

```ts
buildVoiceProfilePromptContext(profile: VoiceProfile): string
buildVoiceExampleMessages(profile: VoiceProfile): Array<{ role, name, content }>
```

The first serializes the whole profile (name, description, sender,
proposition, tone, CTA, signoff, voice notes, and every example) into a
single LLM-ready prompt block. The second returns one structured message
per example, useful for providers that prefer few-shot examples as
individual system messages.

When `email-draft-generator.ts` flips to `mode: "ai-ready"`, the prompt
construction becomes:

```
[system] OutreachIntelligence (strategy, doNotMention safety contract)
[system] buildVoiceProfilePromptContext(selectedVoice)   ← voice + examples
[user]   sanitized Lead facts
```

The deterministic engine still picks the strategy. The
`assessDraftQuality` checker still runs against the LLM output. The voice
profile + examples shape **how** the email reads, never **what** is
allowed to be in it.

### Safety rules

- Default examples never reference real customers, real investors,
  specific revenue figures, fake mutual connections, or fake case
  studies. They use bracketed placeholders (`[Company]`, `[Founder
  First Name]`, `[Round]`, `[focus area]`) so it's visually clear they
  are templates, not sent emails.
- The deterministic generator does not copy example sentences — there
  is no plagiarism path from the bank into the rendered draft today.
- When the future LLM mode is enabled, the prompt instructs the model
  to **mirror voice and pacing only**, never to copy verbatim, and the
  `assessDraftQuality` checker is the final safety gate regardless.

## Layer 3 — Email draft generator (composer)

Subject and body are composed from the engine's `recommendedStrategy` (or the
user override) plus the resolved tone, urgency, and stage. Each strategy has:

- **2–3 opener variants**
- **2–3 bridge variants** (varies by tone within the strategy)
- **2 CTA variants per stage** (first-touch CTAs additionally branch on
  urgency: high / medium / low)

### Deterministic variation

```ts
hash32(`${lead.id}:${strategy}:${key}`) % variantCount
```

Same lead + same strategy + same sender profile → same draft every time.
Different leads of the same strategy get different phrasing so a batch
doesn't read like one template.

### Bridge grammar

Every bridge composes around `"We {valueProposition}"`. The sender profile's
`valueProposition` is documented and edited as a verb-phrase that completes
"We ___", e.g. `"help growing teams turn new funding momentum into qualified
pipeline"`.

### Length

Drafts target **80–140 words**. The quality checker enforces this:
- `< 50` → flagged as too thin
- `> 170` → flagged as too long

### Examples (today is 2026-05-26, seed data)

**NexaFlow AI** (New, $18.5M Series A 24d ago, score 94) → `funding-trigger`,
Warm, high urgency:

> Subject: `Congrats on the Series A at NexaFlow AI`
> Body: `Hi Priya, / Saw the $18.5M Series A close at NexaFlow AI — congrats
> to the team. The work on enterprise workflow automation… caught my
> attention. / On our side, we help growing teams turn new funding momentum
> into qualified pipeline — and post-funding is usually the cleanest window
> to evaluate options without disrupting what's already working. / Could we
> grab 15 minutes in the next few days while the timing is right? / Best,…`

**HelixBio** (Contacted, $22M Series A 41d ago) → `re-engagement` (mid-pipe),
Professional:

> Subject: `Following up on HelixBio`
> Body: `Hi Elena, / Following up on HelixBio — congrats on closing the
> $22.0M Series A. That changes the context for what we last discussed… /
> On our end, we [valueProp] — worth comparing notes again now that the
> context around HelixBio has moved. / Worth a brief follow-up call to pick
> this back up?`

**ShieldStack** (Qualified, $38M Series B 97d ago) → `qualified-next-step`,
Direct:

> Subject: `Next step on ShieldStack`
> Greeting: `David,` (no "Hi")
> CTA: `Could we lock in 20 minutes this week to move the conversation
> forward?`

**DataWeave** (Archived, $75M Series C 110d ago) → `re-engagement` (dormant),
Warm:

> Subject: `Reopening the thread on DataWeave`
> Opener: `Reaching back out on DataWeave — the team's work on … is still on
> our radar, and the context around it has likely shifted.`
> CTA: `Open to a low-pressure reintro call in the next couple of weeks?`

**Low-data lead** (thin description, no first name) → `low-data-safe`, Warm:

> Greeting: `Hi there,` (fallback)
> Opener: `I've been looking at notable Fintech teams around …, and VaultPay
> came up.` (factual, no invented focus)
> Missing-data band shows: `Founder name not on file…`, `Company description
> is thin…`

## Outreach Draft Studio (dialog) + compact drawer summary

The full draft workspace lives in a dedicated **Outreach Draft Studio**
dialog. The lead details drawer (dashboard) and the pipeline workspace
drawer each render a **compact summary card** that surfaces the headline
state and routes the user into the studio for full editing.

### Why this split

The earlier version embedded the full `LeadEmailDraftPanel` directly in
the right-hand drawer. That drawer also carries lead intelligence,
overview, funding, investors, and contact details — adding the full
email workspace on top made the surface dense and hard to scan.

The split keeps each surface focused:

- **Drawer = lead intelligence**: who, what, why, contact, signals.
- **Studio dialog = email production**: subject, body, voice selector,
  strategy override, quality check, copy buttons.

### Compact summary card — `LeadEmailDraftSummaryCard`

Shown inside the lead details drawer (dashboard) and the pipeline
workspace drawer.

When the lead is saved it shows:

- `Strategy: {recommended strategy label}`
- `Voice: {selected voice profile name}`
- `Quality: High / Good / Needs Review` with a coloured dot
- One-line explainer: *"Lead intelligence selected the strategy. Voice
  profile shapes the tone."*
- Primary button: **Open email draft** (opens the studio)
- Secondary button: **Copy full email**

When the lead is unsaved it falls back to the existing shared
`DraftEmptyState` with the *Save & generate draft* call to action.

### Studio dialog — `LeadEmailDraftDialog`

The dialog is centered on desktop (max-width 1100px), full-screen on
mobile, scrolls internally, and traps focus / closes on Escape. It
mounts:

- Studio header with company, founder, and a *Outreach draft studio*
  eyebrow label.
- The full `LeadEmailDraftPanel` rendered with `variant="studio"` so
  the email body has a taller scroll window (`max-h-[460px]`) and the
  spacing loosens to match the available width.
- Footer with a "Done" button and the standard *Review before sending*
  reminder.

The dialog is **state-owned by the surface that mounts it**:

- Dashboard: `draftDialogLeadId` lives on `LeadDashboard`, the
  `LeadEmailDraftDialog` is rendered at dashboard level, and both the
  `SavedDraftToast` and the drawer summary card route into it.
- Pipeline: `draftDialogLeadId` lives on `PipelineCrmContext`, the
  `PipelineDraftDialogMount` is rendered alongside `LeadWorkspaceDrawer`,
  and both the drawer summary card AND the saved card's **Draft** chip
  open it. Drag-and-drop is preserved — the chip uses
  `onPointerDown=stopPropagation` so dnd-kit never sees the press.

### Dashboard hover-reveal draft action

The lead table surfaces a fourth entry point into the studio: a
premium **Draft** chip rendered as the middle item of a 3-way
`justify-between` actions row. The chip is **icon-only at rest**
(28×28, matching the surrounding icon buttons) and **expands inline**
into a labeled pill on row hover or keyboard `focus-within`, so no
existing action is ever covered:

- At rest the actions row reads as:
  `[Mail · Phone · Save]   ✨   [| View details]` — three clusters
  separated by small breathing gaps. The Draft icon sits centered
  between the data-action cluster and the navigation cluster.
- On row hover (or `group-focus-within`): the chip's `width`
  transitions from `28px` to `64px` (saved) or `100px` (unsaved) over
  200ms ease-out. Simultaneously the chip's inner `<span>` label
  reveals via `max-width` + `margin-left` transitions. The icon stays
  in place; the label slides in to the right of it.
- Because the chip is a single flex item with growth absorbed by the
  surrounding `justify-between` gaps, **no other action moves**.
  Mail, Phone, Save, and View details stay at their resting positions
  and remain clickable at all times — hover, focus-within, and after
  the chip expands.
- `ACTIONS_WIDTH` is `312px`, sized so the widest expanded chip
  ("Save & draft") fits without forcing the sticky column to grow.
  At rest the gaps on either side of the Draft icon are ~36px each;
  on hover they shrink to ~2px as the chip absorbs them. No table
  jump, no sticky-column width change.
- On touch devices (`@media (hover: none)`) the chip stays in its
  icon-only state — tapping the icon still routes the user into the
  studio (Save+open for unsaved leads, Open-only for saved). The
  drawer's `LeadEmailDraftSummaryCard` remains the alternate touch
  path.

The chip behaves differently based on save state:

- **Saved lead** → icon-only at rest with an indigo gradient pill
  background. On hover/focus expands to a `Draft` label. Click runs
  `onOpenDraftDialog(id)` → studio opens. No state mutation.
- **Unsaved lead** → icon-only at rest with a neutral white pill that
  warms to indigo on hover. Expands to `Save & draft`. Click runs
  `onSaveAndOpenDraft(id)` which flips `lead.saved = true` AND opens
  the studio in the same tick. The `SavedDraftToast` is suppressed in
  this path because the studio is already on screen.

The chip stops click propagation so it never accidentally triggers
row-level handlers. `motion-reduce:transition-none` honors the OS
reduced-motion preference. `aria-label` includes the company name on
every chip for screen-reader clarity, and `title` provides a
mouse-hover tooltip.

### Quality checker CTA detection fix

Previously the checker only looked at the **last 3 non-empty lines** of
the body when deciding `hasClearCTA`. Because the deterministic composer
emits a 3-line signoff (`Best, / Name / Company`), a legitimate CTA
question such as *"Would it be worth a quick conversation next week?"*
was getting pushed out of the window and the panel falsely reported
*"No clear call to action."*

The check now:

1. Strips trailing signoff lines (lines starting with `Best`, `Regards`,
   `Thanks`, `Cheers`, etc., plus the short name/company follow-ons).
2. Splits the remaining body into sentences.
3. Returns true if **any** sentence is both a question (`?`) and
   contains a CTA hint word.

The CTA vocabulary now includes: `call`, `meeting`, `chat`,
`conversation`, `compare notes`, `follow-up`, `15/20 minutes`,
`working session`, `reintro`, `huddle`, `coffee`, `demo`, `walk
through`, plus the original `step / sync / intro / connect / catch up`
set.

## Layer 4 — Draft quality checker

`assessDraftQuality(draft, lead, intel)` runs after composition and returns:

```ts
{
  qualityScore: number;        // 0-100 (passed checks / total)
  status: "High" | "Good" | "Needs Review";
  checks: {
    noInventedFacts: boolean;
    hasPersonalization: boolean;
    hasClearCTA: boolean;
    notTooLong: boolean;
    noSpammyPhrases: boolean;
    noUnsupportedClaims: boolean;
  };
  warnings: string[];
  revisionHints: string[];
}
```

Checks include scans for spammy phrasing (`guarantee`, `100%`, `act now`,
`game-changer`…), unsupported claims (`we helped X grow`, `customers like X`,
`as you know`, named investors that aren't on file), missing personalization
(company name absent), missing CTA (no `?` or no meeting/call word in the
last lines), and word-count bounds (50–170).

The panel header shows a `Quality: High / Good / Needs Review` chip. When the
status is `Needs Review`, a quality-warnings band appears under the body with
a specific revision hint.

## Sender profile × strategy interaction (full matrix)

| Field | Engine controls | Profile controls |
| --- | --- | --- |
| Strategy | ✅ | ❌ |
| Stage framing | ✅ | ❌ |
| `doNotMention` safety | ✅ | ❌ |
| Whether to mention funding / investors | ✅ | ❌ |
| Sender name + company | ❌ | ✅ |
| Value proposition wording | ❌ | ✅ |
| Tone (most cases) | (default) | ✅ overrides |
| Tone for Qualified leads | ✅ stays Direct | ❌ |
| CTA on first-touch leads | (default) | ✅ overrides |
| CTA on Qualified / Contacted / Archived | ✅ | ❌ |
| Signoff word | (`Best`) | ✅ overrides |

## Safety rules (always-on)

- No invented facts. Anything not on the `Lead` record never appears in copy.
- No named investors unless `lead.investors` lists them.
- No revenue, ARR, or named customers — ever.
- No "as you know" or fake prior-conversation language for `New` leads.
- No fake mutual connections.
- No urgency tactics (`act now`, `limited time`).
- No superlatives (`best in the world`, `revolutionary`, `game-changer`).
- Word count stays between 50 and 170.
- Every draft ends with a meeting/call question.

If any of these fail the checker flags `Needs Review` and surfaces a hint.

## Client-safe positioning

Phrases that are safe to use in product copy, sales calls, and customer
docs:

- **AI Outreach Draft Assistant**
- **Outreach Intelligence Engine**
- **Voice profiles** / **Voice profile library**
- **Example email bank**
- **Draft quality checker**
- **AI-ready architecture**
- **Deterministic draft engine**
- **Review before sending**
- **Strategy selected from lead intelligence**
- **Voice selected by user**
- **Quality checked before copy**

Phrases that must NOT be used today (none of these are accurate until a
live LLM is wired in):

- ~~Live AI agent~~
- ~~Trained model~~ / ~~Fine-tuned email agent~~
- ~~Claude-generated drafts~~ / ~~GPT-generated~~
- ~~Autonomous personalization / autonomous sending~~
- ~~Guaranteed reply improvement~~
- ~~Email open-rate uplift~~

If a client asks "is this AI?" — the honest answer is: *"Deterministic
draft intelligence today, AI-ready architecture. The voice profile and
example bank are exactly the prompt context the live model will
consume — we just haven't wired the call yet."*

A more detailed demo flow lives at
[docs/WHO_RAISED_EMAIL_DRAFT_DEMO_CHECKLIST.md](./WHO_RAISED_EMAIL_DRAFT_DEMO_CHECKLIST.md).

## Demo scenarios reference

Use this matrix to validate the system across representative lead types
before any client demo. Drift from this matrix is a regression signal.

| Lead | Status | Expected strategy | Expected voice recommendations | Expected quality |
| --- | --- | --- | --- | --- |
| NexaFlow AI | New, $18.5M Series A | Funding Trigger | Funded Outbound, Founder-to-Founder, Direct Sales | High |
| VaultPay | New, Seed | Funding Trigger | Funded Outbound, Founder-to-Founder, Direct Sales | High |
| HelixBio | Contacted | Re-Engagement | Re-Engagement, Consultative Advisor, Founder-to-Founder | Good |
| ShieldStack | Qualified | Qualified Next Step | Direct Sales, Consultative Advisor | Good |
| GreenGrid Energy | Qualified | Qualified Next Step | Direct Sales, Consultative Advisor | High |
| DataWeave | Archived | Re-Engagement (dormant) | Re-Engagement, Consultative Advisor | Good |
| OrbitEd | Contacted | Re-Engagement | Re-Engagement, Consultative Advisor, Founder-to-Founder | Good |
| AeroSense | New, Series A | Funding Trigger | Funded Outbound, Founder-to-Founder, Direct Sales | High |

## Future AI integration point

When a live model is wired in, this is the **single** seam:

```ts
// src/lib/outreach/email-draft-generator.ts → generateLeadEmailDraft

if (mode === "ai-ready") {
  // Replace composeBody/composeSubject with an async LLM call.
  // The LLM receives:
  //   - sanitized lead facts (Lead)
  //   - the full OutreachIntelligence (strategy, tone, structure,
  //     doNotMention — the safety contract)
  //   - the active SenderProfile (voice)
  // and returns { subject, body }.
}

// assessDraftQuality runs after the LLM exactly as it does today.
```

Nothing else moves:
- The engine (layer 1) stays deterministic and acts as the safety feature-gate
  in front of every LLM call.
- The sender profile (layer 2) becomes the "voice profile" the LLM prompt
  pulls in — no schema change needed.
- The quality checker (layer 4) stays as the post-composition gate, so the
  same safety rules apply whether composition is deterministic or AI.
- The UI (panel) stays unchanged.

## Testing checklist (manual)

For each lead category, save the lead and confirm the listed outputs.

### A. Recently funded high-score lead — **NexaFlow AI**
- [ ] Strategy chip: **Funding Trigger** (with recommendation dot)
- [ ] Readiness: **High**, Personalization: **Strong**, Tone: **Warm**
- [ ] Urgency chip: **High urgency**, Quality chip: **Quality: High**
- [ ] Subject mentions the round at the company
- [ ] Opener references `$18.5M Series A` and the team's work
- [ ] CTA: `Could we grab 15 minutes in the next few days…`

### B. Contacted lead — **HelixBio**
- [ ] Strategy: **Re-Engagement**
- [ ] Subject: `Following up on HelixBio`
- [ ] Opener references the recent raise as the reason for revisiting (not a
      cold "I came across…")
- [ ] CTA: `Worth a brief follow-up call to pick this back up?`

### C. Qualified lead — **ShieldStack**
- [ ] Strategy: **Qualified Next Step**
- [ ] Subject: `Next step on ShieldStack`
- [ ] Greeting: `David,` (Direct tone drops "Hi")
- [ ] CTA: `Could we lock in 20 minutes this week…`
- [ ] Profile tone change does **not** affect this lead's tone (stays Direct)

### D. Archived/dormant lead — **DataWeave**
- [ ] Strategy: **Re-Engagement** (recommended)
- [ ] Subject: `Reopening the thread on DataWeave`
- [ ] Opener does NOT assume a specific prior thread — uses `Reaching back
      out on …`
- [ ] CTA: `Open to a low-pressure reintro call…`
- [ ] Why-this-draft card shows at least one risk (archived status, stale
      funding)

### E. Low-data lead
- [ ] Pick a lead with a thin description in the seed data, or temporarily
      strip a description in `data/leads.ts` to test.
- [ ] Strategy: **Low Data Safe** or **Warm Intro**
- [ ] Personalization: **Light**, Quality may be **Good** or **Needs Review**
- [ ] Missing-data band appears
- [ ] Body has no fabricated focus or named investors

### F. Profile changes
- [ ] Edit sender profile (name, company, value prop, tone, signoff)
      → draft refreshes immediately
- [ ] Bridge contains the new `We {valueProposition}` text — no brackets
- [ ] Signoff line uses the profile name + company + signoff word
- [ ] Strategy and safety rules are **unchanged** after the edit
- [ ] Refresh browser → profile persists
- [ ] Reset demo profile → defaults return

### G. Pipeline
- [ ] `/pipeline` saved cards show the **Draft** chip
- [ ] Opening a saved card → workspace drawer shows the **Draft** tab with
      the same panel
- [ ] Strategy selector behaves identically to the dashboard drawer
- [ ] Unsaved card shows the shared `Save & generate draft` empty state

### H. Voice profile library
- [ ] Voice profile card shows the selected profile name + tone + "We …"
      summary, plus a chip for **each default profile**.
- [ ] Switching profile chips changes the draft body (bridge sentence,
      tone-driven phrasing, CTA on first-touch leads) **immediately**.
- [ ] On a **Contacted** lead, switching to Direct Sales does NOT turn the
      email into a cold pitch — it still reads as a follow-up.
- [ ] On an **Archived** lead, switching to Direct Sales keeps the
      soft-reintro framing and the dormant CTA.
- [ ] On a **Qualified** lead, switching profiles changes the bridge but
      tone stays Direct (greeting drops "Hi").
- [ ] Editing the selected profile and clicking **Update profile** updates
      the draft immediately. The chip shows an **Edited** badge if a
      protected profile was edited.
- [ ] **Reset profile** restores a single default profile to its original
      values.
- [ ] **Duplicate** creates a new non-protected `Custom` profile (visible
      with an amber dot on the chip), selects it, and opens the editor.
- [ ] **Delete** appears on custom profiles only and removes them.
- [ ] **Reset library** restores all defaults and clears custom profiles.
- [ ] Refresh the browser → selected profile + edits persist.
- [ ] Opening the same lead in `/pipeline` uses the same selected profile.
- [ ] Migration: with `whoraised.senderProfile.v1` pre-populated in
      localStorage (and the new keys absent), the library boots with a
      `Custom (Migrated)` profile selected, and the legacy key is removed.

### I. Example email bank
- [ ] Voice profile card header shows an **example count chip** (e.g.
      `1 example` on each default profile, `0 examples` after deleting).
- [ ] Honest style hint appears below the summary line, e.g. *"1 example
      saved as future AI voice context."* — no "trained" / "fine-tuned"
      language anywhere.
- [ ] Open the editor → **Voice examples (N)** section is visible and
      collapsed by default.
- [ ] Expand it → existing example renders as a card with title, subject,
      body preview, and notes.
- [ ] Click **Add example** → inline form appears. Save with valid title +
      body → new example appears and count chip increments.
- [ ] Click **Edit** on an example → inline editor with current values.
      Update + Save → card reflects the new values, count chip unchanged.
- [ ] Click **Delete** on an example → it disappears and count decrements.
- [ ] On a protected default profile, **Reset examples** restores the
      original example bank for that profile without touching the other
      profile fields.
- [ ] After editing a default profile's examples, the header chip flips
      from **Default** to **Edited** (because the example diff counts).
- [ ] **Duplicate** carries the source examples across to the new custom
      profile but with fresh example IDs (verify in the React tree or
      by deleting an example on one side and confirming the other side
      keeps it).
- [ ] **Reset library** wipes all custom examples and restores defaults
      everywhere.
- [ ] Refresh the browser → custom examples persist via the existing
      `whoraised.voiceProfiles.v1` payload — no new storage key.
- [ ] Open `/pipeline` and confirm the same selected profile's example
      count is visible.
- [ ] Generated draft **does not contain any verbatim sentence** from any
      example (defaults included). Skim the body against the example
      body to verify — they are independent.
- [ ] Strategy selector still picks the engine recommendation regardless
      of which voice profile + examples are active.

### Stability
- [ ] `npm run lint` ✅ clean
- [ ] `npm run build` ✅ clean

## Risks / limits

- The composer is deterministic — same lead + same profile + same strategy
  yields the same draft. Intentional for demo stability.
- The quality checker uses regex-based scans, not full NLP. It catches the
  obvious failure modes but a future LLM composer should still go through
  human review before send.
- Profile persists in `localStorage` only — clearing site data wipes it.
- 2 moderate npm audit findings left untouched per the standing instruction.

## Recommended next upgrade before adding a real API

Voice Profile Library + per-voice example bank are now in. The next
high-leverage step is wiring the actual LLM behind a server-only seam:

1. Add `DRAFT_AI_PROVIDER` and `DRAFT_AI_API_KEY` to the server
   environment (Anthropic Claude Sonnet or OpenAI 4o-mini are good
   starting points — pick by cost and latency target).
2. Create a Next.js Route Handler at `src/app/api/draft/route.ts` that
   accepts `{ leadId, strategy?, voiceProfileId }`, runs
   `runOutreachIntelligence(lead)` server-side, calls the model with
   `buildVoiceProfilePromptContext(profile)` as the system prompt,
   and returns `{ subject, body }`.
3. Add an `ai-ready` branch inside `generateLeadEmailDraft` that posts
   to that route instead of calling `composeSubject` / `composeBody`.
   Keep `assessDraftQuality` running over whichever output came back.
4. Add a panel toggle ("Use AI composer") so users can A/B the
   deterministic vs. AI output during rollout. The voice profile,
   examples, strategy selector, and quality chip already work
   identically for both modes — no UI work needed.

## Exact future API integration point

File: `src/lib/outreach/email-draft-generator.ts`
Function: `generateLeadEmailDraft`
Marker: comment block headed **`FUTURE AI INTEGRATION POINT`**

The branch point is the call to `composeBody` (and optionally
`composeSubject`). Replace with an async LLM call that takes the same
arguments — `strategy, tone, lead, intel, sender, cta` — and returns the
same `{ subject, body }` shape. Keep `assessDraftQuality(...)` running over
the LLM output. Toggle via `options.mode = "ai-ready"`.

Voice context for the prompt is already production-ready. Import:

```ts
import { buildVoiceProfilePromptContext } from "@/lib/outreach/voice-profile-context";

const systemPrompt = [
  // 1. Engine output (safety + strategy)
  `Strategy: ${intel.recommendedStrategy}`,
  `Tone: ${tone}`,
  `Do NOT mention: ${intel.doNotMention.join("; ")}`,
  // 2. Voice profile + few-shot examples
  buildVoiceProfilePromptContext(sender),
].join("\n\n");
```

The voice profile (sender name, company, value proposition, tone, CTA,
signoff, voice notes) AND every saved `VoiceExample` are serialized into
that single string — no second prompt-building pass needed at API time.
