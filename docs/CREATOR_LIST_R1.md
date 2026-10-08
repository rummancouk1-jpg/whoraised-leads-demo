# Creator list R1 — production import

66 researched creator/community entries imported into [GG Outreach](https://whoraised-leads-demo.vercel.app) on October 7, 2026. Production contains **66 real leads + 1 existing EXAMPLE fixture = 67 rows**. All new leads remain New, signups 0 and last_touch blank. No outreach messages were sent.

## Delivery and deployment gate

- [Import CSV](../data/creator-list-r1.csv) — exact real importer schema; 66 unique tracked slugs, all prefixed r1-.
- [Research/score audit](../data/creator-list-r1-audit.json), [YouTube channel evidence](../data/creator-youtube-research-r1.json), [exact YouTube upload dates](../data/creator-youtube-verified-r1.json), [newsletter evidence](../data/creator-research-r1.json), [Discord presence and X permalinks](../data/creator-community-research-r1.json), [public contact/source evidence](../data/creator-public-source-evidence-r1.json).
- Gate satisfied before import: public HEAD /go/r1-deployment-probe returned HTTP 302, X-Matched-Path /go/[slug], no-store and destination utm_content=r1-deployment-probe. The click-tracking deployment is documented in [GG_CLICK_TRACKING.md](GG_CLICK_TRACKING.md), deployment dpl_6aE6p82pPmqLLb7y67ewZkrNjZQe.
- Pulled latest with git pull --ff-only origin main; resulting HEAD da7520b36182d557e630a96de541e604c3b0ef1b. Existing uncommitted application changes were preserved. This task made no commit or deployment.
- Imported using **node scripts/import-csv.mjs https://whoraised-leads-demo.vercel.app data/creator-list-r1.csv**, the existing authenticated production importer, with replace=false and oneTime=true. No direct database insertion or mocked API.
- CSV SHA-256: 0a84e8c25db0e2d9bcaadb0f5a17bb760f835ad7f85c56394538bbabad5fd39a.

## Platform split

| Platform | Rows |
|---|---:|
| YouTube | 34 |
| Substack | 25 |
| Discord | 3 |
| Reddit | 3 |
| X | 1 |
| Total | 66 |

Trading podcasts are represented through their real supported distribution platform: Chat With Traders and B The Trader on YouTube; DailyStockPick's newsletter includes its podcast. These are not duplicate podcast rows. All 25 newsletter rows are Substack publications; beehiiv was researched but has no supported platform enum and was not mislabeled. YouTube rows all have public subscriber counts between 5,000 and 500,000.

## Verification and data interpretation

The activity window is **September 7–October 7, 2026**, verified October 7. Every row's notes contain group, owner, channel, source URL, activity date and URL, audience provenance, one-line fit and suggested pitch angle. No extra columns were added to the CSV; group/channel/fit/angle use notes because the importer does not have dedicated fields for them.

YouTube evidence uses each channel's public subscriber label and a recent video with an exact datePublished meta value. Substack evidence uses the publication's own dated archive and About-page public subscriber label. Reddit evidence uses dated public discussion plus the community's current rules; member counts are explicitly labelled members/subscribers, not the newer weekly visitor metric.

Discord communities have **current public online presence** on October 7: TanukiTrade 1,066 online / 6,027 approximate members; Unusual Whales 9,573 / 98,652; r/Daytrading 2,605 / 32,987. This verifies currently active communities via Discord's public invite API, not private message publication dates. Their official newsletter/site/subreddit links establish ownership. Private server promotion policies were not accessible; notes require administrator approval.

The X account's October 5 stock-catalyst post is available as a direct X permalink in notes, indexed by DailyGram, with the timestamp cross-checked against its status ID. Direct X access was restricted. A secondary cached follower estimate of 5.4M is recorded separately; the imported primary-source audience remains unknown.

**11 audience sizes are undisclosed:** QQQ notes; Coffee Grounds Trading; DailyStockPick’s Newsletter; JM Investments; Lighthouse Macro; OnlyFin; Options Monitor by Kevin Smith; TheoWave; The Regime Report; TradeIntel; Unusual Whales. The schema requires a nonnegative integer, so these use **0 as a missing-data sentinel**, explicitly explained in each row. They are not claimed to have zero subscribers. The unchanged fit config consequently puts them in its Under 5K band, which understates their audience factor. Public counts elsewhere are rounded/lower-bound or approximate counts, not precise census figures. US focus describes the covered market and is an editorial judgment; US audience residency is not measured. Mixed-market and futures-heavy secondary candidates are flagged in their fit notes.

Only two distinct business email addresses were verified: Chat With Traders' published sponsorship email and Unusual Whales' published partnership email (shared by its X and Discord rows). All other contacts are blank, with Channel: DM/form; no guessed addresses, personal addresses, or fabricated forms. The Unusual Whales official advertisement/About pages exposed its address through web-search retrieval; a direct-fetch snapshot separately records that the alternate fetched document omitted it.

Related rows share owner tags: TradingWarz (YouTube/newsletter), TanukiTrade (newsletter/Discord), Unusual Whales (X/Discord), r/Daytrading (subreddit/Discord). They are distinct outreach surfaces, not distinct people; coordinate one owner-level approach rather than duplicate messages. Audience totals must not be summed as unique reach.

## Reddit self-promotion constraints

| Community | Current rule and suggested route |
|---|---|
| [r/options](https://www.reddit.com/r/options/) | Rule 7 bans unapproved promotion/solicitation even for free tools; developers must seek moderator pre-approval. Rule 1 bans AI-generated content. Ask moderators first and do not post the generated template. |
| [r/Daytrading](https://www.reddit.com/r/Daytrading/) | Rule 3 bans selling/promoting services, communities, referral links and requests to DM; creator guidelines apply and paid Reddit advertising is the stated alternative. Rule 4 bans generic low-effort AI content. Moderator-approved partnership or paid ads only. |
| [r/thetagang](https://www.reddit.com/r/thetagang/) | Rules 1/3/5 prohibit sales/referrals, social-media spam and self-promotion including free blog gateways. Ask moderators whether a sanctioned challenge is acceptable; no unsolicited campaign posts. |

These are permission-gated research candidates, not permission to post. r/wallstreetbets was excluded because its promotion and paper-trading-competition restrictions conflict with this campaign. Stale publications, unrelated handles and YouTube channels over 500K were also excluded. No generic signup rows were used to meet the target.

## Top 15 by existing fit config

Scored by the actual src/lib/outreach.ts fitScore with src/config/fit-weights.json unchanged: audience 35, niche 30, US focus 20, contact 15. No invented score column or manual ranking override. Ties use name order, matching the dashboard.

| Rank | Lead | Platform | Score | Tracked pitch link |
|---:|---|---|---:|---|
| 1 | Unusual Whales | Discord | 100 | [/go/r1-unusualwhales](https://whoraised-leads-demo.vercel.app/go/r1-unusualwhales) |
| 2 | Option Omega | YouTube | 85 | [/go/r1-optionomega](https://whoraised-leads-demo.vercel.app/go/r1-optionomega) |
| 3 | OptionStrat | YouTube | 85 | [/go/r1-optionstrat](https://whoraised-leads-demo.vercel.app/go/r1-optionstrat) |
| 4 | Outlier Trading | YouTube | 85 | [/go/r1-outliertrading](https://whoraised-leads-demo.vercel.app/go/r1-outliertrading) |
| 5 | TanukiTrade – Advanced Options Hub | Discord | 85 | [/go/r1-dd8njgqweq](https://whoraised-leads-demo.vercel.app/go/r1-dd8njgqweq) |
| 6 | TanukiTrade \| FREE Option Trading Newsletters | Substack | 85 | [/go/r1-tanukitrade](https://whoraised-leads-demo.vercel.app/go/r1-tanukitrade) |
| 7 | The Multiplier \| Retirement Income with Options | Substack | 85 | [/go/r1-themultiplier](https://whoraised-leads-demo.vercel.app/go/r1-themultiplier) |
| 8 | The Options Oracle | Substack | 85 | [/go/r1-optionsoracle](https://whoraised-leads-demo.vercel.app/go/r1-optionsoracle) |
| 9 | TheoTrade, LLC | YouTube | 85 | [/go/r1-theotrade](https://whoraised-leads-demo.vercel.app/go/r1-theotrade) |
| 10 | TradingWarz | YouTube | 85 | [/go/r1-tradingwarzofficial](https://whoraised-leads-demo.vercel.app/go/r1-tradingwarzofficial) |
| 11 | TradingWarz: CPA & Investor | Substack | 85 | [/go/r1-tradingwarzcpa](https://whoraised-leads-demo.vercel.app/go/r1-tradingwarzcpa) |
| 12 | r/Daytrading | Discord | 78 | [/go/r1-gvyvjwqt9m](https://whoraised-leads-demo.vercel.app/go/r1-gvyvjwqt9m) |
| 13 | Trading Decoded | YouTube | 78 | [/go/r1-tradingdecoded](https://whoraised-leads-demo.vercel.app/go/r1-tradingdecoded) |
| 14 | TrendSpider | YouTube | 78 | [/go/r1-trendspider](https://whoraised-leads-demo.vercel.app/go/r1-trendspider) |
| 15 | HF Best Ideas | Substack | 77 | [/go/r1-stockanalysiscompilation](https://whoraised-leads-demo.vercel.app/go/r1-stockanalysiscompilation) |

## Production browser checks

[Raw verification](../evidence/creator-list-r1/verification.json), captured 2026-10-07T08:32:26.467Z. Actual installed Chrome and Edge, headless desktop automation; no emulation claimed as a physical-device test.

- Authenticated production API returned all 66 imported slugs in both browsers; total 67, real count 66.
- Opened **every imported lead's actual deployed drawer in both browsers** and verified its generated pitch contains https://whoraised-leads-demo.vercel.app/go/<that-lead-slug>: 132 pitch checks. Notes match the persisted row.
- Five uniformly random rows sampled without replacement using crypto.randomInt and reused across both browsers. Each opened at 390, 820 and 1440 pixels, in normal and reduced motion: **60 responsive drawer checks passed**. Checked correct heading/pitch, settled bounds inside the viewport and no page-level horizontal overflow. Narrow tables intentionally allow internal horizontal scrolling.
- Reduced-motion dashboard checks found no active CSS animations or transitions. No browser page errors in either browser. A 390-pixel reduced-motion screenshot was visually inspected and showed readable content and usable drawer controls.

| Browser | Version | All lead pitch checks | Sampled width/motion checks |
|---|---|---:|---:|
| Chrome | 154.0.8037.98 | 66 PASS | 30 PASS |
| Microsoft Edge | 154.0.4258.53 | 66 PASS | 30 PASS |

| Random row | 390 normal/reduced | 820 normal/reduced | 1440 normal/reduced |
|---|---|---|---|
| r1-tacticalallocationdesk | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |
| r1-themultiplier | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |
| r1-stockstotrade | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |
| r1-financialeducation2 | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |
| r1-theotrade | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |

Screenshots for each of the 60 checks are linked by filename in the raw verification JSON. Generic production pitch wording remains the existing configured draft; the tailored suggested pitch angle is in each lead's notes. All pitches use the new /go/ link. No campaign link was clicked during this list verification, so tests did not inflate real-lead click counts.
