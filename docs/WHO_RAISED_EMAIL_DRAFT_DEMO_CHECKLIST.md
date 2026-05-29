# AI Outreach Draft — Demo Checklist

Practical checklist for showing the AI Outreach Draft Assistant to a client.
Use this side-by-side with the laptop. Targeted at a 30-second core demo with
optional 2-3 minute deep dive.

## A. Pre-demo commands

Run these in order before the client sees the screen:

```bash
git status                  # confirm clean working tree (or expected diff)
npm run lint                # must finish with no errors
npm run build               # must finish with all routes generated
npm run dev                 # start the dev server on localhost:3000
```

Open the browser to `http://localhost:3000`. Both `/` and `/pipeline` should
load without console errors.

## B. 30-second demo flow

1. **Open `/`** — point at the lead table. "These are recently funded teams
   we've already enriched with funding, score, signals, and contact intel."
2. **Click the bookmark icon on `NexaFlow AI`** — the small bottom toast
   appears: *"Lead saved — email draft ready"*.
3. **Click "Open draft"** in the toast — the dedicated **Outreach Draft
   Studio** opens, with company / founder header and a spacious workspace.
   "The lead details drawer keeps the intel. The draft has its own
   studio."
4. **Read the panel header** to the client:
   > *"Strategy · Funding Trigger · Voice · Funded Outbound · 11 lead signals
   > · quality checked before copy."*
5. **Point at the Why-this-draft card** — "The system reviewed the lead and
   chose this strategy because the team just closed $18.5M. Readiness is
   High. Personalization is Strong. Quality check passed."
6. **Click "Direct Sales" in the Try-another-voice row** — the body
   visibly changes. "The strategy stayed the same, the voice didn't.
   Strategy is lead-driven. Voice is sender-driven."
7. **Click "Copy full email"** — the button confirms with a green
   *"Copied full email"* pip. "This is what the user pastes into Gmail
   or their sequencing tool."
8. **Press Escape (or click Done)** — studio closes, returns to the
   dashboard. The drawer's compact AI Outreach Draft card still shows
   strategy, voice, and quality at a glance.

That is the demo. Total time: under a minute.

### Alternate entry — dashboard icon-to-pill chip (recommended for client demos)

1. Hover any row in the lead table.
2. The small ✨ **Draft icon** in the actions column smoothly expands
   into a labeled pill — `Draft` for saved leads, `Save & draft` for
   unsaved leads. Mail, Phone, Save, and View details stay in place
   and remain clickable while the chip is expanded.
3. Click the chip → the Outreach Draft Studio opens directly.

This is the fastest path. For saved leads it's one click from the
list to the studio. For unsaved leads it saves AND opens in the same
click — no intermediate toast.

Keyboard equivalent: Tab to the row, the chip expands via
`focus-within`, press Enter or Space.

Mobile/touch: the chip stays in its icon-only resting form (no hover
on touch) but is fully tappable — tap the icon to route into the
studio. The lead drawer's compact summary card remains the alternate
touch path.

### Alternate entry — drawer summary card

If you'd rather start from the lead details drawer:

1. Save NexaFlow AI in the table.
2. Click the row to open the **lead details drawer**.
3. Scroll to the small **AI outreach draft** card: it shows strategy,
   voice, and quality in three pills.
4. Click **Open email draft** — the studio opens.

### Alternate entry — pipeline draft chip

In `/pipeline`:

1. Saved cards carry a small **Draft** chip.
2. Click the chip directly — the studio opens for that lead **without**
   opening the workspace drawer. Drag-and-drop is unaffected; the chip
   is a button with `pointerdown` stopped at the boundary.

## C. Optional deep dive (2–3 minutes)

If the client wants to see more:

- **Open `HelixBio`** (Contacted) — show that the subject becomes
  *"Following up on HelixBio"* and the opener references the recent
  raise, not a cold "I came across".
- **Open `ShieldStack`** (Qualified) — show the greeting drop the "Hi"
  (`David,`) and the CTA become *"Could we lock in 20 minutes this week…"*.
- **Open `DataWeave`** (Archived) — subject becomes *"Reopening the thread
  on DataWeave"* and the CTA is the soft *"Open to a low-pressure reintro
  call…"*. Switching to **Direct Sales** does NOT turn this into a cold
  pitch — voice never overrides stage safety.
- **Open the Voice profile card → Edit** — show the sender name, company,
  value proposition, tone, signoff, voice notes, and the **Voice
  examples** section. Mention: *"Each profile has a few sample emails
  saved as future AI voice context — examples are not copied into
  today's draft."*
- **Hover an unsaved row** — chip says **Save & draft**. Click → row
  gets saved AND studio opens in one click (no separate toast).
