# GG Outreach click tracking

Implemented and deployed to https://whoraised-leads-demo.vercel.app on October 7, 2026 (Asia/Karachi).

## Behavior

- Public `GET /go/[slug]` awaits storage before returning HTTP 302 to server-only `PREREG_URL`, default `https://earningstournament.com`. Existing destination path, query parameters and fragment are preserved. Attribution parameters are overwritten with `utm_source=creator`, `utm_campaign=gg-q3`, and `utm_content=<slug>`.
- Every generated pitch contains the workspace's absolute `/go/<slug>` link. The default origin for non-browser generation is the production origin.
- `gg_clicks` stores an identity ID, database UTC timestamp (`clicked_at`), slug, lead platform at click time (`lead_group`), referrer hostname, platform guess, and EXAMPLE flag. No IP, full user-agent, referrer path/query, or device identifier is stored by click tracking. Platform guesses are heuristics, not verified identities.
- Twitterbot, facebookexternalhit, Slackbot, Discordbot, LinkedInBot, WhatsApp, TelegramBot, crawlers and other known preview agents redirect without storage. HEAD and prefetch requests also redirect without storage. Repeat human requests count separately; there is no unique-person metric.
- Invalid slug syntax returns 404. Unknown well-formed slugs redirect but are not attributed. POST returns 405. A storage failure returns a retryable 503 to avoid silently dropping a click. Redirect responses are never cached.
- Existing authenticated `/api/leads` includes aggregate click data, refreshed by the workspace every three seconds. Anonymous analytics reads return 401. The public redirect never discloses lead details.
- Dashboard: clicks per lead, all-time counts per captured platform group, clicks in the existing platform/niche/audience-band tables, and a zero-filled last-30-days UTC trend with accessible daily counts. Niche/audience-band summaries use current lead membership; platform event totals use the captured group.
- Signups remain editable manual counts, labelled **awaiting prereg data**. There is no preregistration integration or inferred signup count.
- EXAMPLE clicks are visible in the lead table/drawer but excluded from conversion group totals and the daily trend. Click history survives lead deletion/replacement; existing per-lead counts attach to the same slug if reimported. Do not reuse a slug for a different creator.

## Validation

`npm run lint`, `npm test` (four tests), and `npm run build` pass. The tests cover preview agents, natural mobile/desktop UA eligibility, attribution overwrite/preservation, referrer privacy, platform inference and pitch links.

`node scripts/verify-click-schema.mjs` passed using a session-local temporary table over the configured direct database connection. It verifies the schema, EXAMPLE exclusion, and zero-filled 30-day aggregation without modifying application data.

The production verification script is `scripts/verify-click-tracking.mjs`. It uses the real password gate, actual shared database, curl bot requests, and deployed browser UI. It leaves the uniquely named **EXAMPLE Click Verification** lead (`example-click-proof-20261007`) in place for the physical phone check. No real leads are overwritten, no API data is mocked, and no mobile UA is spoofed as proof of a real phone.

