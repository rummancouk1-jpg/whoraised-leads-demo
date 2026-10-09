# GG Outreach R2 — it runs the outreach

8 October 2026. Branch `design/elevation` (preview only; production untouched, nothing promoted). Direction: [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) §R2. Operations/setup: [GG_OUTREACH_OPERATIONS.md](GG_OUTREACH_OPERATIONS.md) §Outreach layer. Lessons appended to [LESSONS.md](LESSONS.md). Evidence: `evidence/r2/` (git-ignored, on disk).

## What was added
1. **Instantly sync** — per-lead sent / opened / replied / clicked / bounced, stored in `gg_lead_stats` + `gg_lead_events`; drawer **Activity** timeline Sent → Opened → Replied → Clicked → Signed up. Runs on a scheduler call, when an open workspace sees data older than 15 min, or on *Sync now*; every attempt is logged.
2. **Needs action today** (Home, under the status sentence): replies awaiting an answer → bounces to fix → follow-ups due (5 days). One tap opens the lead. Server-rendered, so no layout shift.
3. **Attribution** — `POST /api/attribution/signup` (bearer, idempotent). Until a signup is reported or `PREREG_LIVE_AT` passes, the panel says "Attribution starts when the signup link is live"; no zeros.
4. **Freshness** — "Updated … ago" on every tile, a sync pill, and a `role=alert` banner (last good time, provider reason, Sync now) when a sync fails or is over 40 min old. The empty queue refuses to say "you're clear" while the sync is stale.
5. **Weekly digest** — in-app preview (Email → Weekly digest, with a link to the exact HTML). **Sending is OFF**; it needs `DIGEST_SEND_ENABLED=true` plus Resend settings, and sends only Monday 09:00–11:59 ET, once per 5 days.
6. **Error monitoring** — OHQ Watch contract (`/api/ohq/health`, `/api/ohq/watch`, counts-only, scrubbed). Server errors, failed syncs and browser errors are fingerprinted into `gg_errors`. Not yet connected to OHQ: add the registry entry (see the operations doc).
7. **`tests/outreach.spec.ts` fixed** (it now builds its example leads inline).

## Gates
| Gate | Result |
|---|---|
| Parity matrix: 390 (Chrome, iPhone WebKit) / 820 (iPad WebKit) / 1440 (Chrome, Edge, WebKit) × normal/reduced motion × light/dark | **24 runs, 1008 state captures, 476 feature checks, 0 axe violations, 0 failures** |
| Original ten audit scripts re-run | all exit 0; the 52 shared records identical afterwards |
| Unit tests | queue, timeline, sync health, Instantly mapping, digest window and render, error scrub, reconciliation |
| Preview, unsigned HTTP checks | 20 pass |
| No test data in the client view | matrix feature on `/`, `/pipeline`, `/email` in all 24 runs; activity and digest payloads scanned on the preview |
| Lighthouse | **Not cleanly met on this machine; see below.** Accessibility 100 and best-practices 100 everywhere. Desktop 94 / 94 / 90. Mobile 73–95 |

**Lighthouse, stated plainly.** Mobile performance read 73–90 locally, mostly below the 90 target, while other applications held the CPU at 55–100 %. To separate load from code I built the R1 tag and this build the same way and ran mobile home three times each, alternating: R1 90 / 89 / 91, R2 95 / 84 / 88. The ranges overlap, so I could not show a regression, but I did **not** get a clean quiet-machine pass. Please re-run `node scripts/design/lighthouse.mjs` on an idle machine. If mobile home is under 90 there, first remove the server-rendered queue from `getInitialStatus` (it adds roughly 1 s of database reads to the first HTML locally).

## Live Instantly vs the app (preview, real data, no password sign-in)
I did not sign in to the preview UI. The local password is not the deployed one, and entering a password on a non-local host is not something I should do. Instead the preview was deployed with a throwaway bearer token (`vercel deploy -e OHQ_TOKEN=…`, scoped to that deployment) and checked through bearer-only, counts-only endpoints (`scripts/r2/preview-reconcile.mjs`):
- 8 inboxes: warmup state, health score (100), daily limit (30), sent today (none yet) — **provider = app for all 8**.
- No tournament campaign exists in Instantly yet: the app shows none, the real sync ran OK and stored nothing, and queue and attribution are honest empties.
- Real lead and email rows carry every field the mapper requires (5 sampled each). Event timestamps and `is_auto_reply` are optional and omitted until they apply; the mapper treats absence as unknown.
- The Instantly key already has the `leads:read` and `emails:read` scopes.
- The Watch feed answered 200 in about 0.85 s; OHQ's own `parseWatchSnapshot` accepts it; a deliberate server error appeared in `errors_24h` (then removed).

**Not verified:** the signed-in preview UI, and per-lead numbers with real sent mail (nothing has been sent). Open the preview signed in and check Home, Email → Instantly sync and Email → Weekly digest.

## Limits and things you must do
- **Scheduler:** Vercel Hobby rejected `*/15` crons. `vercel.json` has daily jobs; `.github/workflows/outreach-cron.yml` supplies the 15-minute sync and the Monday digest trigger, but runs only after merge to the default branch and with repository secrets `APP_URL` and `CRON_SECRET`. Until then the sync happens when someone has the workspace open, plus the daily job.
- **OHQ alerts** need the registry entry and `GG_OHQ_TOKEN`. OperatorHQ was not edited.
- **Attribution** needs the prereg site to call the webhook with `SIGNUP_WEBHOOK_SECRET`.
- **Fixtures:** queue, timeline, attribution table and failing/stale sync screenshots use mocked activity over real leads, because no email has been sent. They are named `fixture-*`; every other sheet is real data.
- Preview and production share one database. The new tables are additive; local runs write sync rows as `instantly-local` and no errors.
- WebKit is Playwright's engine, not a physical iPhone or iPad.
- Contact sheets: `evidence/r2/contact-sheets/index.md` (14 sheets).
