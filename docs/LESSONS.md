
## 7 October 2026 — GG outreach demo pass

- Register a clean Vercel alias as a production project domain. A manual deployment alias initially inherited Vercel SSO; check with a fresh unauthenticated session before sharing.
- Begin each creator list with source_url_live, contact_source_url, us_trader_fit, fit_evidence and verified_at. Load every primary page afresh. A 200 application shell or a generic social DM does not prove fit or a business contact.
- Verify official channel links. Guessed handles resolved to unrelated channels for several replacement candidates. Use a confirmed channel ID or official linked handle.
- Reject personal-looking email addresses and customer-only support routes. Prefer explicit sponsorship/partnership addresses and published company inquiry forms. Verify that an advertised form actually renders.
- Record unknown audience size when the checked source publishes none. Do not carry forward unsupported newsletter counts. Disclose shared owners across platform rows and coordinate outreach once per owner.
- Store example-/test- slug clicks and ?test=1 requests as is_test at insertion. Backfill identifiable legacy fixtures, filter before every aggregation, and keep tests behind a separate toggle. Protect real group conversions and suggested weights from fixture leads.
- Merge audit research into current records atomically, preserving stage, signups, last_touch and notes. Archive removals; verify against the original snapshot, not merely the last import.
- Capture after shared leads finish loading. The first pipeline screenshots caught only the loading state; corrected waits now prove the populated board. Test each browser, viewport and reduced-motion combination separately.
- Read the status strip from timestamped Instantly/workspace data. Do not hide existing unsent drafts, invent campaign status labels, or supply placeholder warmup/queue/click numbers.
- One natural mobile click is enough for the real redirect proof. Retain that evidence across screenshot reruns so QA does not generate additional real clicks.

## 7 October 2026 — GG outreach demo pass

- Register a clean Vercel alias as a production project domain. A manual deployment alias initially inherited Vercel SSO; check with a fresh unauthenticated session before sharing.
- Begin each creator list with source_url_live, contact_source_url, us_trader_fit, fit_evidence and verified_at. Load every primary page afresh. A 200 application shell or a generic social DM does not prove fit or a business contact.
- Verify official channel links. Guessed handles resolved to unrelated channels for several replacement candidates. Use a confirmed channel ID or official linked handle.
- Reject personal-looking email addresses and customer-only support routes. Prefer explicit sponsorship/partnership addresses and published company inquiry forms. Verify that an advertised form actually renders.
- Record unknown audience size when the checked source publishes none. Do not carry forward unsupported newsletter counts. Disclose shared owners across platform rows and coordinate outreach once per owner.
- Store example-/test- slug clicks and ?test=1 requests as is_test at insertion. Backfill identifiable legacy fixtures, filter before every aggregation, and keep tests behind a separate toggle. Protect real group conversions and suggested weights from fixture leads.
- Merge audit research into current records atomically, preserving stage, signups, last_touch and notes. Archive removals; verify against the original snapshot, not merely the last import.
- Capture after shared leads finish loading. The first pipeline screenshots caught only the loading state; corrected waits now prove the populated board. Test each browser, viewport and reduced-motion combination separately.
- Read the status strip from timestamped Instantly/workspace data. Do not hide existing unsent drafts, invent campaign status labels, or supply placeholder warmup/queue/click numbers.
- One natural mobile click is enough for the real redirect proof. Retain that evidence across screenshot reruns so QA does not generate additional real clicks.

## 7 October 2026 — R2 creator audit correction

- This correction supersedes the earlier instruction to reject personal-looking addresses. A named address published by its owner for contact/business/media/sponsorship is valid on any domain. Customer-support-only and inferred addresses still fail.
- Strict contact-form or generic-role-address rules bias lists toward corporations. Start from people and communities who could plausibly say yes to a free contest.
- Platform-native routes count: Substack owner messaging, Reddit modmail and published Discord moderator contact. Save the actual platform URL and confirm ownership/contact scope.
- Crawler failure ≠ unfit. Save blocked attempts separately and verify Reddit descriptions, subscribers and promotion rules through old.reddit.com or about.json. Permission requests are not permission to post.
- Padding with unreachable big names is worse than a shorter list. Separate potential tool sponsors; archive major media, brokers, exchanges and ad-sales-only targets as paid-media only.
- Rule 4 is permanent in scripts/import-csv.mjs through audited-csv-gate.mjs and contact-evidence-gate.mjs: real imports require matching sidecars and saved HTML containing the email or actual form; homepages, video tabs and redirects to them fail. Stripping audit columns does not bypass the check.
- Unknown audience is not zero readers. Explicitly label the numeric sentinel and state a reason for including audiences under 5k.
- Merge only research/contact fields into live JSON, archive before deletion and verify workflow preservation against captured DB state. Test all Chrome/Edge viewport and reduced-motion combinations after shared data loads.

## Pre-send polish — 7 October 2026

