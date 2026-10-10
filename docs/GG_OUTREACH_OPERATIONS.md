# GG Outreach operations

Production: https://whoraised-leads-demo.vercel.app

This is a private, shared outreach workspace. Sir David and Ian use the same password; no signup exists. The generated password is `GG_ACCESS_PASSWORD` in the ignored `.env.local` on the project owner's machine. Share it privately. It is not printed in reports or shipped to the client. Sessions are HttpOnly, Secure in production, SameSite Strict and expire after 12 hours. Changing the password invalidates existing sessions after redeployment.

## Storage and migration

Vercel-managed Neon Postgres (free plan, iad1) stores leads, migration receipts, metrics snapshots and hashed login throttle identities. Neon is the current Vercel Postgres replacement and provides atomic transactions and JSONB field updates. `DATABASE_URL` is provided by the integration, and database modules are server-only. Stage, notes, signups and last-touch edits auto-save after a short debounce; all viewers poll shared state every three seconds. Edits to separate fields merge atomically; competing writes to the same field use the last successful write. Failed edits show an unsaved status and retain the draft in the open tab for retry; closing with unsaved changes triggers a browser warning.

Bring the previous browser-local workspace over using its CSV export:

1. Log in on production and click Import CSV.
2. Select/paste the old export and Validate CSV.
3. Keep “Add new slugs; keep existing leads and edits” selected.
4. Check “One-time migration of a previous CSV export” and import.

The import transaction records a SHA-256 digest of the normalized CSV. The identical backup is rejected on another import, even if another viewer imports it concurrently. Unique slugs already present are preserved. Replace mode deliberately replaces the whole workspace; use merge for migration. No existing local browser records are silently imported or seeded. A blank template and three clearly marked EXAMPLE rows remain available as downloads.

CLI alternative (password read from ignored `.env.local`, never an argument):

```powershell
node scripts/import-csv.mjs https://whoraised-leads-demo.vercel.app D:/path/to/gg-outreach-export.csv
```

The API validates all 13 columns, enums, nonnegative integers, dates, unique slugs, safe contacts and slugs. Imports are limited to 1 MB and 5,000 rows. Export CSV backs up the loaded shared state, including edits. No changes to fit configuration or deterministic pitch generation were needed.

## Instantly connection

Create a v2 key with only account and campaign read scopes (`accounts:read`, `campaigns:read`, or equivalent documented read-only scope). Set sensitive production `INSTANTLY_API_KEY` in the Vercel project. Set `INSTANTLY_CAMPAIGN_ID` when the tournament campaign is known. Redeploy after changing environment variables.

All Instantly requests are GETs from server-only code to the fixed `https://api.instantly.ai/api/v2` origin. The client calls only `/api/email`. No sending, campaign creation, warmup changes, inbox updates or other Instantly writes are implemented. Keys and upstream response bodies are never logged. Errors are sanitized. Official sources:

- [Account list and warmup score](https://developer.instantly.ai/api-reference/account/list-account)
- [Daily account analytics](https://developer.instantly.ai/api-reference/account/get-daily-account-analytics)
- [Campaign list](https://developer.instantly.ai/api-reference/campaign/list-campaign)
- [Campaign analytics](https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics)
- [Daily campaign analytics](https://developer.instantly.ai/api-reference/campaign/get-daily-campaign-analytics)

Email shows each inbox's warmup state, warmup health score, campaign emails sent today (UTC), and campaign daily limit. Missing source values say Unavailable. Campaign lifetime sent volume is a count; open, reply, bounce and unsubscribe rates divide unique leads by contacted leads, with that denominator printed. Automatic replies are excluded where the API supplies the unique-replies metric. Missing denominators show a dash, not a zero rate.

Without an explicit ID, only an unambiguous campaign named GG Outreach, Gap Gambler or Earnings Tournament is selected. Other workspace campaigns are not silently aggregated. Multiple matches require an ID. No matching campaign or an unsent draft displays “No campaign yet” while keeping the inbox section. A missing API key is a configuration error, not proof that no campaign exists.

## Daily snapshots and comparison

Vercel Cron calls `/api/cron/email-snapshot` at 00:05 UTC each day. It requires `Authorization: Bearer CRON_SECRET`. The job saves normalized real inbox + campaign metrics to `gg_snapshots`, uniquely keyed by UTC date. Retry on the same date is idempotent; failed API reads leave history intact and create no invented snapshot. The page shows the latest 90 daily snapshots. Inbox “sent at capture” reflects capture time, not a complete day.

Operational send batches mean UTC days with campaign sends. Each day is compared with its previous send day. The latest 31 days come from the official daily campaign endpoint; older captured send-day metrics remain accessible through snapshot history. Opens/replies on a date are events observed that day, not attribution to that day's recipients. Bounce/unsubscribe cohort attribution is not invented. Lifetime bounce/unsubscribe trends are stored separately in snapshots. At least two real send days/snapshots are necessary to show a comparison/trend.

## Verification

```powershell
npm run lint
npm test
node scripts/verify-deployed.mjs https://whoraised-leads-demo.vercel.app
node scripts/render-deployed-evidence.mjs
```

The deployed gate logs in via the real UI, imports unique EXAMPLE QA records, checks two independent Chromium processes, reload persistence, migration deduplication, authorization, downloads, clipboard and responsive layouts. Only those unique QA rows are removed afterward. It never mocks Instantly or replaces real leads. Gate results and screenshots are in `evidence/deployed`; no auth traces/passwords are retained. The prior `GG_OUTREACH_REPORT.md` describes the earlier browser-local implementation; the deployment report supersedes its persistence and localhost verification claims.

## Outreach layer (R2, 8 October 2026)

**Per-lead Instantly sync.** `runInstantlySync` reads the selected tournament campaign's leads (`POST /leads/list`, a read despite the verb) and emails (`GET /emails`) and stores per-lead sent / opened / replied / clicked / bounced counters, last-contact times and timeline events in `gg_lead_stats` and `gg_lead_events`, matching Instantly rows to leads by their email contact. Bodies and subjects are never stored. Every attempt, good or bad, is a row in `gg_sync_runs`; the on-screen sync pill, the stale warning and the OHQ feed are all computed from those rows. The Instantly key needs `leads:read` and `emails:read` in addition to the account and campaign scopes; the sync checks this on every run, before a campaign exists, and says which scope is missing.

A successful read with no selected campaign records `ok=true` and `counts.state=WAITING`. Fresh waiting runs are healthy in OHQ and display “Waiting for first campaign” in the sync pill and Home. Inbox warmup reads and daily snapshots continue independently. A campaign appearing resumes normal activity sync; provider/configuration errors still fail, and waiting observations older than 40 minutes still become stale. Previous campaign activity is retained in storage but excluded from the current activity queue while waiting.

**Schedule.** The app syncs when (a) the scheduler calls `/api/cron/instantly-sync`, (b) an open workspace sees the last good sync is older than 15 minutes, or (c) someone presses *Sync now*. Vercel's Hobby plan only allows daily crons with a loose firing time (it rejected a `*/15` schedule at deploy), so `vercel.json` keeps a daily floor and `.github/workflows/outreach-cron.yml` provides the 15-minute tick and the Monday digest trigger. GitHub runs `schedule` workflows only from the default branch, so nothing fires until this branch is merged and the repository secrets `APP_URL` and `CRON_SECRET` exist. On the Pro plan, replace the workflow with `*/15 * * * *` and `0 14 * * 1` crons.

**Needs action today.** Replies awaiting an answer, bounces to fix and follow-ups due (5 days after the last send or touch, `FOLLOW_UP_DAYS` in `lib/activity.ts`). Example and closed leads never appear.

**Attribution.** `POST /api/attribution/signup` with `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET` and `{"id":"<unique signup id>","slug":"<utm_content>","at":"<ISO>"}`, sent by the preregistration site (idempotent on `id`, unknown slugs ignored, no personal data accepted). Until a signup is reported or `PREREG_LIVE_AT` passes, the dashboard shows "Attribution starts when the signup link is live".

**Weekly digest.** Previewed under Email → Weekly digest from the same model that renders the message (`/api/digest?format=html` is the exact HTML). Sending needs all of `DIGEST_SEND_ENABLED=true`, `RESEND_API_KEY`, `DIGEST_FROM`, `DIGEST_RECIPIENTS`; with any missing it does nothing and records a skip. It sends only on Monday 09:00–11:59 New York and at most once per five days, so a late or duplicate trigger is harmless.

**Error monitoring (OHQ Watch contract).** Server errors (`instrumentation.ts` → `onRequestError`), failed syncs and signed-in browser errors (`ErrorReporter`, `error.tsx`, `global-error.tsx` → `/api/errors`) are fingerprinted and counted in `gg_errors` after scrubbing addresses, tokens, long numbers and query strings. OHQ polls `GET /api/ohq/health` and `GET /api/ohq/watch` with `Authorization: Bearer $OHQ_TOKEN`. To receive the alerts, add to OperatorHQ `watch.apps.json` (and give the same token to OHQ under `GG_OHQ_TOKEN`) and a `gg` profile in `lib/watch/profiles.ts` requiring `["release","deploy_truth","health","errors","alerts"]`:

```json
{ "name": "GG Outreach", "client": "GG", "url": "https://gg-tourney-hub.vercel.app", "tokenEnv": "GG_OHQ_TOKEN", "criticality": "standard", "profile": "gg" }
```

`GET /api/ohq/reconcile?sync=1` (same bearer) runs the real sync and compares the raw Instantly read with what the app serves, field by field; `GET /api/ohq/canary` throws on purpose to prove capture end to end. Neither is polled.

Local runs are labelled apart so they cannot make a deployed app look healthy or noisy: sync rows from a machine without `VERCEL` are stored as `instantly-local`, and errors are not written to the shared monitor unless `GG_MONITOR_LOCAL=1`.
