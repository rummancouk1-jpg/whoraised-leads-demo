# GG Tournament Oct — prelaunch audit

Audit date: **October 12, 2026, Asia/Karachi**. Initial API observations and tests: October 11, approximately 18:39–18:47 EDT (22:39–22:47 UTC), which is October 12 locally. A subsequent user-authorized domain switch and new test batch are recorded below. Eastern dates below use America/New_York.

Campaign: `e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef`, **GG Tournament Oct**. [Instantly campaign](https://app.instantly.ai/app/campaign/e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef/analytics).

**Safety rule satisfied:** API status remains `2` = **Paused**. No activate, launch, resume, or credit-purchase endpoint was called. Campaign analytics remain **0 sent, 0 contacted**. Preview tests are separate from campaign sends. The initial audit and domain follow-up spent no verification credits; the subsequently authorized targeted verification in section E consumed the existing **100 credits**, leaving **0**. Current campaign lead count: **986**.

## A. Read-only audit and final readback

FAIL includes a requirement that cannot be positively established. The initial audit was read-only, including the documented read-only `POST /leads/list` and `POST /accounts/warmup-analytics` endpoints. Only the changes in section B followed it.

| Item | Initial | After fixes | Actual value / evidence |
|---|---|---|---|
| 1. Schedule timezone: US Eastern | PASS | PASS | Saved timezone is **`America/Detroit`**, which uses the same US Eastern time and DST as **`America/New_York`** for this campaign. The user explicitly accepted this equivalence on October 12, 2026. The earlier literal-name failure is superseded; **no schedule or campaign setting was changed**. |
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
| 7. Trader routing | PASS | PASS | **10/10 sampled**, and **224/224 total**, have `/go/email-trader` with the correct per-email SHA-256 `c` value. Final host is **`go.gapgamblerteam.com`**, verified across all 224 trader leads. |
| 7. General routing | PASS | PASS | **10/10 sampled**, and **856/856 total**, have `/go/email-general` with the correct per-email SHA-256 `c` value. Final host is **`go.gapgamblerteam.com`**, verified across all 856 general leads. |
| 8. Original lead count 1,080 | PASS | PASS | Initially **1,080 distinct emails = 224 trader + 856 general**. The later authorized cleanup removed **94 verified-invalid leads**, leaving **986**; section E records the current population. |
| 8. Instantly verification evidence | FAIL | PASS — targeted scope | Initially no verification evidence. The user subsequently authorized the **400-lead strategy** in section E: **306 valid, 94 invalid removed**, no risky/catch-all/unknown results, **680 Gmail leads unverified**. This is not full-list verification. |
| 8. Verification cost / spend | PASS | PASS | Full 1,080 verification would cost **270 credits**. The authorized targeted **400 × 0.25 = 100 credits** was completed using the existing balance; **0 credits remain**. No credits or plans were purchased. |
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

Samples are evenly spaced within each segment in API ID order. Record suffixes identify the sample without publishing contact addresses or click hashes. Initially every row had host `gg-tourney-hub.vercel.app`, the displayed path, and a `c` parameter equal to SHA-256 of its normalized email. The completed domain follow-up changed only the host to `go.gapgamblerteam.com`, preserving these paths and hashes. Initial and final full-population validation found **0 URL mismatches**.

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

## B. Applied changes and verified domain

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

**PASS — DNS/HTTPS readiness after the follow-up:** the user reports adding the CNAME in **Namecheap**. Vercel now reports **configured-correctly**, `misconfigured = false`, `configuredBy = CNAME`, and the exact target below. Google and Cloudflare public DNS both resolve it. Initial HTTPS handshakes failed because a certificate was not yet present; `vercel certs issue go.gapgamblerteam.com` successfully created renewable certificate **`cert_0xxa7IfkXmaIMGH8vhFhicwW`**, with 90 days remaining at issuance. Both paths then passed HTTPS certificate validation and returned the required 302 redirects.

**The ONE DNS record, now confirmed configured:**

| Type | Host / Name | Value / Target |
|---|---|---|
| **CNAME** | **go** | **cfb19666fbf7d3a7.vercel-dns-017.com.** |

This is the project-specific rank-1 target returned by Vercel. The user's follow-up identifies Namecheap as the DNS provider. No nameserver change or additional DNS record was needed.

The two target registration paths are **`https://go.gapgamblerteam.com/go/email-trader`** and **`https://go.gapgamblerteam.com/go/email-general`**, with each lead's existing hashed `c` parameter retained. All three steps share `{{registration_url}}`; there are no separate hardcoded segment links in the step bodies. No lead URL was switched before DNS and HTTPS verification. The full-population update and readback are recorded in the follow-up section below.

| Redirect check | Result | Actual |
|---|---|---|
| Current host `/go/email-trader` | PASS | HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=trader`; `c` preserved. |
| Current host `/go/email-general` | PASS | HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=general`; `c` preserved. |
| New host `/go/email-trader` | PASS | Verified TLS, HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=trader`; `c` preserved. |
| New host `/go/email-general` | PASS | Verified TLS, HTTP **302** to `https://earningstournament.com`; `utm_source=email`, `utm_campaign=gg-oct`, `utm_content=general`; `c` preserved. |

Neither host's redirects set `utm_medium`; the three UTMs above are present and correct. Audit requests and preview links carry `test=1`, so their clicks are identifiable as test traffic. No signup was submitted. This machine's default DNS resolver retained its earlier negative response; successful HTTPS checks used Google DNS results corroborated by Cloudflare, retained the requested domain as hostname/SNI, and enforced normal TLS certificate validation. TLS validation was never bypassed.

### Original first-send capacity projection (before invalid-lead removal)

**Conditional projection: Friday, October 16, 2026, approximately 13:00 EDT (America/New_York, UTC−04:00).** Assumptions: later-authorized start **Oct 12 at 09:00 ET**, all eight inboxes continuously available, **240 first sends/day**, seven-day schedule, new-lead priority enabled, and volume evenly paced across the eight-hour 09:00–17:00 window.

| Sending day | First sends | Cumulative | Remaining |
|---|---:|---:|---:|
| Mon Oct 12 | 240 | 240 | 840 |
| Tue Oct 13 | 240 | 480 | 600 |
| Wed Oct 14 | 240 | 720 | 360 |
| Thu Oct 15 | 240 | 960 | 120 |
| Fri Oct 16 | 120 | 1,080 | 0 |

`1080 / 240 = 4.5 sending days`; `240 / 8 = 30 first sends/hour`; the last 120 require four hours on day five. New-lead priority makes Step 1 precede due follow-ups while new leads remain. Daily capacity alone does not guarantee an exact delivery time: sender gaps, random waits, outages, or a later start can change it. If all 240/day are achieved, the fifth-day batch fits by **17:00 ET**. **While Paused, the actual completion date/time is undefined.** This estimate is not authorization to launch.

After the 94 invalid removals, the same hypothetical start and uniform pacing put the last **26 of 986** first sends at approximately **October 16, 09:52 ET**. The campaign remains Paused, so this is also conditional.

## C. Initial audit: exactly three fresh preview tests

Following the authorized copy/settings fixes, `POST /api/v2/emails/test` was called **exactly once per step** for **rumman.co.uk1@gmail.com**, from `steve@gapgamblerteam.com`. Each returned HTTP success with **`{"status":"success"}`**. These are three fresh tests for this audit, separate from the earlier campaign-creation batch. A separate local ledger records each attempt before the request and prevents duplicate sends on rerun.

| Step | Subject | Segment used | Accepted at (UTC) |
|---|---|---|---|
| 1 | Join The GG Tournament | trader | 2026-10-11 22:43:58.739 |
| 2 | You Can Still Join GG | general | 2026-10-11 22:44:00.243 |
| 3 | One Last GG Invitation | trader | 2026-10-11 22:44:01.787 |

Local times are **October 12, 03:43:58–03:44:01 Asia/Karachi**. The timestamps record request attempts; all three responses were accepted. Registration variables were explicitly resolved with the recipient's SHA-256 hash and `test=1`, using the then-working Vercel host because custom-domain DNS was pending. Subjects and footers were preserved. The native unsubscribe marker was passed through; no fabricated unsubscribe signature was introduced. Preview unsubscribe behavior is not a live unsubscribe verification. API acceptance does not independently prove Gmail inbox placement or receipt. This initial batch was not repeated; the user's subsequent request authorizes a separate new batch using the verified custom domain.

## D. Custom-domain follow-up — completed October 12, 2026

Following the user's confirmation that the CNAME was added in Namecheap, DNS and HTTPS were verified **before any lead URL was changed**. Vercel's domain configuration passed, Google and Cloudflare DNS agreed on the CNAME, and a valid renewable TLS certificate was issued. The last HTTPS recheck at **2026-10-11 23:04:37.284 UTC** confirmed both segment paths returned **302** with valid TLS and the expected `utm_source=email`, `utm_campaign=gg-oct`, and segment-specific `utm_content`. Existing click hashes and `test=1` were preserved through the redirect.

**All 1,080 lead URLs were switched and read back successfully** at **2026-10-11 23:04:19.172 UTC = October 12 04:04:19 Asia/Karachi**:

| Segment | Verified lead count | Final registration URL pattern |
|---|---:|---|
| Trader | 224 | `https://go.gapgamblerteam.com/go/email-trader?c=<existing SHA-256 hash>` |
| General | 856 | `https://go.gapgamblerteam.com/go/email-general?c=<existing SHA-256 hash>` |

Only each lead's `registration_url` host changed. Readback confirmed the segment paths, all click hashes, names, other payload fields, all three step subjects/bodies, and every preexisting campaign setting were preserved; the provider's update timestamp may change. All **3,240 lead/step renderings** resolved without residual placeholders. The campaign's paused state was checked before the update, every 50 leads, after the full readback, before each test, and after the new test batch. Final status is **2 / Paused**, with **0 campaign sends**, **0 contacted leads**, and **100 verification credits available**.

As separately authorized by the follow-up, **exactly one NEW test per step** was sent to **rumman.co.uk1@gmail.com**, using the verified custom domain and the updated sequence. All three requests returned **`{"status":"success"}`**. A separate ledger prevents duplication of this new batch; the initial audit's tests were not rerun by their original script.

| Step | Subject | Custom-domain path used | Request time (UTC) | API result |
|---|---|---|---|---|
| 1 | Join The GG Tournament | `/go/email-trader` | 2026-10-11 23:04:38.792 | Accepted |
| 2 | You Can Still Join GG | `/go/email-general` | 2026-10-11 23:04:41.105 | Accepted |
| 3 | One Last GG Invitation | `/go/email-trader` | 2026-10-11 23:04:43.561 | Accepted |

These requests occurred **October 12 at 04:04:38–04:04:43 Asia/Karachi**. The recipient's hash and `test=1` were used in the test links. The native unsubscribe marker and Austin footer were preserved. API acceptance is confirmed; Gmail receipt/inbox placement was not independently inspected. No additional tests, activation, verification spend, or other campaign changes were made in this follow-up. The domain/link requirements now pass. The user subsequently accepted America/Detroit as equivalent US Eastern time, so the timezone requirement also passes without a settings change. Lead verification remains open.

## E. Targeted verification and invalid-only cleanup

Completed **October 12, 2026, 00:18:28 UTC / 05:18:28 Asia/Karachi**. The initial live API list contained **721 Gmail leads and 359 non-Gmail leads**. Gmail means the address domain is `gmail.com` or `googlemail.com`; custom domains, including Google Workspace addresses, are in the non-Gmail group and were fully checked.

The verification order was: one non-Gmail canary to confirm the **0.25-credit** charge, the other **358 non-Gmail leads**, then the **41-lead Gmail sample**. The first group finished before any Gmail verification request. Checks used documented API v2 `verify_leads_on_import` in isolated, non-sending lead lists. The campaign itself was never started. Verification-list results were mapped back to original campaign IDs and normalized emails before deletion; those lists remain available as verification evidence.

**Random sample seed:** `gg-oct-2026-10-12-a7a0c03c94f8b7b4c836f3094004778c`.

**Reproduction:** sort all 721 Gmail leads by the hexadecimal SHA-256 of `seed + "\n" + normalized email`, ascending; select the first 41. This is a seeded random ordering with no duplicate selections. Sample membership and raw responses remain in ignored private work files.

| Group | Verified | Valid | Invalid | Catch-all kept | Risky kept | Unknown kept | Invalid % |
|---|---:|---:|---:|---:|---:|---:|---:|
| All non-Gmail | 359 | 265 | 94 | 0 | 0 | 0 | **26.18%** |
| Random Gmail sample | 41 | 41 | 0 | 0 | 0 | 0 | **0.00%** |
| Total checked | **400** | **306** | **94** | **0** | **0** | **0** | 23.50% |

Only explicit `verification_status = -1` (**Invalid**) results were deleted. The deletion request specified **this campaign ID and the exact 94 original lead IDs**, with a limit of 94. Readback verified **986 remaining leads**, absence of every removed ID, preservation of every other lead and payload, and status **Paused**. No catch-all, risky, unknown, or unverified lead was removed.

**Result: valid 306 / removed 94 / kept-risky 0**; separately, catch-all kept **0**, unknown kept **0**, and **680 Gmail leads remain unverified**. Final campaign count: **986 = 306 verified-valid + 680 unverified Gmail**. Credit balance: **100 before → 0 after**, exactly **100 spent**; no credits purchased.

**Projection:** Gmail-sample invalid fraction = `0 / 41 = 0%`. Applying that fraction to the 680 unverified Gmail leads gives a **0% point estimate** for that remainder and `680 × (0/41) / 986 = 0%` for the remaining campaign overall. These are verification-based proxies for delivery bounces, not observed bounce rates. A 41-lead sample with zero invalids does not prove zero bounce risk; valid addresses can also bounce for reasons verification does not capture. The requested **point-estimate >3% stop gate did not trip**, so the bounce brake was implemented.

## F. Pause-only bounce brake

**Deployed:** production `dpl_FRKC4qKJM6zpA8PKmfaSgp3Xj9Hv`, serving [the Email view](https://gg-tourney-hub.vercel.app/email).

`POST /api/cron/bounce-brake` requires `Authorization: Bearer <GG_BOUNCE_BRAKE_SECRET>`. A dedicated sensitive secret was installed in Vercel Production and GitHub Actions without putting its value in source, workflow content, screenshots, or this report. Proxy and route both enforce authorization. The endpoint is fixed to **GG Tournament Oct**, checks its configured campaign ID and production environment, and obtains uncached `emails_sent_count` and `bounced_count` from Instantly API v2 campaign overview. Missing, fractional, negative, or impossible counters fail rather than becoming zero.

Automatic checks call `POST /api/v2/campaigns/{id}/pause` only when **sent ≥50 AND bounced/sent >0.03** and verify status `2` afterward. The separately requested one-time auth proof is allowed only while the campaign is already Paused and is logged separately from breaches. A database lease prevents overlapping checks. Every check is recorded in the existing `gg_internal_audit` table; a threshold breach is recorded before the pause request and updated after confirmation. Failed/unconfirmed pauses remain visible as red alerts. Repeated checks of the same already-confirmed paused breach do not send duplicate pause calls. **There is no resume operation. Only Rumman resumes in Instantly.**

`GET /api/email/bounce-brake` requires the existing authenticated dashboard session. Email polls it every 30 seconds and displays the stored breach as a red alert with counts, rate, time in ET, and the instruction that only Rumman resumes. Unavailable, failed, or overdue recorded checks also show a warning. This brake reads Instantly directly; it does not depend on the separate lead-pagination sync, whose existing warning was visible during visual QA.

### Free 15-minute scheduler

Vercel reports **Hobby**, which allows daily rather than 15-minute crons. The repository is **public**, GitHub Actions is enabled, and a standard `ubuntu-latest` runner is free for public repositories. The installed [GG bounce brake workflow](https://github.com/rummancouk1-jpg/whoraised-leads-demo/blob/main/.github/workflows/gg-bounce-brake.yml) runs at **:07, :22, :37, :52 each hour**, with a secret header, no checkout, no token permissions, a three-minute timeout, and concurrency control. The workflow is installed on the default branch (`main`), as required for scheduled events. GitHub schedules are best-effort and may be delayed; this is not an exact 15-minute execution SLA.

The scheduler-only default-branch commit is **`9c9ed4a0020a266c97388023b09ba2a37a5b5c89`**. A temporary Vercel Ignored Build Step matched only that exact commit message, preventing the older main application checkout from replacing production. GitHub's Vercel status confirmed **“Canceled by Ignored Build Step”**; the previous ignore setting (`null`) was then restored. The current application was deployed separately from the working checkout. No plan upgrade or paid runner was used.

### Proof

| Check | Result | Evidence |
|---|---|---|
| 49 sends, rate above threshold | PASS — no pause | Unit test `shouldPauseCampaign(49, 0.5) = false`. |
| 50 sends, exactly 3% | PASS — no pause | Unit test `shouldPauseCampaign(50, 0.03) = false`. |
| 50 sends, 3.1% | PASS — pause | Unit test `shouldPauseCampaign(50, 0.031) = true`. These rate-boundary tests are conceptual; live bounced counts must be integers. |
| 0 sends | PASS — no pause | Unit test `shouldPauseCampaign(0, 0) = false`. |
| Real integer counter boundaries and malformed input | PASS | 100/3 does not trip; 100/4 trips; unavailable, fractional and impossible counters throw. |
| Missing / incorrect bearer | PASS | Both live requests returned **401**. |
| Live pause API auth on already-paused campaign | PASS | Production proof at **2026-10-12 00:26:35 UTC** returned **HTTP 200**, `authProof=true`, sent **0**, bounced **0**; status remained **2**. A persistent proof ledger permits the native pause request only once and does not create a false breach alert. |
| Red alert at 390 / 820 / 1440, normal and reduced motion | PASS — **6/6** | Captures and geometry checks in local `evidence/gg-bounce-brake/`; all visually inspected for wrapping, clipping and overflow. Reduced-motion alert has no animation or transition. |
| GitHub runner → live endpoint, secret and network path | PASS | [Manual connectivity run 38188781910](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/38188781910), October 12 00:38:29 UTC, succeeded with `ok=true`, sent/bounced **0/0** and `authProof=false`. This did not issue another native pause and is **not** scheduled-run proof. |
| Genuine scheduled invocation | **FAIL — required proof unavailable** | As of **October 12 01:11:26 UTC / 06:11:26 Asia/Karachi**, GitHub's workflow-runs API reports **0 runs with event `schedule`**, although the workflow is `active`. No event was observed after the configured **00:37, 00:52, or 01:07 UTC** slots, more than 45 minutes after installation. The successful manual run is not scheduled-run proof. |

UI proof uses a clearly labeled **browser-only fixture: 200 sent / 10 bounced (5%)**. No fake campaign send, bounce, or production alert was created. Source, TypeScript, production build, threshold tests, live endpoint protection, and the already-paused auth proof passed. Local [UI results](../evidence/gg-bounce-brake/ui-results.json) list all six captures, including [390 px reduced motion](../evidence/gg-bounce-brake/alert-390-reduce.png), [820 px reduced motion](../evidence/gg-bounce-brake/alert-820-reduce.png), and [1440 px reduced motion](../evidence/gg-bounce-brake/alert-1440-reduce.png). These artifacts are intentionally retained under the repository's ignored evidence directory.

**Remaining blocker:** the free GitHub scheduler is configured and the authenticated runner-to-endpoint path is proven, but an actual automatic invocation has not been observed. GitHub's public status API reported Actions operational and no active incidents; the cause of this timer delay is not established. There is no scheduled-run log to present. The workflow remains installed and active, and the audit cannot mark the automatic bounce brake fully proven until a successful `schedule` event appears. Final live readback at **01:11:26 UTC** confirmed **986 leads, status 2 / Paused, 0 sends, 0 bounces, 0 credits remaining**.

Official scheduler references: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [GitHub public-runner billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Verification references: [bulk import verification flag](https://developer.instantly.ai/api-reference/lead/add-leads-in-bulk-to-a-campaign-or-list), [0.25-credit verification pricing](https://help.instantly.ai/en/articles/6514690-how-to-verify-leads).

## Validation, references, and handling

The initial audit and domain follow-up validated settings, all eight inboxes, the original 1,080 leads and segment hashes, 3,240 template renderings, sample data quality, redirects and the two separately authorized three-test batches. Targeted verification subsequently checked 400 leads, removed exactly 94 explicit invalids, and verified the final 986-lead population and 100-credit spend. The bounce-brake work passed TypeScript, the production build, both unit tests (including all requested boundaries and malformed counters), live authorization checks, the single already-paused native pause proof, and six visually reviewed UI cases. Both custom-domain redirects were rechecked after deployment and still pass with their UTMs and click hashes.

Raw API responses, contact data, credentials, and send ledgers remain only in the ignored `.env.gg-campaign-work/` directory. The new commit includes bounce-brake source, workflow, tests, UI verification script, empty environment-variable documentation, and this report. Preexisting uncommitted application changes are left intact; only the new alert import/render is staged from the already-modified Email view. Local QA captures stay in ignored `evidence/gg-bounce-brake/`. Staged files are scanned against known credentials; no API keys, bearer secrets, session cookies, database URLs, or full recipient-list data are committed.

Official references: [Campaign PATCH](https://developer.instantly.ai/api-reference/campaign/patch-campaign), [new-lead priority](https://help.instantly.ai/en/articles/6759494-how-to-prioritize-new-leads-over-follow-ups), [verification cost](https://help.instantly.ai/en/articles/6514690-how-to-verify-leads), [read-only verification status](https://developer.instantly.ai/api-reference/emailverification/check-an-email-verification-status), [preview test API](https://developer.instantly.ai/api-reference/email/send-a-test-email), [warmup analytics](https://developer.instantly.ai/api-reference/account/get-warmup-analytics), and [Vercel domain configuration](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

**Prior verdict at 01:11 UTC: NO-GO pending scheduler evidence. Superseded by section G below.**

## G. cron-job.org scheduler and staleness guard

Verified **12/10/2026, 16:00:53 Asia/Karachi**. Production deployment **dpl_Fp2RWLRT2dQaZnKzTir4DCdGHSKH**. Campaign remains **2 / Paused, 0 sent, 0 bounced**; no activation or preview sends were performed.

**outreach-cron #14:** our 12-page safety budget returned HTTP 502 with “Instantly pagination is incomplete”; this was a saved continuation, not evidence of an upstream outage. [Run #14](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/38186354660) stopped at 00:00:40 UTC; [run #15](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/38210504406) completed that checkpoint at 06:01:13 UTC. A typed continuation now returns **HTTP 202 / pending=true**, retaining previous complete data and recording PENDING with ok=NULL. It does not refresh sync health or suppress actual provider failures. [Live validation run #16](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/38236242404) passed with the pending response at 10:25:44 UTC.

### Endpoint and backup

cron-job.org calls **POST https://gg-tourney-hub.vercel.app/api/cron/bounce-brake every 15 minutes**. Required header: **Authorization**, value **Bearer followed by the existing GG_BOUNCE_BRAKE_SECRET**. Its exact value was printed only in the local chat for Rumman and is excluded from source and this audit. Optional attribution header: **X-GG-Trigger: cron-job.org**; the service user agent is also recognized. GitHub's existing workflow and secret remain installed as backup. One GitHub schedule ran at 06:23:31 UTC; its previous manual check was at 00:38:34 UTC, a gap of approximately 5h45m. This establishes sparse execution, not a proven GitHub incident cause.

A database lease serializes checks. Successful nonempty run IDs replay without provider calls or new audit rows; checks within 60 seconds of a successful check are quick no-ops. Skips never advance the successful-check timestamp. Due checks still read current campaign status and uncached bounce counters and append a real observation even if counters have not changed. A confirmed already-paused campaign never receives another native pause call, including changed counters or recovery from an interrupted confirmation. There is no resume path.

Live protection: missing and wrong bearer **401**. Full check **859 ms**, successful replay **377 ms**, frequent no-op **381 ms**; the three authorized calls added **one** audit row. Last-success history is queried independently from the latest attempt.

### Three consecutive automatic checks

The following are durable gg_internal_audit rows with kind=gg-bounce-brake-run and trigger=cron-job.org. Manual calls, the earlier user test, and GitHub runs are excluded. Each recorded ran=true and ok=true.

| Audit row ID | UTC check time | Asia/Karachi check time | Successful | Campaign status | Sent/bounced |
|---|---|---|---|---|---|
| 72 | 2026-10-12T10:30:21.440Z | 12/10/2026, 15:30:21 | true | 2 | 0/0 |
| 73 | 2026-10-12T10:45:16.105Z | 12/10/2026, 15:45:16 | true | 2 | 0/0 |
| 74 | 2026-10-12T11:00:30.399Z | 12/10/2026, 16:00:30 | true | 2 | 0/0 |

Adjacent gaps: **14.92 and 15.23 minutes**. Proof was read directly from production storage; no synthetic rows or bounce counts were inserted.

### Email guard and validation

The Email view always displays **Bounce brake · Last checked** using the last successful check, in PKT. While the campaign is active (status 1 or 4), an absent, invalid, or **older-than-30-minute** successful check displays the red **“Bounce brake not running”** alert. A newer failed attempt cannot reset the clock. The view reevaluates every 30 seconds, including when history reads fail, and reports unavailable checks separately while paused.

**PASS:** TypeScript, production build, ESLint, **14 targeted tests**, and **18 independent replay checks**. Actual server-module tests cover repeated IDs, the short cooldown, overlapping requests, already-paused changed metrics, interrupted pause confirmation, and preserved last success after a newer failure. Pagination regression proves 202 handoff, no partial publish, resumed success, and unchanged 502 for actual 401/403/500 provider failures.

**PASS: 12/12 production-browser UI captures**, covering breach and active/stale alerts at **390, 820, 1440 px**, each with normal and reduced motion. All captures were visually inspected; geometry asserts no clipping or horizontal overflow, red error color, and no alert animation/transition in reduced motion. Browser-only fixtures also verify stale paused, missing-success active, and fresh active behavior. No production campaign was made active for UI testing. Evidence is retained locally under evidence/gg-bounce-brake/.

Only this task's code, tests, verification script, and audit are committed. Existing unrelated workspace changes remain unstaged, including other edits in the shared Instantly adapter. Staged content is checked against local credentials and database-URL patterns; secret values and raw private evidence are excluded.

**GO — the requested bounce-brake scheduler and staleness gates pass. Campaign remains PAUSED; this verdict does not activate it.**
