# GG Tournament Oct

Completed October 12, 2026. **Created and paused; never launched. Exactly three test emails accepted, one per step.** [Review the campaign in Instantly](https://app.instantly.ai/app/campaign/e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef/analytics). The live dashboard selects this campaign and shows **Paused · ready**, **1,080 leads**, and **3 steps**.

## Settings

- Remain paused; never call the activate/resume endpoint.
- All eight GG sending inboxes, 30 messages per inbox per day (240 total daily).
- Monday–Sunday, 09:00–17:00 Eastern, starting October 12, 2026.
- Instantly's documented timezone enum supports `America/Detroit`, which follows Eastern DST, rather than `America/New_York`.
- Plain text; open and click tracking off; stop on reply; native unsubscribe footer and List-Unsubscribe header.
- Day 0, Day 3, Day 7: API delays of 3 days on Step 1 and 4 days on Step 2. The API delay belongs to the preceding step.
- CSV: `data/gap_gambler_US_segment_for_instantly.csv` is ignored and untracked. 1,081 unique, syntactically valid addresses: 224 trader, 857 general. One general `hr` role mailbox was excluded, leaving 1,080 eligible leads: 224 trader, 856 general. The dashboard displays the actual eligible count.
- Imported trader first, then general. Workspace blocklists and unsubscribed, invalid and bounced records were checked before import; none of the remaining leads matched. Bulk import reported no additional skips or duplicates. All imported lead hashes and segment URLs were read back and verified.
- `registration_url` must be a per-lead custom variable: `https://gg-tourney-hub.vercel.app/go/email-trader?c=<hash>` or `/go/email-general?c=<hash>`. Hash is lowercase hex SHA-256 of the normalized, lowercase email. No raw address in URLs.
- The saved sequence uses Instantly's native `https://UNSUBSCRIBE_INSTANTLY.ai` link and enables the List-Unsubscribe header. Preview-test unsubscribe links are inactive by Instantly design; do not launch to test them.

## Step 1 — Day 0

Subject: Join The GG Tournament

Hi there,

You're invited to Gap Gambler's free market-prediction tournament, Oct 16 – Nov 13. Make one daily pick; the longest streak wins $1,000. Open to U.S. residents 18+.

First picks close Oct 16, 4 PM ET.

You can register any time: {{registration_url}}

Hope you'll join us,
The GG Team

Unsubscribe: https://UNSUBSCRIBE_INSTANTLY.ai
Gap Gambler · 5900 Balcones Drive, STE 100, Austin, TX 78731

## Step 2 — Day 3

Subject: You Can Still Join GG

Hi there,

A quick reminder: you can still join Gap Gambler's free tournament, Oct 16 – Nov 13. Make one daily pick. Consecutive correct picks build your streak; the longest streak wins $1,000.

First picks close Oct 16, 4 PM ET.

Registration stays open any time for U.S. residents 18+: {{registration_url}}

Best,
The GG Team

Unsubscribe: https://UNSUBSCRIBE_INSTANTLY.ai
Gap Gambler · 5900 Balcones Drive, STE 100, Austin, TX 78731

## Step 3 — Day 7

Subject: One Last GG Invitation

Hi there,

One last note about Gap Gambler's free tournament, Oct 16 – Nov 13. Take one daily pick; the longest streak wins $1,000. U.S. residents 18+ can register any time.

First picks close Oct 16, 4 PM ET.

That first deadline doesn't close registration. If you'd like to join, here's the link: {{registration_url}}

Thanks,
The GG Team

Unsubscribe: https://UNSUBSCRIBE_INSTANTLY.ai
Gap Gambler · 5900 Balcones Drive, STE 100, Austin, TX 78731

## Verification

- Both live campaign redirects returned 302 to `https://earningstournament.com` with `utm_source=email`, `utm_campaign=gg-oct`, segment-specific `utm_content`, and the hashed `c` value. The destination returned 200. These slugs use group `Email`, remain outside the creator list, and are not inherently treated as test traffic.
- Instantly campaign status was explicitly set to `2` (paused) before lead import. Saved copy, all requested settings, all eight inbox limits, and lead URLs were verified via API. The sequence uses a wrapping HTML element for API persistence while plain-text sending remains enabled.
- Exactly one test per step was accepted by `POST /api/v2/emails/test` for `rumman.co.uk1@gmail.com`. Accepted requests are recorded in an ignored local ledger; do not repeat them.
- The working API key replaced `INSTANTLY_API_KEY` in Vercel Production and Preview. Production `INSTANTLY_CAMPAIGN_ID` selects this campaign. Production deployment `dpl_J7bV5fJ35gCbkayeRGjdEZ8erAzb` includes the redirect and dashboard changes.
- `.gitignore` and `.vercelignore` exclude contact CSVs and the private campaign work directory. No contact list or API key was committed.
- TypeScript, production build, and seven targeted tests passed. The live Email tab verified the paused state, zero campaign sends, 1,080 leads, and Day 0/3/7 sequence. Instantly's empty analytics response for a never-launched campaign is handled by reading the real overview and paginated lead count.
- A completed production sync returned `ok: true`, `instantlyLeads: 1080`, `emails: 0`, and zero sends. The pagination checkpoint finished successfully; the live dashboard warning cleared. Review screenshot: `evidence/gg-tournament-oct-paused.png`.

Official references: [Campaign API](https://developer.instantly.ai/api-reference/campaign/create-campaign), [Bulk import](https://developer.instantly.ai/api-reference/lead/add-leads-in-bulk-to-a-campaign-or-list), [Test email API](https://developer.instantly.ai/api-reference/email/send-a-test-email), [Native unsubscribe](https://help.instantly.ai/en/articles/6191077-how-to-add-unsubscribe-link).

## October 12, 2026 — sync and dashboard release audit

**Sync root cause:** the new sync scope preflight treated Instantly's `all:all` grant as missing `leads:read` and `emails:read`, so scheduled runs failed before reading activity.

- The supplied Instantly key was added as a sensitive `INSTANTLY_API_KEY` in Vercel Production and Preview through the CLI. No key value or fingerprint is recorded here. Instantly key metadata reported `all:all`; read-only `leads/list` and `emails` checks both returned HTTP 200.
- The scope preflight now accepts a sole `all:all` key as covering required scopes. When key metadata cannot identify a sole key, it retains the exact-scope read probes. Unit coverage passes for `all:all`, exact grants, and a missing scope.
- Production deployment `dpl_EbBKacUj28NUx3Dc5r8N3cZPg3mZ` completed successfully. The cron route runs the bounce brake first, then gives activity sync a bounded budget; a sync failure is isolated from the completed brake result. GitHub sync workflows are manual backups; the Monday digest remains scheduled.
- The manual GitHub backup check at 2026-10-12 14:22 UTC returned a successful brake result with 27 sent, 0 bounced, and `paused: false`. The subsequent sync resumed from its checkpoint.
- The production cron-job.org run at 2026-10-12 14:30:22 UTC recorded a successful brake check with 27 sent, 0 bounced, and `paused: false`; its Instantly sync checkpoint was still in the email-reading phase. The follow-up 15-minute automatic run is required before cadence proof is complete.
- Production “Retry reading activity” returned HTTP 200 from its activity read. “Sync now” returned HTTP 200; the run was already in progress and continued from its checkpoint.
- At 2026-10-12 14:31:23 UTC, Instantly's campaign analytics and the production dashboard both reported 27 sent and 0 bounced.
- Production QA covered Home, Email, and Pipeline at widths 390, 820, and 1440 in light and dark themes, reduced motion, Chromium and WebKit: 36/36 combinations passed; axe reported 0 violations; no horizontal overflow or QA markers appeared.
- `npm test`: 45 passed. `npm run build`: passed. `npm run lint`: 0 errors (16 existing warnings). A source grep found no tournament fact/date literals outside `src/config/tournament.ts`.
- No campaign or lead mutation was performed in this release audit. The brake reported `paused: false`.

### Final verification after the `all:all` key update

- The supplied key was installed as a sensitive `INSTANTLY_API_KEY` in both Vercel Production and Preview. Instantly metadata identified its grant as `all:all`; the key itself and any fingerprint are intentionally absent from this document.
- Production deployment `dpl_AiTBp5HVoA2CC1EU2PnCiBoEwc6U` reached `READY` and was aliased at `https://go.gapgamblerteam.com`. GitHub `main` and the checked-out release commit both resolve to `4f9d5b4ef34308cb5c0cd73ffc5bcf60a38bc42a`.
- Two consecutive successful automatic production sync records completed at 14:25:09 and 14:40:16 UTC, 15 minutes 7 seconds apart. Both recorded 986 Instantly leads and 27 campaign emails.
- The production cron-job.org request at 14:45:16 UTC recorded a successful brake check with 27 sent, 1 bounced, and `paused: false`. The 14:30:22 UTC cron-job.org check was also successful (27 sent, 0 bounced, `paused: false`). The cron handler runs the brake before starting sync and bounds sync work to 70 seconds.
- At 14:43:31 UTC, a direct Instantly campaign analytics request and the uncached production `/api/email/source` response both returned HTTP 200 and matched at 27 sent and 1 bounced.
- On the final production deployment, “Retry reading activity” returned HTTP 200 with activity data. “Sync now” completed successfully at 14:48:55 UTC (HTTP 200, run `ok: true`, 986 leads, 27 campaign emails). An immediate earlier attempt at 14:45:54 UTC hit the shared Instantly read budget; the checkpoint resumed and the later retry completed.
- The final production QA rerun covered Home, Email, and Pipeline at 390, 820, and 1440 pixels in light and dark themes, with reduced motion in Chromium and WebKit: 36/36 passed. Every route returned HTTP 200, had no horizontal overflow or QA markers, and axe reported 0 violations.
- `npm test -- --reporter=line`: 45 passed. A source grep found no tournament fact/date literals outside `src/config/tournament.ts`.
- Campaign and lead records were not changed. No pause/resume action was performed.
