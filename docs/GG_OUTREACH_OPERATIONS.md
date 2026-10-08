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