- Derive outreach tiers from configurable reach and the row’s own fit evidence. Unknown reach is a sentinel, not zero readers; exactly 1,000 passes the reach boundary unless its fit line flags geographic mismatch or uncertainty.
- Apply the same tier scope to summaries, group conversion metrics and daily/total click analytics. Daily click aggregates need slug attribution before they can be filtered honestly.
- Keep workflow fields and exports intact; a reversible display toggle should not archive or mutate leads. Compare all DB fields before/after.
- Gate the deployed alias in Chrome and Edge with exact DB membership, normal/reduced motion, page overflow and measurable next-column peeks. Check the status text after shared data loads.


## Pre-client audit — 2026-10-08

- Filter provider account lists to the client workspace; unrelated inboxes must not affect metrics or appear in history.
- Persisted optional research fields belong in CSV backup contracts; assert complete server-record equality through export and re-import.
- Use owner-level outreach deduplication and preserve evidence/history when consolidating channel surfaces.
- Record source transport failures independently of saved contact provenance; generic HTTP-200 pages are not valid substitutes.
- Verify click UA classification, query attribution and database deltas together.
- Attach fresh screenshot/log evidence to each pass. See [DASHBOARD_PRECLIENT_AUDIT.md](DASHBOARD_PRECLIENT_AUDIT.md).

## Client-readiness fixes — 2026-10-08

- Mark audit traffic before making requests: `X-GG-Test-Click: 1` or a `GG-Outreach-Audit` user agent. Keep stored test clicks out of every client count. An audit-prefixed creator slug alone does not identify a fixture.
- Missing sent-today data needs truthful campaign-state copy. Use the selected campaign's validated schedule date; preserve unknown metrics in raw snapshots.
- Keep source health, archived QA leads and fixture activity in internal logs. This supersedes the earlier client test-toggle and visible source-failure guidance.
- Scope membership counts to the current community. Counts from related-community cards, generic challenge pages and login shells do not verify that community. Label secondary evidence and its freshness limits.
- Define cookie and server-side session expiry together; test correct-password lockout and replay after logout.
- Abort polling reads before document unload. WebKit reports navigation cancellations differently; run its full view/state, viewport and motion matrix with axe checks.
- Reserve loaded content height and split pipeline code by view. Keep individual mobile and desktop Lighthouse reports for all three pages.

## Design elevation — 8 October 2026

- Server-render the headline numbers, not only the page shell. A status line that waits for two client fetches put mobile LCP at 3.6 s and CLS at 0.245 (home performance 72). Computing the lead counts and reading the newest saved Instantly snapshot in the layout put the full sentence in the first HTML (performance 96, CLS 0) while the list and board keep their skeletons. Each half degrades to `null` independently, and a 2.5 s cap keeps a slow database from holding the page.
- A skeleton must not wear the class an audit uses as its "loaded" signal. The board skeleton reused `.gg-pipeline-card`, so any "wait for a card" script would pass on a loading state, the same failure the first pipeline screenshots had. Use a distinct class with shared CSS.
- Register the service worker only inside the signed-in layout. Registering it from the root layout let the login page recreate a cache right after logout; the logout gate (caches, registrations, `gg-` storage, server session, API 401) caught it.
- A test that reuses one login across browsers revokes it when the first browser logs out. Log in per browser iteration and revoke at the end of each.
- Playwright's WebKit build crashes on `setOffline` with an active worker. Test the offline fallback in Chromium, and in WebKit assert that the offline page is precached.
- axe rejects `aria-label` on `<time>`; put the exact time in visually hidden text instead. A page header outside `<main>` is a second banner landmark and leaves content outside any landmark; wrap headers inside `main` or use a plain `div`.
- Words the earlier audit banned in client copy still apply to new copy. "Unavailable" is not an error message here: say what could not be read ("couldn't read inbox status").
- iOS standalone `black-translucent` draws light status text over content; in light appearance the clock disappears. Use the `default` status bar.
- Measure touch targets on everything that is clickable, including brand links and icon buttons, and measure a checkbox by its label. Check focus-not-obscured by sampling a grid of points on the focused element; a tall scrollable region's centre can sit under a fixed bar while the control is still visible.
- Exercise optimistic updates and undo with a stateful write mock layered over real reads, so the shared database is never written. Mock only what the environment lacks (the local Instantly key), and make every route handler tolerate a page that closed mid-request.
- Put a 44 px rule and a reduced-motion rule in one place each. One `@media (pointer: coarse), (max-width: 900px)` block and one blanket `prefers-reduced-motion` block meant every new component inherited both without per-component work.

## R2 — make it run the outreach — 8 October 2026

