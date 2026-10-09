# GG Outreach — pre-client audit

Audited Thursday, 8 October 2026 at 00:30:27 GMT+5. Canonical: [gg-tourney-hub.vercel.app](https://gg-tourney-hub.vercel.app).

**Result: NOT an all-pass release.** The application checks pass; five external Reddit source URLs still return HTTP 403. Their records remain visible with source_url_live=n so a blocked response is never represented as a current 200. No failure was silently marked passed.

| Item | Check | Result | Evidence-backed result | Evidence |
|---|---|---|---|---|
| 1a | Every private page and API method denies a request without credentials | PASS | 54 curl checks; private paths/methods 401, login/assets 200. | [curl matrix](../evidence/preclient/access.json) · [login/logout and forged sessions](../evidence/preclient/auth-flow.json) |
| 1b | Robots and response headers prevent indexing | PASS | robots.txt disallows /; noindex,nofollow on public responses and metadata. | [robots + headers](../evidence/preclient/robots.json) |
| 1c | No secrets or Instantly credential in client JS | PASS | 15 local built JS files and 12 live chunks scanned; zero configured-secret or credential-pattern matches. | [scan log](../evidence/preclient/secrets.json) · [built-JS grep](../evidence/preclient/built-js-grep.log) |
| 2a | Exact login sentence; no creator/person names before auth | PASS | Private workspace for the GG team only; zero published creator names/handles in login HTML. | [live HTML checks](../evidence/preclient/preauth.json) · [login screenshot](../evidence/preclient/screenshots/chrome-390-normal-login.png) |
| 2b | Title, favicon, metadata, OG and 404 have no old brand | PASS | GG Outreach title and metadata, GG monogram favicon, new GG OG card and custom branded 404. | [HTML checks](../evidence/preclient/preauth.json) · [favicon](../evidence/preclient/favicon.png) · [OG](../src/app/opengraph-image.png) · [404](../evidence/preclient/screenshots/chrome-390-normal-404.png) |
| 2c | Repository and public surface branding grep | PASS | Only the required legacy hostname remains in runtime server code; historical audit/docs references are retained and excluded from deployment. No old branding in live HTML/client chunks. | [repository grep](../evidence/preclient/repo-brand-grep.log) · [runtime/public grep](../evidence/preclient/surface-grep.log) |
| 3 | Legacy host redirects except working /go links | PASS | 307 preserves paths/query; legacy /go HEAD returns 302 to tournament with attribution. | [legacy host curl logs](../evidence/preclient/old-host.json) |
| 4a | Every source URL returns 200 | FAIL | 47/52 returned 200; five Reddit about.json URLs return 403. These remain FAIL and source_url_live=n. | [every row/source result](../evidence/preclient/data-final.json) · [blocked retry log](../evidence/preclient/reddit-retries.json) |
| 4b | All contacts are publisher-published and usable routes | PASS | 52 original/published contact checks; restored podcast general contact route; new replacement contacts checked against saved publisher pages. | [row evidence](../evidence/preclient/data-final.json) · [final 52 contact gates](../evidence/preclient/contact-provenance-final.json) · [replacement gates](../evidence/preclient/data-fixes.json) · [podcast route](../evidence/preclient/podcast-route-fix.json) |
| 4c | No duplicate owner; no paid-media-only Priority route | PASS | Three duplicate owners consolidated, histories preserved; creator replacements have publisher contacts. Sponsorship-only podcast source replaced with general contact source. | [data summary](../evidence/preclient/data-summary.json) · [mutation log](../evidence/preclient/data-fixes.json) · [podcast correction](../evidence/preclient/podcast-route-fix.json) |
| 4d | 40 Priority + 12 Long tail = 52 and UI agrees | PASS | 52 real records; QA lead archived. Tier counts agree with live status strip. | [source vs UI](../evidence/preclient/numbers-ui.json) · [home screenshot](../evidence/preclient/numbers-home.png) |
| 4e | Fit lines contain no repeated boilerplate | PASS | 32 generic openings rewritten to refer to the specific publisher; no duplicate full lines or generic prefixes remain. | [before/after copy](../evidence/preclient/fit-copy-fixes.json) |
| 4f | No unpublished personal enrichment | PASS | Published names/handles, publisher contacts/reach, market evidence and internal workflow only; no inferred addresses or private personal fields. | [field/contact review](../evidence/preclient/privacy.json) · [per-row provenance](../evidence/preclient/data-final.json) |
| 5 | Home and Email figures equal independent source values | PASS | 29 source/UI comparisons equal: eight GG inboxes, health, limits, unavailable sends, click-table total and displayed daily inbox history. | [comparison log](../evidence/preclient/numbers-ui.json) · [Instantly original fields](../evidence/preclient/instantly-source.json) · [Email screenshot](../evidence/preclient/numbers-email.png) |
| 6 | Phone click counts; bot preview does not; UTMs survive | PASS | 1 → 2 → 2; HTTP 302 for both; utm_source, utm_campaign, utm_content and utm_medium preserved. | [request/database proof](../evidence/preclient/click-proof.json) · [UTM regression tests](../evidence/preclient/click-contract-test.log) |
| 7a | CSV export → replace re-import with no data loss | PASS | 52 rows, 28 columns; all fields equal before replacement and after re-import. Missing earnings_evidence_file fixed. | [round-trip log](../evidence/preclient/flows.json) · [CSV](../evidence/preclient/roundtrip-export.csv) · [import screenshot](../evidence/preclient/roundtrip-import-preview.png) |
| 7b | Status change is reversible | PASS | New → Contacted → New persisted via UI/API; all other fields unchanged. | [flow log](../evidence/preclient/flows.json) · [changed](../evidence/preclient/stage-changed.png) · [restored](../evidence/preclient/stage-restored.png) |
| 7c | Designed loading, empty and error states | PASS | Fault injection on home, pipeline and Email in each browser/width/motion setting; explanatory text and retry/import/refresh actions. | [state matrix](../evidence/preclient/viewports.json) · [empty state](../evidence/preclient/screenshots/chrome-390-normal-home-empty.png) · [error state](../evidence/preclient/screenshots/chrome-390-normal-home-error.png) · [loading state](../evidence/preclient/screenshots/chrome-390-normal-email-loading.png) |
| 8 | 390 / 820 / 1440, Chrome + Edge, both motion settings | PASS | 276 captures across 23 views/states; zero page/control overflow, motion violations, unexpected console or runtime errors. Tables/board scroll within their regions. | [complete matrix](../evidence/preclient/VIEWPORTS.md) · [machine log](../evidence/preclient/viewports.json) · [scroll checks](../evidence/preclient/scroll-regions.json) |
| 9 | All views and 52 drawers have no unfinished copy | PASS | All view states plus 52 lead drawers/notes crawled; zero TODO/lorem/test/placeholder/old-brand matches. QA activity is deliberately named QA; example CSV is explicitly labelled. | [drawer crawl](../evidence/preclient/drawer-crawl.json) · [view crawl](../evidence/preclient/viewports.json) |

## Scope and necessary public exceptions

Only /login and /go/<slug> are public application surfaces. Login requires a sessionless POST /api/auth with a valid same-origin password submission; Vercel cron uses its own secret instead of a browser session. Requests with neither credential were curled across every API path/method and return 401. Static JS/CSS/font files and the favicon, icon, OG image, robots and manifest must be public for login and previews to render. Private CSV downloads are gated. Unknown routes return 401 before authentication and the branded 404 after it.

The production Instantly key is non-downloadable. The exact local password/session/cron/database values, generic credential signatures, key identifiers and server-only import boundary were checked; every script chunk referenced by every live page was fetched. This proves the observed client assets contain no matching credentials; it is not a claim to have downloaded or printed the production key.

Source transport is checked separately from contact publication: creator source URLs describe fit/reach, and contact_source_url identifies the exact publisher contact route. Saved prior contact provenance is timestamped separately from the fresh source fetch. Reddit HTTP-200 retries showed generic Reddit content and were not substituted for the blocked evidence URLs.

## Fixes made

- Added central Next.js 16 proxy protection with 401 login rendering and strict session token validation. Private API methods, unknown routes and CSV assets are gated.
- Redirected every legacy-host path/query to the canonical host except /go links.
- Corrected the exact login sentence and metadata; replaced favicon and added a GG OG image/custom 404.
- Restricted live and historical inbox presentation to the five GG domains: eight GG inboxes, excluding ten unrelated accounts. Added a session-protected read-only original-metric endpoint for reconciliation.
- Consolidated TanukiTrade, TradingWarz and Unusual Whales duplicate surfaces, preserving workflow/click history; added three independently checked owners (Mark Minervini, Bulls On Wall Street and Trader Tom). Archived the hidden QA lead, retaining the before-state backup and QA click history.
- Replaced the podcast sponsorship source with its general publisher contact page; rewrote repeated generic fit openings; marked five blocked sources n.
- Preserved incoming campaign UTMs during redirect; creator slug remains authoritative in utm_content. Two intentional real audit requests now exist in the real click history; preview requests added none.
- Added earnings_evidence_file to CSV export/import and retained previous headers. Verified full replacement with an identical exported backup and restored the status edit.
- Replaced visible test wording with QA activity; corrected the status-strip separator.

## Source value beside UI value

| Figure | Source value | UI value | Result |
|---|---|---|---|
| Inboxes warming | 8 | 8 | PASS |
| Outreach queued | 52 | 52 | PASS |
| Tracked clicks | 3 | 3 | PASS |
| Average warmup health | 100% | 100% | PASS |
| Tier counts | 40 + 12 = 52 | 40 + 12 = 52 | PASS |
| steve@gapgamblerteam.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| melanie@gapgamblerofficial.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| nancy@gapgamblermedia.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| steve@gapgamblermedia.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| melanie@gapgamblerhq.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| nancy@gapgamblerhq.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| steve@gapgamblergroup.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| melanie@gapgamblergroup.com — warmup / health / sent today / limit | Active / 100 / 100 / Unavailable / 30 | Active / 100 / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 steve@gapgamblerteam.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 melanie@gapgamblerofficial.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 nancy@gapgamblermedia.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 steve@gapgamblermedia.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 melanie@gapgamblerhq.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 nancy@gapgamblerhq.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 steve@gapgamblergroup.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-07 melanie@gapgamblergroup.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 steve@gapgamblerteam.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 melanie@gapgamblerofficial.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 nancy@gapgamblermedia.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 steve@gapgamblermedia.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 melanie@gapgamblerhq.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 nancy@gapgamblerhq.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 steve@gapgamblergroup.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |
| Snapshot 2026-10-06 melanie@gapgamblergroup.com | Active / 100 / Unavailable / 30 | Active / 100 / Unavailable / 30 | PASS |

Sources: [Instantly original fields](../evidence/preclient/instantly-source.json), [API comparison](../evidence/preclient/numbers-api.json), [SQL/DOM comparison](../evidence/preclient/numbers-ui.json). Missing sent-today analytics are shown as Unavailable, never fabricated as zero. Saved snapshots are immutable historical observations, not current values.

## All 52 source/contact results

| Lead | Source HTTP | Contact published | Result | Evidence |
|---|---|---|---|---|
| B The Trader | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-bthetrader87.html) |
| Bulls On Wall Street | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-preclient-bullsonwallstreet.html) |
| Chat With Traders | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-chatwithtraderspodcast.html) |
| ClayTrader | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-claytrader.html) |
| Coffee Grounds Trading | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-coffeegroundstrading.html) |
| DailyStockPick’s Newsletter | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-dailystockpick.html) |
| DynaLogic | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-dynalogic.html) |
| FX Evolution - Trading Academy | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-fxevolutionvideo.html) |
| Halal Trader | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-halaltrader.html) |
| HF Best Ideas | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-stockanalysiscompilation.html) |
| Humbled Trader | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-humbledtrader.html) |
| JM Investments | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-jminvestments.html) |
| Lighthouse Macro | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-lighthousemacro.html) |
| Mark Minervini | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-preclient-markminervini.html) |
| MarketChameleon.com | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-marketchameleon.html) |
| Markus Heitkoetter - Investor & Lifelong Learner | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-rockwelltradingservices.html) |
| Marlin Capital | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-marlincapital.html) |
| OnlyFin | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-onlyfin.html) |
| Option Alpha | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-optionalpha.html) |
| Options Monitor by Kevin Smith | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-optionsmonitor.html) |
| OptionsPlay | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-optionsplay.html) |
| OptionStrat | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-optionstrat.html) |
| Outlier Trading | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-outliertrading.html) |
| projectoption | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-projectoption.html) |
| QQQ notes | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-chartnotes.html) |
| r/Daytrading | 403 | Yes | FAIL | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-r-daytrading.html) |
| r/options | 403 | Yes | FAIL | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-r-options.html) |
| r/StockMarket | 403 | Yes | FAIL | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r2-r-stockmarket.html) |
| r/stocks | 403 | Yes | FAIL | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r2-r-stocks.html) |
| r/thetagang | 403 | Yes | FAIL | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-r-thetagang.html) |
| SMB Capital | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-smbcapital.html) |
| SpotGamma’s Substack | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-spotgamma.html) |
| StockedUp | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-stockedup.html) |
| TanukiTrade / FREE Option Trading Newsletters | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tanukitrade.html) |
| The Multiplier / Retirement Income with Options | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-themultiplier.html) |
| The Option Strategist Substack | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-optionstrategist.html) |
| The Options Oracle | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-optionsoracle.html) |
| The Pareto Investor | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-paretoinvestor.html) |
| The Tactical Allocation Letter | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tacticalallocationdesk.html) |
| The Transcript | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r2-the-transcript.html) |
| TheoTrade, LLC | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-theotrade.html) |
| TheoWave | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-theowave.html) |
| Trade Brigade | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tradebrigade.html) |
| Trade Ideas | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-audit-tradeideas.html) |
| Trader Tom | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-preclient-tradertom.html) |
| Trades by Matt | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tradesbymatt.html) |
| Trading Decoded | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tradingdecoded.html) |
| TradingWarz | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-tradingwarzofficial.html) |
| TrendSpider | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-trendspider.html) |
| Unusual Whales | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-unusual-whales.html) |
| Value & Momentum Portfolio | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-denisdoroshenko.html) |
| You Got This Trading | 200 | Yes | PASS | [row log](../evidence/preclient/data-final.json) · [source capture](../evidence/preclient/sources/final-r1-yougotthistrading.html) |