Production deployment: [dpl_6aE6p82pPmqLLb7y67ewZkrNjZQe](https://vercel.com/rummancouk1-9706s-projects/whoraised-leads-demo/6aE6p82pPmqLLb7y67ewZkrNjZQe), aliased to the stable production origin. Verification captured at **2026-10-07T08:26:27.858Z**.

- **PASS — desktop:** 2 persisted desktop events (including the earlier verification attempt). A headed Chromium browser clicked a DOM link using its natural desktop user-agent. The most recent desktop event is **2026-10-07T08:22:46.146Z**. The dashboard count matches all 2 persisted fixture events.
- **PASS — bot curl:** HTTP 302 to the correctly attributed destination, with click count unchanged (2 before and after this verification's bot/HEAD/prefetch requests). Twitterbot plus six other preview agents were excluded.
- **PASS — privacy/access:** no IP or full-UA columns; anonymous analytics 401; invalid slug 404; POST 405; unknown slug does not count.
- **PASS — parity:** 390/820/1440 in normal and reduced motion; no page overflow, settled drawer bounds inside viewport, and no active animations/transitions under reduced motion. No browser runtime errors.
- **PENDING — physical phone:** no confirmed physical phone event. Mobile emulation has not been substituted for this requirement.

[Raw production evidence](../evidence/click-tracking/verification.json) · [Screenshot gallery](../evidence/click-tracking/index.html)

| View | 390 normal | 390 reduced | 820 normal | 820 reduced | 1440 normal | 1440 reduced |
|---|---|---|---|---|---|---|
| dashboard | [PASS](../evidence/click-tracking/dashboard-390-normal.png) | [PASS](../evidence/click-tracking/dashboard-390-reduce.png) | [PASS](../evidence/click-tracking/dashboard-820-normal.png) | [PASS](../evidence/click-tracking/dashboard-820-reduce.png) | [PASS](../evidence/click-tracking/dashboard-1440-normal.png) | [PASS](../evidence/click-tracking/dashboard-1440-reduce.png) |
| trend | [PASS](../evidence/click-tracking/trend-390-normal.png) | [PASS](../evidence/click-tracking/trend-390-reduce.png) | [PASS](../evidence/click-tracking/trend-820-normal.png) | [PASS](../evidence/click-tracking/trend-820-reduce.png) | [PASS](../evidence/click-tracking/trend-1440-normal.png) | [PASS](../evidence/click-tracking/trend-1440-reduce.png) |
| drawer | [PASS](../evidence/click-tracking/drawer-390-normal.png) | [PASS](../evidence/click-tracking/drawer-390-reduce.png) | [PASS](../evidence/click-tracking/drawer-820-normal.png) | [PASS](../evidence/click-tracking/drawer-820-reduce.png) | [PASS](../evidence/click-tracking/drawer-1440-normal.png) | [PASS](../evidence/click-tracking/drawer-1440-reduce.png) |
| pitch | [PASS](../evidence/click-tracking/pitch-390-normal.png) | [PASS](../evidence/click-tracking/pitch-390-reduce.png) | [PASS](../evidence/click-tracking/pitch-820-normal.png) | [PASS](../evidence/click-tracking/pitch-820-reduce.png) | [PASS](../evidence/click-tracking/pitch-1440-normal.png) | [PASS](../evidence/click-tracking/pitch-1440-reduce.png) |
| pipeline | [PASS](../evidence/click-tracking/pipeline-390-normal.png) | [PASS](../evidence/click-tracking/pipeline-390-reduce.png) | [PASS](../evidence/click-tracking/pipeline-820-normal.png) | [PASS](../evidence/click-tracking/pipeline-820-reduce.png) | [PASS](../evidence/click-tracking/pipeline-1440-normal.png) | [PASS](../evidence/click-tracking/pipeline-1440-reduce.png) |

The production database contained zero real leads. Therefore group totals and trend correctly show the real-data empty state. The temporary-table check independently verifies nonzero aggregation and zero filling. The EXAMPLE proof lead shows the actual persisted desktop count in its row and drawer. Narrow lead tables and pipeline boards intentionally scroll horizontally. No screenshot contains a password.
## Remaining physical-device evidence

A physical phone click requires the user to open [the verification link](https://whoraised-leads-demo.vercel.app/go/example-click-proof-20261007) in their phone browser. Until the user confirms that action and the event appears in persisted counts and the dashboard, the phone acceptance check is **PENDING**, not passed. Desktop browser automation is identified as automation in the evidence.


## Client-readiness isolation — 8 October 2026

Audit requests must send `X-GG-Test-Click: 1` or a `GG-Outreach-Audit/1.0` user agent. `GG-Outreach-Test`, Playwright/headless UAs, `?test=1`, and existing example/test slugs are also classified as test traffic. Marked GETs are stored with `is_test=true`; ordinary preview bots, prefetches and HEADs create no click. Real lead slugs that happen to contain `audit-` remain valid outreach links and are not classified by that prefix.

Client analytics return only real lead/group/day counts. Test events remain in server-only `gg_clicks` rows flagged `is_test`; cleanup and source-health evidence remain in `gg_internal_audit`, with no client UI toggle or API test totals. The safe replacement for the old audit click script is `node scripts/preclient-click.mjs`; it proves that three marked requests are stored while every real aggregate stays unchanged. Do not use an unmarked phone UA to exercise a real invitation link during an audit.

Two identified pre-client audit events (IDs 11 and 12) were backed up and removed; the resulting real count is 1. See `evidence/client-readiness/cleanup.json` and `clicks.json`.
