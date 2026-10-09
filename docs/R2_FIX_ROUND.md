# R2 independent-audit fix round

10 October 2026 (Pakistan time), branch `design/elevation`, verified application commit `5fd0fa9`, Lighthouse policy/workflow commit `9725619`. Preview only; no promotion or production writes. All 27 findings are addressed within the verification scope below; all five gates pass under the explicitly accepted auth-gated crawlability exception. This report supersedes preparation status, not the original audit's historical findings. Final aggregate: `evidence/r2-fix/release-gates.json`.

Preview: https://whoraised-leads-demo-r6q3sfl03-rummancouk1-9706s-projects.vercel.app

## Gates

| Gate | Result | Evidence under `evidence/r2-fix/` |
|---|---|---|
| Permanent real-code replay | **18/18 PASS** | `replay/replay.json`; `tests/r2-replay.spec.ts:4` |
| Full matrix / axe | **36 configurations, 1,206 checks PASS; axe 0** | `matrix-complete/summary.json`, `matrix-complete/{chrome,edge,webkit}/matrix.json`; 360 axe scans, zero failures/runtime/asset errors; actual stale/failed fixtures and multi-day History included |
| Off-machine Lighthouse, all four categories >=90 | **PASS with accepted is-crawlable exception; SEO 100** | Successful Actions [37981135881](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/37981135881), `offmachine-auth-gated/medians.json`; mobile performance 93/99/100, desktop 100/100/100, accessibility/best practices/SEO 100 |
| All tests | **23/23 PASS**, PostgreSQL **7/7 PASS** | `final-tests.log`, `postgres-contracts.json`; build passes, lint 0 errors / 16 warnings; added strict crawlability-exception regression contract |
| Production preservation | **13/13 counts and hashes unchanged** on final preview | `production-before.json`, `isolation-proof.json`; actual preview HTTP PATCH observed directly on child and restored |

**Accepted exception:** the user approved skipping only `is-crawlable` for auth-gated apps. `scripts/r2/lighthouse-policy.mjs` centralizes that rule; the runner enables it only after anonymous requests to all three measured pages and `/api/leads` return 401, and authenticated data access succeeds. Every remaining scored SEO audit must pass on **every run**, not merely achieve a passing median; a missing/error/failing audit or an additional skip fails the gate. Lighthouse's unscored `structured-data` manual review remains listed separately and is not represented as an automated pass. No privacy header was removed or login-shell score substituted; no promotion occurred.