## Build, deployment and visual review

[Build log](../evidence/preclient/build.log), [CSV contract test](../evidence/preclient/contracts-test.log), [click regression tests](../evidence/preclient/click-contract-test.log), [lint log](../evidence/preclient/lint.log), [production deployment log](../evidence/preclient/deploy.log), [runtime log query](../evidence/preclient/runtime-errors.log). Build and the CSV contract check pass; lint has zero errors and pre-existing/audit-script unused-variable warnings. The runtime query returned no error entries in the requested one-hour window. Injected 503 states and the deliberate 404 are expected test responses, excluded from unexpected console-error counts.

The [visual review log](../evidence/preclient/visual-review-log.json) records inspected surfaces. The reviewed [contact sheet](../evidence/preclient/visual-review.png) covers login, home, drawer, import/export, Email, pipeline and 404. Individual screenshots and layout measurements are indexed in [VIEWPORTS.md](../evidence/preclient/VIEWPORTS.md). Full-page captures are long because all rows are shown; narrow tables and the pipeline intentionally use internal horizontal scrolling.

## Lessons appended

1. Scope an account-level provider to the client workspace before counting or exposing inboxes.
2. Export every persisted research field; compare parsed CSV with the actual server records, including optional fields.
3. Deduplicate outreach by publisher owner, not channel surface, and retain original evidence/history.
4. An HTTP 200 generic/challenge page is not publisher evidence. Keep failed source checks visible and distinct from previously saved provenance.
5. Test real phone UA, preview UA, query UTMs and database deltas together.
6. Report fresh logs/screenshots with explicit transport failures; historic audit claims cannot establish a current pass.

