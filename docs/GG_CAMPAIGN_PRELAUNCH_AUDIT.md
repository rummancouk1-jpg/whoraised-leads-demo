# GG Tournament Oct — prelaunch audit

Audit date: **October 12, 2026, Asia/Karachi**. API observations and tests: October 11, approximately 18:39–18:47 EDT (22:39–22:47 UTC), which is October 12 locally. Eastern dates below use America/New_York.

Campaign: `e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef`, **GG Tournament Oct**. [Instantly campaign](https://app.instantly.ai/app/campaign/e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef/analytics).

**Safety rule satisfied:** initial and final API status `2` = **Paused**. No activate, launch, or resume endpoint was called. Final campaign analytics: **0 sent, 0 contacted**. Preview tests are separate from campaign sends. No verification, purchase, or credit-consuming enrichment endpoint was called. Available credits remained **100**.

## A. Read-only audit and final readback

FAIL includes a requirement that cannot be positively established. The initial audit was read-only, including the documented read-only `POST /leads/list` and `POST /accounts/warmup-analytics` endpoints. Only the changes in section B followed it.

| Item | Initial | After fixes | Actual value / evidence |
|---|---|---|---|
| 1. Exact schedule timezone `America/New_York` | FAIL | FAIL | Saved timezone is **`America/Detroit`**. It follows the same Eastern time/DST for this campaign, but is not the requested literal value. Instantly's API timezone enum includes Detroit and omits New_York. Schedule changes were outside the permitted fixes. |
| 1. Hours | PASS | PASS | `timing.from = 09:00`, `timing.to = 17:00`. |
| 1. Every day | PASS | PASS | `days[0]` through `days[6]` are all `true`. |
| 1. Start October 12 | PASS | PASS | `campaign_schedule.start_date = 2026-10-12`; no end date set. |
| 2. Daily limit per inbox | PASS | PASS | All eight attached accounts have `daily_limit = 30`; campaign `daily_limit = 240`, `daily_max_leads = 240`. |
| 2. All eight GG inboxes attached | PASS | PASS | Exactly eight distinct addresses in `email_list`; complete list below. |
| 2. Warmup remains on | PASS | PASS | All eight accounts: `warmup_status = 1` (Active), account `status = 1`, `stat_warmup_score = 100`. No account settings were changed. |
| 3. Stop on reply | PASS | PASS | `stop_on_reply = true`. |
| 3. Open tracking off | PASS | PASS | `open_tracking = false`. Already off; no change needed. |
| 3. Instantly link tracking off | PASS | PASS | `link_tracking = false`. Already off; `/go/` provides tracking. |
| 4. Prioritize new leads | FAIL | PASS | Initially **absent/unset**, not confirmed enabled. Final `prioritize_new_leads = true`. |
| 5. Step 1 content checks | PASS | PASS | 1 variant; only `{{registration_url}}`; **0 unresolved substitutions across 1,080 leads**; native unsubscribe URL and Austin footer present; no `{{prereg_link}}`; no `/rules`. |
| 5. Step 2 content checks | PASS | PASS | 1 variant; only `{{registration_url}}`; **0 unresolved substitutions across 1,080 leads**; native unsubscribe URL and Austin footer present; no `{{prereg_link}}`; no `/rules`. |
| 5. Step 3 content checks | PASS | PASS | 1 variant; only `{{registration_url}}`; **0 unresolved substitutions across 1,080 leads**; native unsubscribe URL and Austin footer present; no `{{prereg_link}}`; no `/rules`. |
| 6. Variables actually used and greeting | PASS | PASS | Only **`{{registration_url}}`** occurs in subjects/bodies. All subjects are static; every step begins **“Hi there,”**. Neither `{{firstName}}` nor another name token is used. |
| 6. Stored first-name quality, supplemental 30-lead sample | FAIL | FAIL | **6/30 suspected handles/non-person names**, **0 emoji**, **0 ALL CAPS**, **0 empty**; **7/30** contain the literal fallback `there`. This stored field is unused by the copy; no name records were changed. Details below distinguish subjective flags from mechanical checks. |
| 7. Trader routing | PASS | PASS | **10/10 sampled**, and **224/224 total**, have `/go/email-trader` with the correct per-email SHA-256 `c` value. Current host remains `gg-tourney-hub.vercel.app`. |
| 7. General routing | PASS | PASS | **10/10 sampled**, and **856/856 total**, have `/go/email-general` with the correct per-email SHA-256 `c` value. Current host remains `gg-tourney-hub.vercel.app`. |
| 8. Lead count 1,080 | PASS | PASS | Fully paginated list: **1,080 records, 1,080 distinct normalized emails = 224 trader + 856 general**. |
| 8. Instantly verification run established | FAIL | FAIL | `verification_status` is **absent on all 1,080 records**, including an individual lead GET. Read-only verification-status GETs for **30 sampled addresses returned 404/Not Found in all 30 cases**. No verification run/result is evidenced; treat the list as **not verified**, rather than asserting delivery validity. Full historical spending is not exposed by these responses. |
| 8. Verification cost / no spend | PASS | PASS | Published bulk verification price: **0.25 credits/lead**, so **270 credits** for 1,080. Workspace: Free Trial credits **100 available / 100 total**, a **170-credit shortfall**. No paid credit plan or dollar purchase quote was returned. **0 credits spent by this audit**. |
| 9. Seven complete days of saved dashboard warmup snapshots | FAIL | FAIL | For the seven dates ending on the live ET date, **Oct 5–11**, only **Oct 6–10** have persisted rows (**40/56 inbox-day cells**). Live Oct 11 adds **8 measured cells**, leaving **8 empty cells on Oct 5**. The grid is populated, not wholly empty. No synthetic history was created. |

### Attached sending accounts

| Inbox | Attached | Daily limit | Warmup | Current score |
|---|---|---:|---|---:|
| steve@gapgamblerteam.com | Yes | 30 | ON (`1`) | 100 |
| melanie@gapgamblerofficial.com | Yes | 30 | ON (`1`) | 100 |
| nancy@gapgamblermedia.com | Yes | 30 | ON (`1`) | 100 |
| steve@gapgamblermedia.com | Yes | 30 | ON (`1`) | 100 |
| melanie@gapgamblerhq.com | Yes | 30 | ON (`1`) | 100 |
| nancy@gapgamblerhq.com | Yes | 30 | ON (`1`) | 100 |
| steve@gapgamblergroup.com | Yes | 30 | ON (`1`) | 100 |
| melanie@gapgamblergroup.com | Yes | 30 | ON (`1`) | 100 |

### Variables and first-name sampling

The API declares core variable `firstName` and custom variables `audience_angle`, `registration_url`. Declaration does not mean use in copy: **only `registration_url` is referenced**. `audience_angle` controls the imported segment URL. Every lead has a nonempty matching registration URL, and all **3,240 lead/step combinations** resolve without residual `{{...}}` tokens. `{{prereg_link}}` occurs zero times.

The supplementary name sample uses API ID order at zero-based indices **0, 36, 72, …, 1044**, giving 30 evenly spaced leads across the full list. Emoji, ALL CAPS, and empty checks each found zero. Manual review conservatively flags six entries: `Eazy`, `United`, `The` (twice), `Violinlover`, and `Oklahoma`. These are **suspected** handles/non-person names; `Eazy` could be a nickname. Excluding that ambiguous entry leaves five clear non-person/handle-like entries. Seven additional entries contain `there`, which is the observed imported fallback, not an empty value. No runtime name-fallback expression is present in the email templates; the actual greeting is always the literal **“Hi there,”**, independent of stored names.

The only unsubscribe URL in each body is Instantly's native `https://UNSUBSCRIBE_INSTANTLY.ai`; `insert_unsubscribe_header = true`. Each footer reads **Gap Gambler · 5900 Balcones Drive, STE 100, Austin, TX 78731**. Presence was verified; live unsubscribe behavior was not tested by launching the campaign.

### Segment samples

Samples are evenly spaced within each segment in API ID order. Record suffixes identify the sample without publishing contact addresses or click hashes. Every row has host `gg-tourney-hub.vercel.app`, the displayed path, and a `c` parameter equal to SHA-256 of its normalized email. Full-population validation also found **0 URL mismatches**.

| Sample | Trader record suffix → `/go/email-trader` | Result | General record suffix → `/go/email-general` | Result |
|---|---|---|---|---|
| 1 | `54053327a6d4` | PASS | `277b15989fff` | PASS |
| 2 | `541bf2c7971e` | PASS | `27d079eb26de` | PASS |
| 3 | `54315dcf44cd` | PASS | `7d17186c00cd` | PASS |
| 4 | `5448ffe1f252` | PASS | `7d6c92f98cc8` | PASS |
| 5 | `545ea6798faa` | PASS | `7dc25a92252f` | PASS |
| 6 | `5475ea948405` | PASS | `7e185740abb6` | PASS |
| 7 | `548b1d6a999c` | PASS | `7e6d5d8a3dec` | PASS |
| 8 | `54a1e69ccca9` | PASS | `c8d5a093252b` | PASS |
| 9 | `54b8bb1fa869` | PASS | `c92a39ce2750` | PASS |
| 10 | `54cee274f024` | PASS | `c98021aeaca1` | PASS |

### Warmup history diagnosis

Authenticated production `/api/email` returned HTTP **200**, no live-data error, no history error, and five saved dates: **2026-10-06, 07, 08, 09, 10**. All five contain all eight GG accounts with score **100** and warmup **Active**. The live response supplies Oct 11, also **100/Active** for all eight. The current grid merges these live scores into the saved history.

| Date label | Saved snapshot | Visible measured inbox cells |
|---|---|---:|
| Oct 5 | None | 0/8 |
| Oct 6 | Yes | 8/8 |
| Oct 7 | Yes | 8/8 |
| Oct 8 | Yes | 8/8 |
| Oct 9 | Yes | 8/8 |
| Oct 10 | Yes | 8/8 |
| Oct 11 | Live response only at audit | 8/8 |

The first persisted snapshot was captured **Oct 6 at 17:13:15.073 UTC**, matching the repository's earlier first-write evidence in [GG_OUTREACH_DEPLOYMENT_REPORT.md](GG_OUTREACH_DEPLOYMENT_REPORT.md). There is no older saved row to populate Oct 5. The Oct 10 row was captured **Oct 11 at 00:35:10.737 UTC**. Vercel confirms the production snapshot cron is enabled at **`5 0 * * *`**; at the audit time its next nominal invocation is **Oct 12 00:05 UTC = Oct 11 20:05 EDT**, with possible Hobby scheduling delay. This next capture has not occurred yet. Historical log lookup returned no entries, so no additional failed-job cause is asserted.

The grid reads saved account scores; it does **not** reconstruct historical health from Instantly warmup traffic. The warmup API separately returns real sent/inbox/spam/received activity for **Oct 5–11 for all eight accounts**. That activity exists even where a dashboard score snapshot does not. Current adapter day keys use ET while the UI still labels them UTC; older saved rows predate that convention change. These are observed date labels, not proof of seven consistent UTC daily snapshots. No dashboard or snapshot code was modified under this task's limited fix scope.

## B. Applied changes and pending domain switch

### Copy and settings

Only the following campaign fields changed: `sequences` (two deadline sentences), `prioritize_new_leads` (set to `true`), and the provider's update timestamp. Readback compared all other preexisting campaign fields unchanged.

| Step | Subject, unchanged | Replacement for “First picks close Oct 16, 4 PM ET.” |
|---|---|---|
| 2 | You Can Still Join GG | Picks run daily through Nov 13 — join today and start your streak. |
| 3 | One Last GG Invitation | Daily picks run through Nov 13. The longest streak still wins $1,000. |

Step 1 is unchanged. Step 2 and Step 3 retain the **Oct 16 – Nov 13 tournament date range**, which is not a deadline, and all other text as requested. Step 3 therefore still contains the original “That first deadline doesn't close registration” wording; it was not rewritten beyond the authorized replacement. Each step has one variant. Day offsets remain **0 / 3 / 7**, with API delays **3 / 4 / 0 days**.

`prioritize_new_leads` is now **true**. Open and link tracking were already **false**. Stop on reply remains **true**. All limits, account attachments, warmup settings, and schedule remain unchanged.

The dashboard readiness predicate still requires the old Oct 16 deadline sentence in every step. The corrected copy no longer meets that predicate. A fresh production readback at **22:47 UTC** confirmed `ready = false`, with campaign status still **2 / Paused**. Changing that code is outside the explicitly permitted fixes.

### Production link domain

**PASS — domain added:** `go.gapgamblerteam.com` is attached to Vercel project **whoraised-leads-demo**, ID `prj_hmmvsjJtmK2Oour8oBpj3mBeMHL2`, with **no preview branch or custom environment binding** and no domain redirect. Production deployment is `dpl_J7bV5fJ35gCbkayeRGjdEZ8erAzb`, already serving the working `/go/` routes.

**FAIL — DNS/HTTPS readiness:** Vercel reports `misconfigured = true`, no CNAME, no A values. HTTPS requests to both new-domain paths fail with DNS **ENOTFOUND**. Project-domain `verified = true` is an ownership flag; it does **not** mean DNS is configured or HTTPS works.

**Rumman must add this ONE exact record at Spaceship for gapgamblerteam.com:**

| Type | Host / Name | Value / Target |
|---|---|---|
| **CNAME** | **go** | **cfb19666fbf7d3a7.vercel-dns-017.com.** |

This is the project-specific rank-1 target returned by Vercel. Use Spaceship's default TTL. No nameserver change or additional DNS record is requested.

**Pending:** the campaign still uses its working `gg-tourney-hub.vercel.app` links. No URL was switched before DNS verification. Once the new domain resolves, Vercel reports a valid configuration, and both HTTPS redirects pass, update the per-lead `registration_url` host to `go.gapgamblerteam.com` for **all 1,080 leads**, preserving segment paths and hashed `c` parameters. All three steps share this variable; there are no separate hardcoded segment links in the step bodies. This switch cannot be completed until the external DNS record is added and propagates.

| Redirect check | Result | Actual |
|---|---|---|
| Current host `/go/email-trader` | PASS | HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=trader`; `c` preserved. |
| Current host `/go/email-general` | PASS | HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=general`; `c` preserved. |
| New host `/go/email-trader` | FAIL | DNS **ENOTFOUND**; cannot confirm an HTTPS redirect. |
| New host `/go/email-general` | FAIL | DNS **ENOTFOUND**; cannot confirm an HTTPS redirect. |

The existing redirects do not set `utm_medium`; the three UTMs above are present and correct. Audit requests and preview links carry `test=1`, so their clicks are identifiable as test traffic. No signup was submitted.

### First-send capacity projection

**Conditional projection: Friday, October 16, 2026, approximately 13:00 EDT (America/New_York, UTC−04:00).** Assumptions: later-authorized start **Oct 12 at 09:00 ET**, all eight inboxes continuously available, **240 first sends/day**, seven-day schedule, new-lead priority enabled, and volume evenly paced across the eight-hour 09:00–17:00 window.

| Sending day | First sends | Cumulative | Remaining |
|---|---:|---:|---:|
| Mon Oct 12 | 240 | 240 | 840 |
| Tue Oct 13 | 240 | 480 | 600 |
| Wed Oct 14 | 240 | 720 | 360 |
| Thu Oct 15 | 240 | 960 | 120 |
| Fri Oct 16 | 120 | 1,080 | 0 |

`1080 / 240 = 4.5 sending days`; `240 / 8 = 30 first sends/hour`; the last 120 require four hours on day five. New-lead priority makes Step 1 precede due follow-ups while new leads remain. Daily capacity alone does not guarantee an exact delivery time: sender gaps, random waits, outages, or a later start can change it. If all 240/day are achieved, the fifth-day batch fits by **17:00 ET**. **While Paused, the actual completion date/time is undefined.** This estimate is not authorization to launch.

## C. Exactly three fresh preview tests

Following the authorized copy/settings fixes, `POST /api/v2/emails/test` was called **exactly once per step** for **rumman.co.uk1@gmail.com**, from `steve@gapgamblerteam.com`. Each returned HTTP success with **`{"status":"success"}`**. These are three fresh tests for this audit, separate from the earlier campaign-creation batch. A separate local ledger records each attempt before the request and prevents duplicate sends on rerun.

| Step | Subject | Segment used | Accepted at (UTC) |
|---|---|---|---|
| 1 | Join The GG Tournament | trader | 2026-10-11 22:43:58.739 |
| 2 | You Can Still Join GG | general | 2026-10-11 22:44:00.243 |
| 3 | One Last GG Invitation | trader | 2026-10-11 22:44:01.787 |

Local times are **October 12, 03:43:58–03:44:01 Asia/Karachi**. The timestamps record request attempts; all three responses were accepted. Registration variables were explicitly resolved with the recipient's SHA-256 hash and `test=1`, using the current working host because custom-domain DNS was pending. Subjects and footers were preserved. The native unsubscribe marker was passed through; no fabricated unsubscribe signature was introduced. Preview unsubscribe behavior is not a live unsubscribe verification. API acceptance does not independently prove Gmail inbox placement or receipt. No extra tests were sent.

## Validation, references, and handling

Validated campaign settings before and after the permitted PATCH, all eight account limits/warmup states, all 1,080 unique leads and segment hashes, all 3,240 template renderings, the 20 segment samples, the 30 name/status samples, production domain configuration, both working redirects, three preview responses, final zero campaign sends/contacts, and unchanged **100-credit** balance. No application source changes were made, so application build/test reruns were unnecessary.

Raw API responses, contact data, credentials, and send ledgers remain only in the ignored `.env.gg-campaign-work/` directory. Only this report is included in the audit commit; preexisting uncommitted application changes are left intact. No API keys, session cookies, database URLs, or full recipient-list data are included here.

Official references: [Campaign PATCH](https://developer.instantly.ai/api-reference/campaign/patch-campaign), [new-lead priority](https://help.instantly.ai/en/articles/6759494-how-to-prioritize-new-leads-over-follow-ups), [verification cost](https://help.instantly.ai/en/articles/6514690-how-to-verify-leads), [read-only verification status](https://developer.instantly.ai/api-reference/emailverification/check-an-email-verification-status), [preview test API](https://developer.instantly.ai/api-reference/email/send-a-test-email), [warmup analytics](https://developer.instantly.ai/api-reference/account/get-warmup-analytics), and [Vercel domain configuration](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

**NO-GO — custom-domain DNS/HTTPS and the dependent link switch remain pending; Instantly verification is not evidenced; the literal New_York timezone requirement is unmet. Keep the campaign Paused.**