The original unexcepted SEO 66 reports remain in `offmachine-release/` and failed Actions [37956763508](https://github.com/rummancouk1-jpg/whoraised-leads-demo/actions/runs/37956763508). Their sole failed SEO audit was `is-crawlable`: the authenticated workspace intentionally blocks indexing, and Vercel adds `X-Robots-Tag: noindex` to preview URLs ([official documentation](https://vercel.com/docs/headers/response-headers)). The new scores below explicitly include the approved exception.

| Authenticated page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO |
|---|---|---|
| Home | 93 / 100 / 100 / 100* | 100 / 100 / 100 / 100* |
| Pipeline | 99 / 100 / 100 / 100* | 100 / 100 / 100 / 100* |
| Email | 100 / 100 / 100 / 100* | 100 / 100 / 100 / 100* |

*SEO excludes only `is-crawlable`, with the exception recorded in each raw run and aggregate artifact. Each median contains three runs on an Ubuntu GitHub Actions runner, 18 signed-in runs total. All nine remaining scored SEO audits pass in all 18 runs (162 successful checks). No current category median is below 90. Home's remaining unused/legacy JavaScript opportunities are retained in raw reports. `tests/lighthouse-policy.spec.ts` rejects extra skips and exercises every remaining scored audit with failed, partial, errored and missing results.

Additional final-preview checks: security **109**, failure UX **8/8**, real HTTP/Neon attribution **5/5**, PWA **22/22**, client secret scan **26 files / 16 scoped secret values / zero matches**. Captured artifacts disclose earlier failed attempts and their corrections; those failures were not silently omitted from history. The final production proof at 19:21 UTC on 9 October (00:21 Pakistan time on 10 October) matches the original 08:20 UTC preflight.

## Six BLOCKERS

| ID | Fix | Implementation / evidence | State |
|---|---|---|---|
| B1 | Dedicated Neon branch/endpoint and rotated child-only credentials; split all 15 Preview/Development DB aliases; reject production host; retire obsolete previews. | `src/lib/server/db.ts:11`; `scripts/r2/isolate-preview.mjs`; `isolation.json`, `retired-previews.json` (11), `isolation-proof.json` (13 unchanged). Child `br-raspy-fog-b7rr7e4r`, endpoint `ep-falling-river-b7nhb5ah`; production `ep-cold-mountain-b7gxzsro`. | Fixed |
| B2 | Persist page cursor/state after every page; resume bounded chunks; fail cycles/caps instead of publishing partial data. Atomically publish complete absolute stats/events and clear checkpoint under owned lease. | `src/lib/server/instantly.ts:138`, `src/lib/server/sync.ts:38`; replay 18/18, 120-page resume test, PostgreSQL rollback/lease 7/7. | Fixed |
| B3 | Normalize numeric auto-reply flags, compare actual reply/contact times, include null-campaign manual answers for selected lead addresses. | `src/lib/instantly-map.ts:65`, `src/lib/activity.ts:55`, `src/lib/server/instantly.ts:147`; all three independent reply replay cases pass. | Fixed |
| B4 | Signed click identity/test state reaches signup; FK joins actual same-slug click; launch filter covers both sides. Preview links use preview origin and preview visits are forced test. | `src/lib/server/attribution-token.ts:6`, signup route, `src/lib/server/activity.ts:30`; `preview-attribution.json` five real HTTP/Neon checks. | Endpoint fixed; external sender unverified |
| B5 | Client health ages with time and reflects read/offline failure; stale/failed/never-synced data cannot say clear; retry recovers; manual sync reloads persisted attempt. | `src/contexts/ActivityContext.tsx:33`, `src/components/outreach/NeedsAction.tsx:31`; `failure/results.json` **8/8**. | Fixed |
| B6 | Authenticated Actions workflow, Vercel bypass, three mobile/desktop passes on each of three pages, redacted artifacts and four-category gate with only the user-approved crawlability exception. Lazy-load overlays and reduce CLS. | `.github/workflows/r2-preview-lighthouse.yml:1`, `scripts/design/lighthouse.mjs`, `scripts/r2/lighthouse-policy.mjs`, `scripts/r2/lighthouse-medians.mjs`; successful deciding run linked above. | Fixed; **PASS with accepted exception** |

## 21 SHOULD-FIX items

| ID | Fix / source | Evidence |
|---|---|---|
| S1 | Atomic owner-bound lease; hold row throughout final transaction across expiry. `src/lib/server/lease.ts:4`, `src/lib/server/sync.ts:48`. | Replay concurrent single entrant; real PostgreSQL 20 contenders, stale release rejected, successor blocked through commit. |
| S2 | Durable shared provider budgets, bounded Retry-After/backoff, cancellation, resumable chunks. `src/lib/server/instantly.ts:15`, `src/lib/server/limits.ts:4`. | Actual-code 429/cursor cases, 120-page resume, 20-way PostgreSQL budget permits five. |
| S3 | Missing/ambiguous campaign fails without refreshing success or displaying old stats as current. `src/lib/server/sync.ts:34`, `src/lib/server/activity.ts:49`. | Replay no-campaign case; actual scheduler run `ok=false` / no selected campaign, `scheduled-runs.json`. |
| S4 | Unknown opens/clicks stored explicitly; human replies only from validated events. Mapper / `src/lib/server/activity.ts:14`. | Replay missing-field and numeric-auto-reply contracts. |
| S5 | Query chronological stored events alongside labelled milestones. `src/lib/server/activity.ts:53`, LeadTimeline. | Multi-day replay checks events/order; matrix timeline interaction/retry/axe/overflow. |
| S6 | Today uses America/New_York, including DST; provider batch dates retain UTC labels. `src/lib/server/instantly.ts:8`. | Replay 00:30 UTC produces previous ET date; digest ET-window tests. |
| S7 | Raw-body HMAC, five-minute timestamp/nonce, strict validation and unique signup ID/nonce. `src/lib/server/attribution-token.ts:23`, signup route. | Permanent tampered/expired/null/replay cases; deployed tampered 401 and duplicate no-op. |
| S8 | Atomic weekly claim, Resend idempotency key, ten-minute cooldown, 23-hour bounded ambiguous retry; disabled delivery has no audit writes. `src/lib/server/digest.ts:64`. | Concurrent real-code replay produces one fake delivery; disabled-write contract. Real mail not sent. |
| S9 | Child-only Neon function with enabled 15-minute sync and Monday ET-window digest triggers targeting immutable preview. `functions/r2scheduler.mjs`, `scripts/r2/configure-ci.mjs`. | `scheduler.json`, `scheduled-runs-final.json`: actual quarter-hour cron runs after final retarget, through 19:15 UTC; branch-only GitHub cron is not claimed active. |
| S10 | Shared 44px token across widths/all controls; shared anchor primitive supports WebKit Tab. `src/app/globals.css:448`, `src/components/ui/AccessibleLink.tsx`. | Final 36-config matrix, 1,206/1,206 checks, all targets/overflow/actual Tab checks pass. |
| S11 | Capture opener before touch blur, restore after inert cleanup, reveal focus above navigation centrally; portal/bound tooltips. `src/hooks/useFocusTrap.ts:9`, RelTime. | Drawer/dialog/palette exact opener, Tab/Shift-Tab/Escape assertions pass in all 36 final configurations, including multi-day History. |
| S12 | Visible retry and abortable digest/timeline reads; reset old lead state on slug change. DigestPreview:19, LeadTimeline:19. | Matrix 503, retry/recovery, targets and axe checks. |
| S13 | Health requires DB plus fresh success; timestamped occurrences replace lifetime error counts. `src/lib/server/ohq.ts:20`, `src/lib/server/errors.ts:19`. | Read-model tests; 24-hour occurrence query; monitoring writes isolated. |
| S14 | Expected version/stage compare-and-swap rejects stale edits/undo with 409. `src/lib/server/leads.ts:41`, OutreachContext. | Real PostgreSQL coworker edit and stale undo rejected; newer stage retained. |
| S15 | Durable atomic login/sync/click/webhook/error budgets; bounded stream bodies; browser mutation origin checks. `src/lib/server/limits.ts:4`, `:16`, routes. | PostgreSQL contention; **109 deployed security checks**; signed webhook HTTP contract. |
| S16 | Proxy signature check; private page/route DB revocation under 1.5s; initial reads cancel at 2.5s; fresh per-query signal. Auth:33, DB:5, initial-status:19. | Revoked cookie 401; real PostgreSQL reused-client timeout; build/type checks. |
| S17 | Plain operational copy; live zero-signup distinction; no raw credential-variable copy or pre-auth names. DigestPreview, auth route, timeline. | Pre-auth name scan; live-empty replay; screenshots. |
| S18 | Permanent auditor replay and large-page/signature/unknown/observation-age tests; real PostgreSQL contention/rollback/CAS. `tests/r2-replay.spec.ts:4`, `tests/r2-extra.spec.ts:3`. | **18/18** replay, **23/23** suite, **7/7** PostgreSQL. |
| S19 | Shared caught/timeout logout with retry; serialize worker registration/cleanup; unregister before acknowledgment; login finishes interrupted cleanup. useLogout, session-navigation, PwaRegister, Login. | Offline nav/palette failure contracts; permanent registration/logout ordering test; final PWA **22/22**. |
| S20 | Weekly conversions use same seven-day click/signup cohort; label weekly outcomes/campaign totals. Digest:16/:47, activity:26. | Replay weekly query/model; exact authenticated digest preview. |
| S21 | Lazy overlays, server data reuse, reserved board layout, request clock matching hydration, no overlapping polls. Workspace/UIHost/BoardSkeleton/RelTime. | Final off-machine performance >=90 on all six page/device medians; request-clock fix reduced measured CLS .239 to approximately .001. |

NICE N2 fixed: awaited/caught static cache writes. N3 fixed: historical audit includes every interactive candidate/all widths. N1 deeper boundary validation/provider selection consolidation remains deferred as nontrivial. No application `any`/ts-ignore escape added; 16 existing lint warnings disclosed.

## Isolation, writes and compatibility

Production preflight: `2026-10-09T08:20:38.695Z`, 13 tables. The proof compares both sides of a real child write to that original baseline. Production connections are SELECT-only/read-only transactions. Production deployment remains `dpl_FEgtY5hp3MaM9XyxBD1AnRByPbem`.

All writes use guarded `database()`: sessions/login budgets; CSV import/replace/archive; edits/undo; clicks/signup; snapshots; sync lease/checkpoint/stats/events/ledger; digest claim/audit; error fingerprints/occurrences; monitoring canary/request budgets. Cron/tab/manual/webhook use the child. Saved views are browser-only. Preview mail is disabled.

Schema adds tables, nullable/defaulted columns and indexes without removing/renaming existing fields. Unknown flags preserve old numeric-column compatibility. Initialization retains an existing click-classification **data backfill**, so it is not DDL-only; it ran only on the child. R1 source structurally tolerates ignored additions. Exact live-production source came from a dirty checkout and cannot be attested; no R2 schema was applied to production.

Eleven old nonproduction deployments retained shared DB config and were retired after target/ID/cutoff checks. Project env updates alone do not secure old immutable previews. New previews are fresh deployments, not redeploys retaining old env.

## Scope and claims still unverified

- UI matrix: authenticated preview/real lead reads, explicit HTTP fixtures for absent busy/stale/failure activity, mutations blocked; 36 browser/width/motion/appearance combinations; all R2 surfaces, targets, overflow, truncation records, actual Tab traversal, dialogs and axe. Fixtures do not prove live provider data.
- Replay executes real provider/mapper/sync/activity/webhook/digest code with deterministic HTTP/SQL transport; PostgreSQL tests separately prove locks/rollback. Live populated-campaign reconciliation, eight-inbox equality and current production key scopes remain unverified: the workspace has no selected campaign.
- External preregistration sender is outside this repo. Endpoint tests do not certify its production integration. Retain `gg_click` and `test=1`; send `{id,slug,click_token,at}` with bearer and raw-body HMAC over `timestamp.nonce.body`, headers `x-gg-timestamp`, `x-gg-nonce`, `x-gg-signature`; secrets server-side only.
- Actual mail delivery stays disabled/unverified; replay uses fake provider delivery. OHQ registry/alert delivery, historical research/contact/provenance and all 52 copies are not re-certified.
- Playwright WebKit is not physical Safari/iOS. Chromium offline navigation is tested; active-worker WebKit offline emulation crashes the test engine, so evidence there covers precaching/cleanup. No actual prolonged DB outage induced.
- Exact production-bundle secret absence/live-source compatibility is unverified. Final local client bundle is scanned against both preview and read-only production secrets. No quiet-machine local claim or fresh R1 comparison; Actions is the deciding measurement.

Evidence is git-ignored and retained locally; redacted Lighthouse artifacts also live in Actions. No secret values appear here.