## Audit credential cleanup limitation

Automatic approval review rejected removal of the temporary `evidence/preclient/.session` file with only “blocked by policy” as its reason. The temporary session and environment files remain ignored by Git; evidence is excluded from Vercel uploads. This file is a credential, not audit evidence, and must not be shared.

## Client-readiness fixes and final regression — 2026-10-08T00:13:31.574Z

This appendix supersedes the earlier click total, visible QA/source flags, “Unavailable” copy, stateless logout and browser-matrix results. Client implementation checks: **PASS**. Original source-HTTP check 4a remains **FAIL** for the five blocked Reddit endpoints; all five satisfy the user-authorized secondary-evidence fallback. Historical failures and backups are retained internally.

| Item | Check | Result | Evidence-backed result | Evidence |
|---|---|---|---|---|
| Fix 1 | Backed-up audit clicks; test markers isolated | PASS | Removed only audit IDs 11 and 12 after backup. True real count 1; three marked phone/desktop requests stored as is_test; every real aggregate unchanged. Bots add none; UTMs survive. | [backup](../evidence/client-readiness/before-cleanup.json) · [click proof](../evidence/client-readiness/clicks.json) |
| Fix 2 | Truthful pending send copy | PASS | Provider has no matching tournament campaign/schedule; eight inboxes and immutable history show “Warming up”. Future valid campaign_schedule.start_date displays “Warming up · sending starts YYYY-MM-DD”; missing values stay unknown internally. 29 independent source/UI comparisons agree. | [source vs UI](../evidence/client-readiness/numbers-ui.json) · [Email screenshot](../evidence/client-readiness/numbers-email.png) · [state contracts](../evidence/client-readiness/contracts.log) |
| Fix 3 | Reddit verification; internal source health | PASS | Five accepted secondary captures, labelled secondary source. Fresh headed Chrome captures retained; membership could not be established for the current community. No OAuth credentials created. Client records omit source-health flags; the legacy CSV column stays blank for format compatibility, and the UI has no health flags. | [verification](../evidence/client-readiness/reddit-alternatives/verification.json) · [internal evidence](../evidence/client-readiness/source-health-internal.json) |
| Fix 4 | QA traces removed from client surfaces | PASS | Removed the QA activity section/toggle and example labels; fixture records excluded at the server. Archived QA record and all 52 source flags backed up and moved to gg_internal_audit. Six notes had demo-audit wording removed after backup; all other fields preserved. The downloadable example CSV was retired to internal evidence. Marked click history remains server-only. 528 surfaces plus 52 drawers scanned. | [client boundary](../evidence/client-readiness/client-boundary.json) · [note cleanup](../evidence/client-readiness/qa-notes-cleanup.json) · [retired example CSV](../evidence/client-readiness/qa-example-csv-cleanup.json) · [archive backup](../evidence/client-readiness/qa-archive-before.json) · [source backup](../evidence/client-readiness/source-flags-before.json) · [drawer crawl](../evidence/client-readiness/drawer-crawl.json) |
| Fix 5 | Authentication and security headers | PASS | Five bad passwords return 401; the next correct password returns 429. Stored lock expires 15 minutes after failure five; advancing only the test window proves recovery. Cookie HttpOnly, Secure, SameSite=Lax, 14-day Max-Age/Expires; DB session expiry verified. Logout deletes the server token hash; replay returns 401. Nonce CSP, HSTS, X-Frame-Options DENY and Referrer-Policy checked on public/private/redirect responses. | [security proof](../evidence/client-readiness/security.json) |
| Fix 6 | WebKit and full browser/state matrix | PASS | 528 captures across 22 views/states × three widths × two motion settings × four browser/device configurations. 0 unexpected runtime/console errors; zero clipping/overflow/motion differences. Tables and board scroll internally. WebKit navigation fetches cancelled before document exit. | [matrix index](../evidence/client-readiness/VIEWPORTS.md) · [machine matrix](../evidence/client-readiness/viewports.json) · [navigation diagnostic](../evidence/client-readiness/webkit-network-diagnostic.json) |
| Fix 7 | Lighthouse and axe-core | PASS | All six Lighthouse runs meet Performance ≥90, Accessibility 100 and Best Practices 100; 0 axe violations in 528 captures, including dialogs and injected states. | [Lighthouse](../evidence/client-readiness/lighthouse.json) · [axe matrix](../evidence/client-readiness/viewports.json) |
| 1a | Private page/API access | PASS | Full original 54-request matrix rerun; unauthorized methods/pages denied; forged/session/logout tests retained. | [access](../evidence/client-readiness/access.json) · [auth flows](../evidence/client-readiness/auth-flow.json) |
| 1b | Robots/noindex | PASS | Original robots/headers check rerun; / disallowed and noindex,nofollow retained. | [robots](../evidence/client-readiness/robots.json) |
| 1c | Secrets absent from client JS | PASS | Fresh local/live client-chunk scan has no credential matches. | [secret scan](../evidence/client-readiness/secrets.json) |
| 2a | Exact login sentence / pre-auth privacy | PASS | Exact GG team sentence and no creator names/handles before authentication. | [pre-auth](../evidence/client-readiness/preauth.json) |
| 2b | Branding / metadata / 404 | PASS | GG title, metadata, favicon, OG and branded 404 retained. | [pre-auth](../evidence/client-readiness/preauth.json) · [404 capture](../evidence/client-readiness/screenshots/chrome-390-normal-404.png) |
| 2c | Branding grep | PASS | Only required legacy-host redirect and internal history retain old names; public/client scans clear. | [repository grep](../evidence/client-readiness/repo-brand-grep.log) · [surface grep](../evidence/client-readiness/surface-grep.log) |
| 3 | Legacy host + attribution | PASS | 307 preserves path/query; /go remains public and redirects with attribution. | [legacy checks](../evidence/client-readiness/old-host.json) |
| 4a | Every primary source URL returns 200 | FAIL | 47/52 source URLs return 200. Five Reddit about.json endpoints still return 403. This original strict transport check remains FAIL; the explicitly authorized secondary verification above passes independently. No challenge page passes. | [fresh source results](../evidence/client-readiness/data-final.json) · [secondary proof](../evidence/client-readiness/reddit-alternatives/verification.json) |
| 4b | Publisher-published contacts | PASS | All 52 contact gates rerun against saved publisher provenance; no unpublished enrichment. | [contact gates](../evidence/client-readiness/contact-provenance-final.json) |
| 4c | Owner dedupe / outreach routes | PASS | No duplicate owners or paid-media-only Priority routes. | [data summary](../evidence/client-readiness/data-summary.json) |
| 4d | 52 real leads / tier counts | PASS | 40 Priority + 12 Long tail = 52; independent DOM/API counts agree. | [source vs UI](../evidence/client-readiness/numbers-ui.json) |
| 4e | Specific fit copy | PASS | No duplicate fit lines; fresh drawer/source crawl preserves publisher-specific copy. | [summary](../evidence/client-readiness/data-summary.json) · [drawers](../evidence/client-readiness/drawer-crawl.json) |
| 4f | No private enrichment | PASS | Publisher fields and contact provenance unchanged; internal source-health flags excluded from client projection. | [privacy review](../evidence/client-readiness/privacy.json) |
| 5 | Independent numeric reconciliation | PASS | 29 source/UI comparisons agree, including real count 1 and truthful pending-send labels. | [comparison](../evidence/client-readiness/numbers-ui.json) |
| 6 | Click/preview/UTM contract | PASS | Rerun with audit header/UA markers; stored tests cannot pollute real history. Original natural click proof retained; no extra unmarked audit click generated. | [click proof](../evidence/client-readiness/clicks.json) · [contracts](../evidence/client-readiness/contracts.log) |
| 7a | CSV round trip | PASS | All 52 rows and 28 columns survive export/replace/re-import; internal source-health projection intentionally blank. | [round trip](../evidence/client-readiness/flows.json) · [CSV](../evidence/client-readiness/roundtrip-export.csv) |
| 7b | Reversible stage edit | PASS | New → Contacted → New persisted; original workflow restored. | [flow proof](../evidence/client-readiness/flows.json) |
| 7c | Loading / empty / error states | PASS | Read-only fault injection on home, pipeline and Email in every matrix setting; all explanatory states and recovery actions pass. | [matrix](../evidence/client-readiness/VIEWPORTS.md) |
| 8 | Responsive / motion / scrolling | PASS | Original Chrome/Edge matrix rerun and extended with both WebKit device configurations. | [matrix](../evidence/client-readiness/viewports.json) · [scroll checks](../evidence/client-readiness/scroll-regions.json) |
| 9 | No unfinished/QA copy | PASS | Zero QA/Unavailable/null/TODO/test/placeholder/old-brand hits across all views/states and 52 drawers. | [drawers](../evidence/client-readiness/drawer-crawl.json) · [matrix](../evidence/client-readiness/viewports.json) |

