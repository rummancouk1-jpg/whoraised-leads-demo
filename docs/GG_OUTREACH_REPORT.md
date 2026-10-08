# GG Outreach implementation and evidence

> Historical browser-local implementation report. The [deployment report](GG_OUTREACH_DEPLOYMENT_REPORT.md) supersedes its persistence and localhost verification claims. Current production uses private access and hosted Neon storage.

Verified October 6, 2026. Project: `D:/Official/Dev Websites/whoraised-leads-demo`.

## Original repository findings

The repository was inspected before conversion, including source, configuration, hooks, assets and old draft documentation. The source inventory, hashes, imports and exports are preserved in [repo-audit-before.json](../evidence/repo-audit-before.json). Historical paths below describe Git baseline `0b9c02227868165b5695b20c9d1b6c6886fd0073`; startup-specific files were removed during conversion.

| Question | Finding | Original evidence |
|---|---|---|
| Stack | Next.js 16.2.6 App Router; React/React DOM 19.2.4; TypeScript 5; Tailwind 4 with PostCSS; ESLint 9; dnd-kit. No database/backend routes. | `package.json`, layout, routes, PostCSS config |
| 20 sample leads | `RAW_LEADS` had 20 hardcoded startups; `INITIAL_LEADS` exported `RAW_LEADS.map(enrichLead)`. | `src/data/leads.ts:4`, its final export, `src/lib/lead-intelligence.ts` |
| Saves/stages | Did not survive reloads. Dashboard used `useState(INITIAL_LEADS)` and changed `saved`/`status` locally. Pipeline independently seeded its board and kept drag changes in React state. Views did not share edits. Voice profiles alone used localStorage (`whoraised.voiceProfiles.v1`, `whoraised.selectedVoiceProfile.v1`, migration from `whoraised.senderProfile.v1`). | `LeadDashboard.tsx:51`, `PipelineView.tsx`, `PipelineDndBoard.tsx`, `PipelineCrmContext.tsx`, `sender-profile.ts:256` |
| Draft generation | Deterministic local templates. `generateLeadEmailDraft` ran `runOutreachIntelligence`, chose strategy, resolved sender/tone/CTA, composed subject/body using stable lead-ID variants, then called `assessDraftQuality`. Voice examples were future AI context. No model API call. | `email-draft-generator.ts:103`, outreach engine, quality checker, sender profile, voice-context files |
| Fake signals | Preview/verified badges, “Updated just now”, generated SDR ownership/activity, invented verification and engagement insights. | `LiveProductMeta.tsx`, seeded activities in `pipeline-intelligence.ts`, `pipeline-workspace.ts`, old intelligence/workspace components |

Design references: [original Dashboard](../evidence/before-dashboard-1440.png), [original Pipeline](../evidence/before-pipeline-1440.png). Bundled Next.js guides on layouts/pages, server/client components, CSS and Playwright were read before implementation.

## Requirement results

| Item | Result | Evidence |
|---|---|---|
| GG Outreach and tournament | PASS. Both views display the requested identity, dates, free entry, daily picks, $1,000 longest-streak prize and U.S. 18+. | [Workspace](../src/components/outreach/Workspace.tsx), [navigation](../src/components/navigation/AppNav.tsx), [metadata](../src/app/layout.tsx) |
| Existing design and views | PASS. Dark shell, indigo/violet branding, view tabs, tinted summary cards, white Dashboard table, dark Pipeline cards and white right-side drawer retained. Search, filters, sorting and drag-to-stage adapted. | [Dashboard](../evidence/dashboard-1440-normal.png), [Pipeline](../evidence/pipeline-1440-normal.png), [drawer](../evidence/drawer-1440-normal.png), [CSS](../src/app/globals.css) |
| New model | PASS. Exactly the 13 requested fields, eight platforms, three kinds, five niches, three U.S.-focus values and five stages. Unique tracked slug; no extra CSV ID column. | [schema](../src/types/outreach.ts) |
| CSV import | PASS. File/paste inputs; exact ordered header; atomic validation; row errors; enums, numeric/date/contact/slug validation; preview. Add mode skips existing slugs to preserve edits; replace mode previews the replacement scope. | [dialogs](../src/components/outreach/DataDialogs.tsx), [parser](../src/lib/outreach.ts), invalid-import/merge/replace tests |
| Template and examples | PASS. Header-only blank template and separate three-row example CSV, with EXAMPLE in every name and note. Nothing loads automatically. Examples are excluded from analytics. | [blank template](../public/gg-outreach-template.csv), [3 EXAMPLE rows](../public/gg-outreach-examples.csv), contract test |
| CSV export | PASS. All current leads, including filtered-out rows and edits, with the same 13 columns. Quotes, commas and multiline notes round-trip. | [export dialog](../src/components/outreach/DataDialogs.tsx), [CSV helpers](../src/lib/outreach.ts), six browser export/download checks |
| Persistent edits | PASS. Stage, notes, signups and last touch save to `gg-outreach.leads.v1`; shared by views and same-origin tabs. Corrupt stored data is retained; blocked writes show an error without claiming a save. | [shared store](../src/contexts/OutreachContext.tsx), six reload checks, cross-tab/storage-error tests |
| Fit score/reasons | PASS. Config-based 0–100 score in table/cards, earned/max points for each reason in the drawer. Requested audience/niche/U.S./contact ordering verified. | [config](../src/config/fit-weights.json), [fitScore](../src/lib/outreach.ts), [drawer](../src/components/outreach/LeadDrawer.tsx), boundary/order tests |
| Exact pitch/copy | PASS. Only name and tracked slug substitute into the exact supplied pitch. No API. Clipboard matches the exact string. | [generator](../src/lib/outreach.ts), [draft panel](../src/components/outreach/LeadDrawer.tsx), exact-string and six clipboard tests |
| Compound loop | PASS. Recorded signups and Joined rates grouped by platform, niche and audience band, with denominators. Filters do not change the learning dataset. | [conversion tables](../src/components/outreach/ConversionLoop.tsx), group-result tests and Dashboard screenshots |
| Suggested weights/priorities | PASS. Base weights/factors read from JSON. Suggestions use recorded touched-lead signups. Opt-in applies suggested scores and ranks previous converting groups. No invented learning without outcomes. | [config](../src/config/fit-weights.json), [suggestedWeights/conversionPriority](../src/lib/outreach.ts), learning tests, [suggested mode](../evidence/dashboard-suggested-1440-normal.png) |
| Remove fake signals | PASS. Startup seed, invented intelligence/activity/ownership and old voice/draft paths removed. Empty states instruct users to import real leads. No live/verified/team claims remain in runtime source. | [empty Dashboard](../evidence/dashboard-empty-1440-normal.png), [empty Pipeline](../evidence/pipeline-empty-390-normal.png), source scan/browser assertions |
| Parity gate | PASS. Dashboard, Pipeline, drawer, import and export at 390/820/1440, normal and reduced motion. Supplementary empty/preview/draft/scrolled-board captures. 68 new captures; no final layout failures. | [screenshot matrix](../evidence/PARITY.md), [machine-readable parity](../evidence/parity-results.json), [gallery](../evidence/index.html) |