- **Open `/pipeline`** — point at the **Draft** chip on saved cards.
  Click the chip → studio opens directly. Click the card body → workspace
  drawer opens with the compact draft summary card and an **Open email
  draft** button that opens the same studio. Both routes use the same
  selected voice profile.
- **Quality CTA fix** — open NexaFlow AI and read the body's question
  *"Would it be worth a quick conversation next week?"*. The Quality
  chip stays **High**. Previously the checker only scanned the last
  three lines (which got eaten by the multi-line signoff) and falsely
  reported *"No clear call to action."*. Fixed by stripping the signoff
  block and scanning the body for any CTA question.

## D. Test lead matrix

| Lead | Status | Expected strategy | Expected voice recommendation | Expected quality |
| --- | --- | --- | --- | --- |
| NexaFlow AI | New | Funding Trigger | Funded Outbound, Founder-to-Founder, Direct Sales | High |
| GreenGrid Energy | Qualified | Qualified Next Step | Direct Sales, Consultative Advisor | Good or High |
| VaultPay | New | Funding Trigger | Funded Outbound, Founder-to-Founder, Direct Sales | High |
| HelixBio | Contacted | Re-Engagement | Re-Engagement, Consultative Advisor, Founder-to-Founder | Good |
| ShieldStack | Qualified | Qualified Next Step | Direct Sales, Consultative Advisor | Good |
| FarmRoot | New | Funding Trigger / Problem-Aware | Funded Outbound, Consultative Advisor | Good |
| DataWeave | Archived | Re-Engagement (dormant) | Re-Engagement, Consultative Advisor | Good |
| AeroSense | New | Funding Trigger | Funded Outbound, Founder-to-Founder | High |
| LegalMind | Contacted | Re-Engagement | Re-Engagement, Consultative Advisor | Good |
| SpaceDock | Qualified | Qualified Next Step | Direct Sales, Consultative Advisor | High |

If any row diverges from this table when you click through, that's a
regression signal worth investigating before the demo.

## E. Talking script — short version

Use this verbatim if the client asks "what does this feature do":

> "This feature takes the lead intelligence we already collect on every
> startup — the funding round, stage, signals, and contact data — and
> turns it into a ready-to-refine outreach draft. The strategy is selected
> from the lead's own data. The voice profile controls how the message
> sounds — funded outbound, direct sales, founder-to-founder, and so on.
> Every draft runs through a quality check before the user copies it.
> Today the engine is deterministic and fast; the same architecture is
> ready to plug into a live AI model when we decide to wire one in."

Total: about 25 seconds spoken.

## F. What NOT to claim

If the client asks technical questions, do **not** say any of the
following — none of these are true today:

- "It's connected to a live AI model."
- "Claude / GPT generated this draft."
- "The model was trained / fine-tuned on our voice."
- "Emails are sent automatically."
- "The system learns from every send."
- "We have a backend that stores user data."

Safe substitutes:

- "Deterministic draft engine, AI-ready architecture."
- "The voice profile is the prompt context bundle the future model will
  use — same data, swap the composer."
- "Currently no live AI call. The feature is ready to plug one in."
- "User copies and sends from their own email tool."
- "Profile and library data lives in the user's browser via localStorage
  — no backend."

## G. Known limitations (mention if the client asks)

- **Persistence is browser-only** — clearing site data wipes the profile
  library and any saved examples. A backend is the obvious next step.
- **The composer is deterministic** — same lead + same voice always
  yields the same draft. Intentional for demo stability; replace with
  an LLM call when the API is wired up.
- **Voice examples are not yet active in composition** — they are saved
  with each profile as future AI prompt context, but the deterministic
  composer ignores them. The bank, the prompt-context helpers, and the
  UI are all in place; the LLM call is the missing piece.
- **No email sending** — the feature stops at "copy to clipboard". The
  user pastes into their preferred sending tool.
- **Migration handled** — users on the v0 single-sender-profile storage
  are auto-migrated into a `Custom (Migrated)` voice profile on first
  load. Verify with a fresh browser if needed.
- **2 moderate `npm audit` findings** remain untouched per project
  policy — re-evaluate before production.

## H. Final pre-demo glance

Five-second sanity check immediately before the client sees the screen:

- [ ] `npm run dev` is running and `localhost:3000` loads.
- [ ] Browser console is open and clean (no red errors).
- [ ] At least 3 leads visible in the table (NexaFlow AI, HelixBio,
      ShieldStack).
- [ ] DevTools localStorage shows `whoraised.voiceProfiles.v1` (clear
      if you want to demo the migration path or a fresh state).
- [ ] You have the talking script open in a second tab if needed.

Good demo.