### Lighthouse scores

| Mode | View | Performance | Accessibility | Best Practices | Result | Evidence |
|---|---|---|---|---|---|---|
| mobile | home | 94 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-mobile-home.html) |
| mobile | pipeline | 91 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-mobile-pipeline.html) |
| mobile | email | 98 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-mobile-email.html) |
| desktop | home | 100 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-desktop-home.html) |
| desktop | pipeline | 100 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-desktop-pipeline.html) |
| desktop | email | 99 | 100 | 100 | PASS | [HTML report](../evidence/client-readiness/lighthouse-desktop-email.html) |

The earlier run during the browser matrix measured mobile pipeline **89 / FAIL**, with 430 ms total blocking time and zero layout shift; its [complete reports](../evidence/client-readiness/lighthouse-during-matrix/lighthouse.json) are retained. The final six measurements above ran after the audit browsers finished, using the same Lighthouse settings and thresholds. This records the observed variation rather than discarding a failed measurement.


### Reddit evidence

All five use secondary source evidence from SubredditStats. Its own warning says data may be stale/inaccurate; these captures verify community identity, not current membership. No secondary membership number replaces a live count. The fresh Reddit captures are supplementary; network challenges and counts from related-community cards are rejected.

| Community URL | Result | Primary capture | Secondary capture |
|---|---|---|---|
| [r/Daytrading](https://www.reddit.com/r/Daytrading/) | PASS_SECONDARY · secondary source | [screenshot](../evidence/client-readiness/reddit-alternatives/Daytrading.png) | [screenshot](../evidence/client-readiness/reddit-alternatives/Daytrading-secondary-0.png) |
| [r/options](https://www.reddit.com/r/options/) | PASS_SECONDARY · secondary source | [screenshot](../evidence/client-readiness/reddit-alternatives/options.png) | [screenshot](../evidence/client-readiness/reddit-alternatives/options-secondary-0.png) |
| [r/StockMarket](https://www.reddit.com/r/StockMarket/) | PASS_SECONDARY · secondary source | [screenshot](../evidence/client-readiness/reddit-alternatives/StockMarket.png) | [screenshot](../evidence/client-readiness/reddit-alternatives/StockMarket-secondary-0.png) |
| [r/stocks](https://www.reddit.com/r/stocks/) | PASS_SECONDARY · secondary source | [screenshot](../evidence/client-readiness/reddit-alternatives/stocks.png) | [screenshot](../evidence/client-readiness/reddit-alternatives/stocks-secondary-0.png) |
| [r/thetagang](https://www.reddit.com/r/thetagang/) | PASS_SECONDARY · secondary source | [screenshot](../evidence/client-readiness/reddit-alternatives/thetagang.png) | [screenshot](../evidence/client-readiness/reddit-alternatives/thetagang-secondary-0.png) |

### Final validation and lessons

All ten original audit scripts rerun on the final release: preclient-access exit 0, preclient-auth exit 0, preclient-robots exit 0, preclient-secrets exit 0, preclient-numbers exit 0, preclient-flows exit 0, preclient-crawl exit 0, preclient-scroll exit 0, preclient-data-final exit 0, preclient-contacts-final exit 0. An exit code proves script execution, not external source success; 4a is reported separately. [rerun log](../evidence/client-readiness/regression-runs.json). Build passes, six contract tests pass and lint has zero errors. [build](../evidence/client-readiness/build.log) · [contracts](../evidence/client-readiness/contracts.log) · [lint](../evidence/client-readiness/lint.log) · [deployment](../evidence/client-readiness/deploy.log) · [visual review](../evidence/client-readiness/visual-review-log.json).

1. Mark every audit click with X-GG-Test-Click or the GG-Outreach-Audit UA before issuing it; filter fixtures before every client aggregation. Never infer a test from an audit-prefixed real creator slug.
2. Missing send metrics need a campaign-state explanation, not zero. Use the selected campaign’s validated schedule date and preserve unknown raw values in immutable snapshots.
3. Source health and QA fixtures belong only in internal evidence/logs. This supersedes the earlier guidance to show failed flags or a test toggle to clients.
4. Challenge/login shells and unrelated-community counts are not evidence. Scope counts to the current community; label secondary evidence and its freshness limits.
5. Logout must revoke a server-side token; verify replay denial, cookie expiry and the database expiry together. Test lockout against the correct password as well as incorrect passwords.
6. WebKit surfaces cancelled document-navigation fetches differently; abort reads before unloading. Verify every populated, loading, empty, error and dialog state with axe, rather than just the three main pages.
7. Reserve loaded content height and defer pipeline code until that view is opened; audit performance with standard Lighthouse mobile throttling and report each page separately.

The bounded production runtime-log query returned no error entries in the requested hour. [runtime query](../evidence/client-readiness/runtime-errors.log). Deliberate 404 and injected 503 responses are expected test states.

The temporary session file for this round was removed and its server token hash revoked. The original audit session file was already absent at cleanup. Owner environment files were preserved. This supersedes the historical credential-cleanup limitation above. [cleanup proof](../evidence/client-readiness/session-cleanup.json).