- Check the hosting plan before designing schedules. Vercel Hobby refused a 15-minute cron at deploy and fires daily crons anywhere in the hour. Design for three triggers (scheduler, an open tab nudging when data is stale, a manual button), make the job idempotent, and make "Monday 9am" a Monday-morning window plus a once-per-week guard.
- Never sign in to a deployed preview with the app password, and do not assume the local password matches it. Verify with counts-only bearer endpoints (`/api/ohq/reconcile`) and leave the human sign-in to the human.
- Probe provider field names on real rows, separating required from optional. Instantly omits event timestamps until the event happens and `is_auto_reply` until true; the mapper must read absence as unknown.
- Probe API scopes on every sync (`leads:read`, `emails:read`), before a campaign exists, so a missing scope shows today and not on launch day.
- Local, preview and production share one database: label local sync rows (`instantly-local`), keep local errors out of the shared monitor, and show states that do not exist yet with route-mocked fixtures named as such.
- "Nothing needs you" is false while the sync is failing; an empty state must reflect data freshness.
- An interactive child inside a button swallows taps: the relative-time tooltip made the centre of a queue row unclickable on iPad WebKit. Use a plain `<time>` inside buttons and links.
- axe: `<dl><div>` may only contain `dt` and `dd`; a scrolled page puts targets under the sticky header and trips target-size, so scroll to top before that screenshot.
- `vercel curl` adds about 6 s of CLI overhead; measure server time with curl's own `time_total`. The OHQ 3-second budget held at about 0.85 s.
- Never remove a git worktree whose `node_modules` is a junction to the main one: Windows deletes the target's contents. `npm install` repaired it.
- Tests must not read files that product rounds relocate (`public/gg-outreach-examples.csv`); build fixtures inline.
- Compare Lighthouse against the previous tag built the same way, on the same machine, alternating runs, before blaming or clearing the code.

## R2 fix-round preparation — 9 October 2026

- Isolation must cover every database alias. This project's `DATABASE_URL`, direct/pooled Postgres URLs, host names, user names and passwords all target production, preview and development together. Splitting only one URL leaves alternate tools and future code able to reach production.
- Capture production counts and row hashes using SELECT-only transactions before branching or exercising preview writes. A baseline alone does not establish that preview writes leave production unchanged; compare again around an actual preview write.
- A missing Neon account profile is an infrastructure dependency. Install/check the CLI, request human sign-in, and keep the isolation mutation path gated. Even an API `--describe` request can start authentication; do not assume it is equivalent to offline `--help`.
- Prepared scripts are not completed fixes. Record which paths actually ran and keep the replay, browser matrix, off-machine performance and production-preservation gates explicitly pending until evidence exists.

## R2 independent-audit fix round — 9 October 2026

- This supersedes earlier shared-DB advice: labels do not isolate stats/events/imports/sessions. Use a child branch, endpoint and child-only credentials; split every DB alias and reject the production host. Prove a child write leaves original production counts/hashes unchanged.
- Immutable previews retain old env. Inspect/retire shared-DB deployments; make fresh previews instead of redeploying old config.
- SELECT-before-INSERT is not a lock. Acquire an atomic lease, owner-bind release/checkpoints and hold its row FOR UPDATE through commit. Test PostgreSQL contention/rollback separately from replay transport.
- Persist cursor, records and oldest observation time. Partial/rate-limited attempts preserve complete data and show failure; a long crawl must not get false freshness from its finish timestamp.
- Numeric auto-replies/null-campaign manual answers are real provider cases. Replay multiple days through actual sync, asserting counts/history/queue; optional missing counters stay unknown.
- Carry signed click/test state to signup; verify raw-body signature/timestamp/nonce and actual click FK. Apply dates to both sides. Preview drafts resolve to preview; preview visits stay test traffic.
- An empty queue asserts fresh successful reads. HTTP errors, elapsed time and offline state invalidate clear while cached rows remain. Test healthy-to-unhealthy transitions and recovery.
- Serialize the SSR request clock: replacing “recently” with a longer age caused mobile CLS .239; accurate hydration reduced it to approximately .001. Lazy overlays stay outside initial JavaScript.
- Lighthouse needs real app-session and Vercel bypass cookies, including worker requests. Verify signed-in data and redact secrets. Retain raw categories: private noindex pages fail SEO; hiding that failure does not pass a gate.
- WebKit touch can retain earlier focus. Capture opener before blur, restore after inert cleanup, reveal focus above navigation centrally and portal/bound tooltips. Exercise actual Tab, not direct focus alone.
- Serialize in-flight worker registration with logout; remove deferred load listeners. Unregister before waiting for CLEAR, stop cache puts, delete caches and finish interrupted cleanup on login. Catch offline logout and offer retry everywhere.
- Mail idempotency has a retention window. Ambiguous delivery outside it requires reconciliation, not automatic retry. Disabled preview mail must not append send audits.
- Declare a remote browser wait budget, preserve failed-run evidence and rerun configurations. Never silently omit a failure or turn a raw failed gate into a pass.
- Wait for the specific fixture state, not a generic warning already present in server HTML. Include new chronological History controls in the timeline matrix; otherwise a passing screenshot can audit the wrong state or miss the actual new surface. The completed 36-config rerun passed 1,206 checks and 360 axe scans.
- User-approved Lighthouse policy for auth-gated apps: skip only `is-crawlable`, after verifying anonymous 401s on every measured page and the data endpoint. Keep all other SEO audits; fail any remaining scored audit that fails, errors or is missing on any run, even if the median/category passes. Retain Lighthouse's standard unscored manual review separately. Record the exception in every run and aggregate artifact; leave private noindex directives unchanged.
