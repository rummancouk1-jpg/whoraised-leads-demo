# GG Outreach — design elevation report

8 October 2026. Branch `design/elevation`; rollback points: tag `pre-design-elevation` (the client-ready state) and `design-elevation-r1` (this work). Direction and component decisions: [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md). Lessons are appended to [LESSONS.md](LESSONS.md).

## What the product does now

* **Home leads with one sentence**, built only from data: `52 creators & communities queued · 8 inboxes warming · sending starts once the signup link is live`. With a valid Instantly schedule it reads `sending starts Oct 19`; paused, completed and sending states have their own clause; if Instantly can't be read it says so. Then the four numbers, then the pipeline stage bar, then the lead list.
* **⌘K / Ctrl K palette** (pages, every lead, commands) with a phone equivalent (the Search tab / button). `g h`, `g p`, `g e`, `/`, `?`, `j`/`k`, `⌘Z`.
* **Saved views** (built-in and your own), active-filter chips, per-viewer in this browser.
* **Optimistic stage changes with Undo toasts** (board drag, per-card stage menu, drawer, `⌘Z`).
* **Skeletons** shaped like the loaded content; **relative times** with the exact time on hover or long-press.
* **System light/dark** with an explicit override; fluid type scale; 150–250 ms spring motion that switches off under reduced motion; ≥ 44 px targets on touch and up to 900 px.
* **Installable PWA** (icons incl. maskable, iOS standalone tags and light/dark launch images). The service worker caches static assets only, never a page or an API response; logout clears everything.

## Evidence

| Gate | Result | Evidence |
|---|---|---|
| Viewport parity: 6 browser/device configs × normal/reduced motion × light/dark | **24 runs, 768 state captures, 236 feature checks, 0 axe violations, 0 failures** | [VIEWPORTS.md](../evidence/design-elevation/VIEWPORTS.md) · [matrix](../evidence/design-elevation/matrix/) |
| Contrast of every token pair (WCAG 2.2 AA) | 70 pairs, 0 failures | [contrast.json](../evidence/design-elevation/contrast.json) |
| PWA: manifest, icons, iOS tags, worker scope, no private caching, offline page, logout wipe | 22 checks, 0 failed | [pwa.json](../evidence/design-elevation/pwa.json) |
| Original ten audit scripts, re-run on this build | all pass; shared records identical after the run | [regression](../evidence/design-elevation/regression/) |
| Lighthouse (below) | all ≥ targets | [lighthouse](../evidence/design-elevation/lighthouse/) |
| Vercel preview, HTTP level, signed out | 20 checks pass | [preview-check.json](../evidence/design-elevation/preview-check.json) |
| Before / after | one sheet per view, 3 viewports × (before, after dark, after light) | [contact-sheets](../evidence/design-elevation/contact-sheets/index.md) |

### Lighthouse (mobile / desktop, performance · accessibility · best practices)

| Page | Previous round | Now |
|---|---|---|
| Home | 94 · 100 · 100 / 100 · 100 · 100 | 94 · 100 · 100 / 100 · 100 · 100 |
| Pipeline | 91 · 100 · 100 / 100 · 100 · 100 | 95 · 100 · 100 / 99 · 100 · 100 |
| Email | 98 · 100 · 100 / 99 · 100 · 100 | 96 · 100 · 100 / 100 · 100 · 100 |

CLS is 0 on five of six runs (0.081 on mobile pipeline). The first build scored 72 on mobile home (CLS 0.245, LCP 3.6 s) until the status sentence was server-rendered.

### What the matrix covers

Login, home, long tail, filters, save-view form, saved view, drawer, draft, export, import, import preview, analytics, no-match, palette, palette results, shortcuts, pipeline, scrolled board, board drawer, toast with Undo, Email, relative-time tooltip, 404, and loading / empty / error for home, pipeline and Email. Feature checks per run are listed in VIEWPORTS.md.

## Bugs found by the new gates and fixed

* An optimistic-update race: a background poll that began before a save landed could overwrite the screen with the old value, silently reverting the change. Present before this work; fixed by invalidating in-flight reads when a save completes.
* The board skeleton used the card's class, so a "wait for a card" script would pass on a loading state.
* The login page re-registered the service worker right after logout.
* Invalid ARIA on `<time>`, a second banner landmark, content outside landmarks, a 32 px brand link, the word "unavailable" in new copy.

## Limits, stated plainly

* **The preview is behind Vercel SSO and I did not sign in to it.** It was verified signed out (headers, access control, assets, manifest, worker). Signed-in behaviour, including the real Instantly figures in the status sentence, was verified locally on the same commit; please open the preview and confirm it shows live data before approving. Production has not been touched.
* **Local Instantly data comes from the previous round's saved raw capture** (the local environment has no usable key); the app's mapping code runs unchanged. The 29-figure comparison against live Instantly from the last round was not repeated.
* **WebKit is Playwright's engine on Windows, not a physical iPhone or iPad.** Install-to-home-screen, launch images and the status bar were checked at tag/file level, not on a device. Live offline emulation crashes that WebKit build, so offline fallback is exercised in Chromium and precache is asserted in WebKit.
* The stage-move and undo checks ran with saved writes mocked so the shared database was not modified. The only real writes were the audit's own flows script (identical-CSV replace and a reversible stage edit); the 52 records were byte-identical afterwards.
* `tests/outreach.spec.ts` already failed before this work: it reads `public/gg-outreach-examples.csv`, which the client-readiness round moved out of `public/`. Left alone.
* Source check 4a is unchanged: five Reddit endpoints still return 403 (internal only).
