# GG Outreach deployment and gates

Verified October 6, 2026, on **https://whoraised-leads-demo.vercel.app**. This report supersedes the browser-local storage and localhost verification sections of `GG_OUTREACH_REPORT.md`, which was read before this implementation.

**Overall ready gate: PASS for the current prelaunch state.** The production key now connects to real Instantly inboxes, the first real daily snapshot persists, and populated Email parity passes. Only previously blocked checks were rerun; earlier unrelated evidence is retained. Campaign rates and multi-day comparisons require future real campaign activity.

## Results with evidence

| Requested item | Result | Evidence |
|---|---|---|
| Hosted shared storage | PASS. Provisioned Vercel-managed Neon Postgres, free plan in iad1. Chosen for atomic imports, field-level JSONB updates and Vercel-managed credentials; Neon is the current Vercel Postgres replacement. | [Server DB schema](../src/lib/server/db.ts), [lead operations](../src/lib/server/leads.ts), [live readiness](../evidence/deployed/ready.json) |
| Shared stage/notes/signups edits | PASS on production. Two independent Chromium processes logged in. Browser one changed a QA lead to Joined, signups 7 and unique notes; browser two received all three through polling and retained them after reload. | [Browser one](../evidence/deployed/ready-browser-one.png), [browser two](../evidence/deployed/ready-browser-two.png), [readiness log](../evidence/deployed/ready.json) |
| One-time existing CSV importer | PASS for the importer. Real UI imported three uniquely marked EXAMPLE QA records; repeated normalized backup was rejected without mutation. Real existing export was not supplied and has not been migrated. | [Import transaction](../src/lib/server/leads.ts), [CLI importer](../scripts/import-csv.mjs), [migration instructions](GG_OUTREACH_OPERATIONS.md), [readiness log](../evidence/deployed/ready.json) |
| Private password gate | PASS. Server layout redirects unauthenticated viewers to login; API rejects anonymous reads with 401. Wrong password returns 401. Authenticated edits from a foreign origin return 403. No signup. Database-backed attempt throttling. | [Auth route](../src/app/api/auth/route.ts), [session validation](../src/lib/server/auth.ts), [private layout](../src/app/(workspace)/layout.tsx), [cookie/security checks](../evidence/deployed/client-secrets.json) |
| Secret handling | PASS for previously configured secrets; earlier client scan retained. Instantly reads now succeed server-side using the production environment key. No key value was fetched locally or printed during this rerun. All upstream requests remain GET. | [Historical client scan](../evidence/deployed/client-secrets.json), [server-only adapter](../src/lib/server/instantly.ts), [real connection evidence](../evidence/deployed/email-live/results.json) |
| Read-only Instantly v2 Email view | PASS. Real production API returned 18 sending inboxes, including eight warming GG inboxes listed below. Warmup/health/daily limits display real values. Account daily analytics supplied no send rows, so sent today remains Unavailable. | [Real API metrics](../evidence/deployed/email-live/live-metrics.json), [targeted checks](../evidence/deployed/email-live/results.json) |
| Prelaunch campaign behavior | PASS. Real API confirms no matching campaign. Email says “No campaign yet” with inbox warmup and actual snapshot rows. No errors, empty campaign charts, campaign history table or send-comparison placeholders. | [Populated screenshots](../evidence/deployed/email-live/PARITY.md), [Email view](../src/components/outreach/EmailView.tsx) |
| Daily snapshot job | PASS. Authorized production cron invocation first inserted the 2026-10-06 snapshot at 17:13:15.073 UTC (22:13:15 Asia/Karachi), with 18 inboxes and no campaign. Private API readback confirmed persistence; retries retained one unchanged row. Scheduled daily 00:05 UTC. | [First write proof](../evidence/deployed/email-live/first-write.json), [readback](../evidence/deployed/email-live/snapshot.json), [retry checks](../evidence/deployed/email-live/results.json), [cron](../vercel.json) |
| Compound trends and batch comparison | PASS for prelaunch snapshot history: real persisted inbox metrics render. Campaign history and send comparisons stay hidden until launch. A single day cannot demonstrate a multi-day trend; no comparison is invented. Postlaunch rates and batch comparisons remain future verification. | [Populated parity](../evidence/deployed/email-live/PARITY.md), [metric semantics](GG_OUTREACH_OPERATIONS.md) |
| Vercel production deployment | PASS. Next.js 16.3.8 production build READY; latest deployment `dpl_GtAyNbSXmoM4oj2ux6Kunny12AmX`, serving the production alias with the supplied key and clean prelaunch Email. | [Live URL](https://whoraised-leads-demo.vercel.app), [inspector](https://vercel.com/rummancouk1-9706s-projects/whoraised-leads-demo/GtAyNbSXmoM4oj2ux6Kunny12AmX) |
| Deployed parity | PASS. Previous full-view evidence retained. Previously blocked populated Email now passes at 390/820/1440, normal and reduced motion: six full-page plus four horizontal-scroll captures, all visually reviewed with no breaks. No other views rerun. | [Populated Email matrix](../evidence/deployed/email-live/PARITY.md), [raw targeted checks](../evidence/deployed/email-live/results.json), [prior full-view matrix](../evidence/deployed/PARITY.md) |
| Mobile board and drag | PASS. Board scrolls horizontally at 390px. Keyboard drag on live desktop moved QA lead Joined → Replied and the database API confirmed saved stage. | [Scrolled mobile board](../evidence/deployed/pipeline-scrolled-390-normal.png), [readiness log](../evidence/deployed/ready.json) |
| CSV export and draft copy | PASS on deployed URL at every width/motion combination. Export included saved unique notes, download produced expected CSV filename, clipboard contained the exact lead tracking URL. Drawer bottom and import bottom also captured to verify internal scrolling. | [Gate script](../scripts/verify-deployed.mjs), [export captures](../evidence/deployed/PARITY.md) |
| QA cleanup | PASS. Only the three uniquely named EXAMPLE gate rows were removed after each run. No sample dataset is seeded. Migration audit receipts remain. | [Readiness log](../evidence/deployed/ready.json) |
| Build/lint/types/contracts | PASS. Production build, ESLint, TypeScript and CSV/fit/draft/compound contract test. No uncaught page errors in the deployed gate. Updated Next.js from 16.2.6 to 16.3.8 after the audit identified published vulnerabilities. Production audit now reports zero vulnerabilities; five high development-tool advisories remain in the ESLint glob dependency chain, whose suggested forced fix would downgrade Next's lint config. | [Production audit](../evidence/deployed/production-audit.json), [contract results](../evidence/test-results.json), [package versions](../package.json) |

## Real warming GG inboxes

Read from production at 2026-10-06T17:15:26.991Z. The workspace returns 18 total inboxes; these eight are GG. Source: [normalized real API response](../evidence/deployed/email-live/live-metrics.json).

| Inbox | Warmup | Health | Daily limit |
|---|---|---|---|
| steve@gapgamblerteam.com | Active | 100/100 | 30 |
| melanie@gapgamblerofficial.com | Active | 100/100 | 30 |
| nancy@gapgamblermedia.com | Active | 100/100 | 30 |
| steve@gapgamblermedia.com | Active | 100/100 | 30 |
| melanie@gapgamblerhq.com | Active | 100/100 | 30 |
| nancy@gapgamblerhq.com | Active | 100/100 | 30 |
| steve@gapgamblergroup.com | Active | 100/100 | 30 |
| melanie@gapgamblergroup.com | Active | 100/100 | 30 |

Sent today is Unavailable because the real daily analytics response contained no send rows. No zeros were substituted.

## Targeted rerun details

The initial run wrote the first snapshot successfully, then its broad alert check caught Next.js’s empty accessibility announcer. The check was narrowed to visible application error alerts. A cancelled route prefetch on browser-context closure is recorded separately from API failures. The final run and visual review pass every requested item. [Original first-write run](../evidence/deployed/email-live/first-write-run.json) and [final results](../evidence/deployed/email-live/results.json) preserve the evidence.

The original shared-storage, login, CSV and other-view checks were not rerun. Their prior PASS evidence remains in [readiness](../evidence/deployed/ready.json); [the previous blocked gate](../evidence/deployed/ready-before-email.json) is retained. No lead data was changed in this follow-up.

## Official API sources and metric semantics

The adapter was built from the [official Instantly API v2 index](https://developer.instantly.ai/llms.txt) and its OpenAPI schema. Account list supplies `warmup_status`, `stat_warmup_score`, `daily_limit`; [daily account analytics](https://developer.instantly.ai/api-reference/account/get-daily-account-analytics) supplies campaign sends for a UTC date. [Campaign analytics](https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics) supplies lifetime metrics; [daily campaign analytics](https://developer.instantly.ai/api-reference/campaign/get-daily-campaign-analytics) supplies dated send activity. Campaign open/reply/bounce/unsubscribe rates use contacted leads as denominator, printed in the view. Missing numbers remain Unavailable and missing/zero denominators remain a dash.

Daily batches mean days with campaign sends. Opens/replies are observations on that day, not attribution to its send recipients. Snapshot inbox counts reflect 00:05 UTC capture time; daily batch analytics provide full historical send days. At least two real days are necessary for a comparison; history is never invented. The [Next.js security advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) and [16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8) informed the dependency update.

## Access and verification limits

The generated workspace password is `GG_ACCESS_PASSWORD` in the owner's ignored `.env.local`. It is also a sensitive Vercel environment variable. Share that value privately with Sir David and Ian; no secret is included in this report.

The owner supplied `INSTANTLY_API_KEY` in production; redeployment and the targeted live gates succeeded. Ready gate is **PASS for prelaunch use**. Real campaign rates and comparisons must be checked after a campaign launches and enough real send days exist. No campaign needs to be created for this gate. [Operations guide](GG_OUTREACH_OPERATIONS.md) includes migration and rerun commands.