## Scoring and conversion computation

Defaults: audience 35, niche 30, U.S. focus 20, contact 15. Score is the rounded sum of factor × normalized weight, clamped to 0–100. Reasons show earned/max points.

Audience factors: under 5K = 0.35; 5K–100K inclusive = 1; over 100K = 0.6. Niche: earnings/options = 1, day trading = 0.75, swing = 0.65, general investing = 0.4. U.S. focus: yes = 1, mixed = 0.6, unknown = 0.2. Contact: email = 1, DM = 0.5, absent = 0.

Joined rate = Joined / all real leads in the group; signups sum the recorded field. EXAMPLE rows contribute to neither.

Learning treats any stage beyond New as touched. It requires at least three touched real leads and one signup. Group signup yield is smoothed with three prior leads at overall yield. For each scoring dimension, its best observed group yield relative to overall yield scales the configured weight, bounded to 0.5–2; weights normalize to exactly 100 with deterministic rounding. Changing outcomes changes suggestions, as verified by tests.

When **Use suggested priorities** is enabled, scores use suggested weights. Highest-priority sorting first ranks mean smoothed signup yield across the lead’s platform, niche and audience-band groups, then fit score. Unseen groups use overall yield. Config remains on disk; opt-in lasts for the navigation session. Suggestions are directional, based on recorded outcomes, not evidence of causation.

## Parity and validation

| View | 390 normal / reduced | 820 normal / reduced | 1440 normal / reduced |
|---|---|---|---|
| Dashboard | PASS / PASS | PASS / PASS | PASS / PASS |
| Pipeline | PASS / PASS | PASS / PASS | PASS / PASS |
| Drawer | PASS / PASS | PASS / PASS | PASS / PASS |
| Import/preview | PASS / PASS | PASS / PASS | PASS / PASS |
| Export | PASS / PASS | PASS / PASS | PASS / PASS |

Individual images are linked in the [full matrix](../evidence/PARITY.md). Five review contact sheets and individual desktop/mobile screens were visually inspected. Table overflow stays inside its scroll region; Pipeline scrolls sideways on mobile/tablet, and the final stage is reachable. Dialogs stay within the viewport with internal scrolling. No overlapping/clipped controls were found in final captures.

The gate checks page overflow, dialog bounds, form clipping, reduced-motion CSS and browser errors. Workflows test CSV import, filters/reset, suggested priorities, exact clipboard, reload persistence, exports preserving quotes/newlines, shared drawer state, horizontal board scrolling, keyboard/pointer moves, cancellation, cross-tab state, duplicate/replace behavior and corrupt/blocked storage.

Validation exposed a mobile reduced-motion keyboard-drag failure. The keyboard sensor now uses instant scrolling under reduced motion; the overlay uses a distinct registration and is inert/hidden from assistive technology. Final workflows pass in both modes. Earlier locator and animation-settling issues were corrected in the test harness; evidence is from the final run.

Commands: `npm run build` PASS; `npm run lint` PASS; TypeScript PASS (standalone check and production build); `npm test` 9 PASS, 0 skipped, 0 flaky. [Test results](../evidence/test-results.json). Reproduce screenshot indexing with `node tests/render-evidence.mjs` after tests. QA records are synthetic, imported only into isolated test contexts, never seeded in the app.

## Limits

Browser/origin-local storage only; export CSV for backups or another device. Operators record signups and last touch manually. There is no tracking backend or automated sending. Existing WhoRaised storage is not migrated into this unrelated model.

Verification used Chromium with pointer/keyboard at the requested widths. Physical devices and Safari/Firefox were not tested. Reduced-motion CSS and sensor/drop-animation behavior were checked separately.

`npm install` reported 15 findings (1 low, 1 moderate, 12 high, 1 critical) in the retained dependency tree. Dependency upgrades were outside this conversion; findings remain unresolved.
