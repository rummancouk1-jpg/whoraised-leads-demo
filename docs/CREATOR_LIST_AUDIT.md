# Creator list audit — R2 correction, 7 October 2026

**52 qualified surfaces: 16 Creators, 23 Newsletters, 7 Communities, and 6 Potential sponsors.** Newsletters + Communities = 30. 26 previously archived rows restored; 3 new rows added; 27 previously live rows archived. The separate EXAMPLE fixture remains in the DB, giving 53 total records. It is excluded from qualified counts and default views.

The list is for a free earnings-gap prediction contest, $1,000 prize, US 18+, October 19–November 13. Qualification means an evidence-backed route and plausible audience relevance, not agreement to share, verified US residence, or consent to receive outreach. No contact messages or forms were submitted.

## Corrected rules and evidence

1. Any creator/community-published contact, business, media or sponsorship route can count on any domain. A named address is valid; addresses inferred or scraped from unrelated sources and customer-support-only routes are rejected. FX Evolution explicitly publishes its support-named address for business enquiries. MarketChameleon’s affiliate page invites contact about partner offerings, linking to its general contact page; the published email therefore has a documented partnership context.
2. Substack Message on the publication owner’s profile, Reddit modmail and a published Discord moderator route count. Owner identity is linked from the publication About preload to the author profile. Chat alone and a Discord invite alone do not establish contact. Discord rows here use verified owner email routes; no moderator route is invented.
3. Reddit direct HTTP/Chrome requests returned 403. Successful public `about.json?raw_json=1` reader responses supply descriptions, subscriber counts and promotion restrictions. Blocked attempts remain in the research manifest. They do not establish poor fit. Public reader output is saved separately from HTML.
4. `scripts/contact-evidence-gate.mjs` validates email/form appearance in the saved HTML for the exact contact source, requires successful capture provenance, and rejects homepages, video tabs and redirects to those surfaces. Forms need actual email/message controls, including the observed Showit contact form. Native rows store the platform URL. `scripts/import-csv.mjs` calls this gate before authentication or mutation through `scripts/audited-csv-gate.mjs`; all real imports require matching JSON evidence sidecars, including base/legacy CSVs. CSV/sidecar contact mismatches fail. QA-only EXAMPLE imports remain separate.
5. Major media, exchanges, brokers and ad-sales-only routes are excluded from creator outreach and archived with `paid-media only`. Trading tools enter Potential sponsors only where a partnership/co-marketing route was verified. Affiliate programs are possible partnership routes, not promises of cash sponsorship or unpaid promotion.

Every qualified row has covers_earnings, a one-line explanation and source URL: 7 y, 45 n. **n means explicit earnings coverage was not verified in the checked description/recent titles**, not proof the target never discusses earnings. y requires an actual source statement/title; fit wording and negative “no earnings example” text are not counted. The r/options earnings example is saved in evidence/creator-audit-r2/options-earnings-reader.txt. Other earnings evidence is in the original Oct 7 source-load JSONs and the R2 saved About HTML.

Reach is an observed public subscriber/follower/member display, often rounded; it is not US adult reach. Unknown newsletter reach is `0` solely because the existing schema is numeric. Low-reach rows have explicit inclusion reasons below and are not used to inflate the Top 15.

The retained surfaces share owners: TanukiTrade newsletter/Discord, TradingWarz creator/newsletter, and Unusual Whales tool/Discord. Coordinate one invitation per owner, then choose the best channel. Newsletter subscriber counts and Discord members must not be summed as independent people.

## Counts by group

| Group | Qualified rows |
| --- | --- |
| Creators | 16 |
| Newsletters | 23 |
| Communities | 7 |
| Potential sponsors | 6 |

## Restored rows

| Name | Group | Reason | contact_type | contact_source_url |
| --- | --- | --- | --- | --- |
| StockedUp | Creators | Named creator address published on its contact page; previous personal-looking rejection corrected. | email | https://www.stockedup.university/contact-us |
| TheoTrade, LLC | Creators | Named media-relations contact published by TheoTrade; previous personal-looking rejection corrected. | email | https://theotrade.com/contact/ |
| OptionsPlay | Creators | Official channel About publishes this contact; no separate corporate role address required. | email | https://www.youtube.com/@OptionsPlay/about?hl=en |
| TradingWarz | Creators | Named creator address published in the site footer on Resources; previous personal-looking rejection corrected. | email | https://tradingwarz.com/resources/ |
| Outlier Trading | Creators | Creator publishes the named contact on About; prior missing-business-route rejection corrected. | email | https://www.outliertrading.io/about |
| QQQ notes | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@qqqnotes |
| Coffee Grounds Trading | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@coffeegroundstrading |
| DailyStockPick’s Newsletter | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@dailystockpick |
| Value & Momentum Portfolio | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@valuemomentumportfolio |
| DynaLogic | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@dynalogic |
| Halal Trader | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@halaltrader |
| JM Investments | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@jminvestments |
| Marlin Capital | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@marlincapital |
| OnlyFin | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@onlyfin |
| Options Monitor by Kevin Smith | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@optionsmonitor |
| The Options Oracle | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@optionsoracle |
| The Pareto Investor | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@paretoinvestor |
| HF Best Ideas | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@hfbestideas |
| The Tactical Allocation Letter | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@tacticalallocationdesk |
| The Multiplier \| Retirement Income with Options | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@mikethemultiplier |
| TheoWave | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@theowave |
| TradingWarz: CPA & Investor | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@tradingwarzcpa |
| You Got This Trading | Newsletters | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. | substack | https://substack.com/@yougotthistrading |
| r/options | Communities | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. | modmail | https://www.reddit.com/message/compose/?to=r/options |
| r/thetagang | Communities | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. | modmail | https://www.reddit.com/message/compose/?to=r/thetagang |
| r/Daytrading | Communities | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. | modmail | https://www.reddit.com/message/compose/?to=r/Daytrading |

## New rows

| Name | Group | Reason | contact_source_url |
| --- | --- | --- | --- |
| The Transcript | Newsletters | New earnings newsletter; About explicitly publishes its editorial contact. | https://thetranscript.substack.com/about |
| r/stocks | Communities | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. | https://www.reddit.com/message/compose/?to=r/stocks |
| r/StockMarket | Communities | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. | https://www.reddit.com/message/compose/?to=r/StockMarket |

## Re-evaluation of every original removal

The original 41 removed rows remain traceable by slug. Current inability to save an eligible route is unresolved evidence; it is not a negative audience-fit finding. JJ Buckner and Trade Pro retain their separate weak-fit findings; the other missing-route cases were checked under the corrected published-route policy.

| Original removed name | Slug | R2 result | Reason |
| --- | --- | --- | --- |
| StockedUp | r1-stockedup | restore | Named creator address published on its contact page; previous personal-looking rejection corrected. |
| TheoTrade, LLC | r1-theotrade | restore | Named media-relations contact published by TheoTrade; previous personal-looking rejection corrected. |
| Invest with Henry | r1-investwithhenry | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| JJ Buckner | r1-jjbuckner | pending | Weak/unverified US-trader fit: Current channel description and videos focus on personal finances, restaurants, cars and consumer debt. |
| TheStockGuy | r1-thestockguy | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Vincent Desiano | r1-vincentdesiano | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Option Omega | r1-optionomega | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| OptionsPlay | r1-optionsplay | restore | Official channel About publishes this contact; no separate corporate role address required. |
| Real Life Trading | r1-reallifetrading | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Figuring Out Money | r1-figuringoutmoney | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Trade Pro | r1-tradepro | pending | Weak/unverified US-trader fit: Fresh public video list is dominated by crypto/Bitcoin and altcoin setups rather than US equity trading. |
| TradingWarz | r1-tradingwarzofficial | restore | Named creator address published in the site footer on Resources; previous personal-looking rejection corrected. |
| Carmine Rosato | r1-carmine-rosato | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Outlier Trading | r1-outliertrading | restore | Creator publishes the named contact on About; prior missing-business-route rejection corrected. |
| Jeremy Lefebvre - 1000xstocks | r1-financialeducation2 | pending | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| The Traveling Trader | r1-thetravelingtrader | pending | The Traveling Trader: saved HTML has no contact/message form |
| QQQ notes | r1-chartnotes | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Coffee Grounds Trading | r1-coffeegroundstrading | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| DailyStockPick’s Newsletter | r1-dailystockpick | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Value & Momentum Portfolio | r1-denisdoroshenko | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| DynaLogic | r1-dynalogic | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Halal Trader | r1-halaltrader | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| JM Investments | r1-jminvestments | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Marlin Capital | r1-marlincapital | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Cassandra Unchained | r1-michaeljburry | pending | No published Message route verified on the author profile; Chat alone does not prove author contact. |
| OnlyFin | r1-onlyfin | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| Options Monitor by Kevin Smith | r1-optionsmonitor | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| The Options Oracle | r1-optionsoracle | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| The Pareto Investor | r1-paretoinvestor | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| HF Best Ideas | r1-stockanalysiscompilation | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| The Tactical Allocation Letter | r1-tacticalallocationdesk | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| The Multiplier \| Retirement Income with Options | r1-themultiplier | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| TheoWave | r1-theowave | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| The Regime Report | r1-theregimereport | pending | Specific US stock/options fit remains unverified; contact policy is not the reason. |
| TradeIntel | r1-tradeintelligent | pending | Specific US stock/options fit remains unverified; contact policy is not the reason. |
| TradingWarz: CPA & Investor | r1-tradingwarzcpa | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| You Got This Trading | r1-yougotthistrading | restore | Creator-published Substack Message route now counts; author/publication ownership is linked by its About page. |
| r/Daytrading | r1-gvyvjwqt9m | pending | Invite identity alone does not establish an available moderator-contact route; Reddit surface rechecked separately. |
| r/options | r1-r-options | restore | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. |
| r/Daytrading | r1-r-daytrading | restore | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. |
| r/thetagang | r1-r-thetagang | restore | Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated. |

## Reddit verification and promotion rules

Modmail is a request for permission. None of these communities has approved this contest. Restrictions reduce ease-of-route scores. No public contest post is authorized by this research.

| Community | Subscribers | Promotion status | Evidence |
| --- | --- | --- | --- |
| r/options | 1,442,463 | Promotion including free items requires moderator pre-approval; developers must contact mods before posting. Modmail inquiry only until approved. | https://www.reddit.com/r/options/about.json?raw_json=1 |
| r/thetagang | 346,355 | No sales/referrals, advertisements, social-media spam or self-promotion. Ask mods about an exception; no public promotion permission is established. | https://www.reddit.com/r/thetagang/about.json?raw_json=1 |
| r/Daytrading | 5,204,203 | No spam, sales, promotion or disguised advertising. Content creators have separate guidelines. Ask mods for contest permission; no public promotion permission is established. | https://www.reddit.com/r/Daytrading/about.json?raw_json=1 |
| r/stocks | 9,382,940 | Self-promotion/advertising is restricted. Ask moderators for explicit approval before sharing a free contest. | https://www.reddit.com/r/stocks/about.json?raw_json=1 |
| r/StockMarket | 4,124,011 | Promotion is restricted to the community rules; ask moderators for explicit approval before sharing a free contest. | https://www.reddit.com/r/StockMarket/about.json?raw_json=1 |

r/stocks explicitly bans spam, ads, solicitations and self-promotion; r/StockMarket explicitly prohibits self-promotion including personal sites and Discord links. Their inclusion is for moderator permission requests only, with an exception required. r/thetagang similarly bans direct self-promotion; r/Daytrading bans promotion and disguised advertising. Only r/options explicitly describes pre-approval for free items/developers. An exception is not assumed elsewhere.

## Paid-media archive list

All 21 excluded paid-media/major-corporate targets are represented in gg_creator_audit_archive under demo-creator-audit-r2-2026-10-07, including the provisional IBD and Zacks rows carried from the original archive. This category names the exclusion reason; it does not imply that every company lacks other public email addresses.

| Name | Slug | Archive reason |
| --- | --- | --- |
| Barron's | audit-barrons | paid-media only |
| Bloomberg Television | audit-bloombergtelevision | paid-media only |
| Cboe Global Markets | audit-cboeglobalmarkets | paid-media only |
| CNBC Television | audit-cnbctelevision | paid-media only |
| Interactive Brokers | audit-interactivebrokers | paid-media only |
| InvestorPlace | audit-investorplace | paid-media only |
| Morningstar | audit-morningstar | paid-media only |
| MarketWatch | audit-marketwatch | paid-media only |
| Nasdaq | audit-nasdaq | paid-media only |
| New York Stock Exchange | audit-nyseofficial | paid-media only |
| Seeking Alpha | audit-seekingalpha | paid-media only |
| Schaeffer's Investment Research | audit-schaeffersresearch | paid-media only |
| Simply Wall St | audit-simplywallst | paid-media only |
| TradingView | audit-tradingview | paid-media only |
| The Wall Street Journal | audit-wsj | paid-media only |
| Yahoo Finance | audit-yahoofinance | paid-media only |
| Benzinga | r1-benzinga | paid-media only |
| StockCharts TV | r1-stockchartstv | paid-media only |
| Trade Risk | r1-traderisk | paid-media only |
| Investor's Business Daily | audit-investorsbusinessdaily | paid-media only |
| Zacks Investment Research | audit-zacksinvestmentresearch | paid-media only |

## Top 15

100 × min(1, log10(1+audience)/6) × fit(strong=1,partial=.6) × earnings(y=1,n=.35) × route(email=1,form=.8,Substack=.65,modmail=.2). Unknown reach=.2. Sponsors are ranked separately. Counts are observed public displays; US residency not verified.

The logarithmic reach factor avoids letting large general audiences overwhelm earnings fit. Earnings n retains a 0.35 factor for relevant retail-trading audiences. Modmail is 0.2 because permission must be sought. Potential sponsors are separate. The dashboard defaults to this score; the existing fit-score filter remains available. No Top 15 row has a known audience below 5,000.

| Name | Group | Audience | covers_earnings | Fit line | contact_type | contact_source_url |
| --- | --- | --- | --- | --- | --- | --- |
| FX Evolution - Trading Academy | Creators | 254,000 | y | Public channel covers stocks, ETFs and options with CPI, FOMC and earnings market breakdowns. | email | https://www.youtube.com/@fxevolutionvideo/about?hl=en |
| Markus Heitkoetter - Investor & Lifelong Learner | Creators | 149,000 | y | Current videos teach stock wheel income and earnings-session option strategies. | email | https://www.rockwelltrading.com/register-referral-partner-500/ |
| The Transcript | Newsletters | 33,000 | y | Weekly earnings-call digest gives readers management commentary; a free earnings-gap challenge is a relevant editorial/community invitation. | email | https://thetranscript.substack.com/about |
| TanukiTrade \| FREE Option Trading Newsletters | Newsletters | 10,000 | y | Fresh About page explicitly addresses US-market options, earnings reports and weekly watchlists. | substack | https://substack.com/@tanukitrade |
| StockedUp | Creators | 212,000 | n | Public channel publishes stock-market videos every trading day and options/watchlist strategies. | email | https://www.stockedup.university/contact-us |
| OptionsPlay | Creators | 103,000 | n | Current videos cover tech/industrial stock sectors, options processes and US bond-market signals. | email | https://www.youtube.com/@OptionsPlay/about?hl=en |
| Unusual Whales | Communities | 98,652 | n | Live Discord invite identifies Unusual Whales; owner publishes US equity/options-flow and stock news. | email | https://unusualwhales.com/about |
| Humbled Trader | Creators | 1,500,000 | n | Public channel teaches live stock day trading; corporate form explicitly accepts social-media sponsorship inquiries. | form | https://www.humbledtrader.com/contact-us/ |
| SMB Capital | Creators | 766,000 | n | Public channel identifies a NYC equities prop firm and teaches stock/options trading. | form | https://www.smbtraining.com/contact |
| TradingWarz | Creators | 45,600 | n | Public channel focuses on options/futures; owner newsletter explicitly discusses NVDA, AMD and SPY. | email | https://tradingwarz.com/resources/ |
| TheoTrade, LLC | Creators | 45,300 | n | Current videos analyze US mega-caps, the Dow and S&P 500 alongside options education. | email | https://theotrade.com/contact/ |
| ClayTrader | Creators | 639,000 | n | Public channel teaches live stock/option day trading, alongside other markets. | form | https://claytrader.com/contact/ |
| Outlier Trading | Creators | 40,400 | n | Current videos analyze stock options, the wheel, GME gamma and options portfolio sizing. | email | https://www.outliertrading.io/about |
| projectoption | Creators | 485,000 | n | Public options lessons cover calls/puts and explicitly link US broker tastytrade. | form | https://projectoption.com/contact |
| Trade Brigade | Creators | 225,000 | n | Public channel offers pre-market stock analysis around US CPI/PCE/NFP releases. | form | https://tradebrigade.co/contact/ |

## Potential sponsors

| Name | Audience surface | covers_earnings | Why co-promote or sponsor | contact_type | Contact | contact_source_url |
| --- | --- | --- | --- | --- | --- | --- |
| TrendSpider | YouTube: 59,800 | y | Earnings strategy tools and its business/education partnerships align with a retail earnings contest. | email | hello@trendspider.com | https://trendspider.com/contacts/ |
| Unusual Whales | X: 5,400,000 | n | Options-flow data and a published partnerships email could support a joint earnings contest for retail traders. | email | partnerships@unusualwhales.com | https://unusualwhales.com/about |
| Option Alpha | YouTube: 301,000 | n | Options automation/backtesting plus its explicit co-marketing program could support an earnings challenge. | email | affiliates@optionalpha.com | https://optionalpha.com/affiliates |
| Trade Ideas | YouTube: 37,400 | n | Stock scanners could co-promote earnings movers through its published affiliate partnership program. | email | marissa@trade-ideas.com | https://www.trade-ideas.com/affiliate-program/ |
| OptionStrat | YouTube: 23,400 | n | Options strategy visualization could co-promote an earnings expected-move prediction challenge to its users. | email | partners@optionstrat.com | https://optionstrat.com/contact |
| MarketChameleon.com | YouTube: 18,200 | n | Earnings and options research tools directly complement predicted earnings gaps; published affiliate program offers a partnership route. | email | support@marketchameleon.com | https://marketchameleon.com/affiliates |

StocksToTrade, Scanz and EarningsBeats were researched but remain outside the qualified sponsor list: press/customer support does not establish partnership scope. They are archived reversibly as unresolved route evidence, with reasons below.

| Potential sponsor held out | Reason |
| --- | --- |
| StocksToTrade | Trading-tool sponsor fit, but an explicit partnership/co-marketing route has not been verified; press/general support alone is insufficient. |
| Scanz | Only customer-support scope verified; no eligible creator/partnership contact verified. |
| EarningsBeats | Trading-tool sponsor fit, but an explicit partnership/co-marketing route has not been verified; press/general support alone is insufficient. |

## Small and unknown audiences: reasons for inclusion

| Name | Audience | Stated reason and source |
| --- | --- | --- |
| QQQ notes | 351 | Fresh About page explicitly describes a Nasdaq-100 stock-trader macro regime model. https://substack.com/@qqqnotes: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| Coffee Grounds Trading | 12 | Fresh About page describes a daily disclosed equity portfolio and a COHR position. https://substack.com/@coffeegroundstrading: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| DailyStockPick’s Newsletter | Unknown | Fresh About page offers daily stock-selection/trade setups using TrendSpider and Seeking Alpha. https://substack.com/@dailystockpick: public newsletter subscriber display (rounded where K/M/+ is shown). Count unavailable; 0 is the schema sentinel, not zero readers. Included because the author publishes a relevant stock/options trading newsletter and a Message route; unknown reach keeps it out of the priority list. |
| DynaLogic | 3,000 | Fresh About page describes daily equity/ETF buy-sell signals and transparent options trades. https://substack.com/@dynalogic: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| Halal Trader | 1,300 | Fresh About page covers halal equity analysis; geography and active US-stock focus are unconfirmed. https://substack.com/@halaltrader: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| JM Investments | 322 | Fresh About page offers earnings, valuation and long-term company research rather than daily trading. https://substack.com/@jminvestments: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author explicitly covers earnings and publishes a direct route. |
| Lighthouse Macro | 994 | Fresh About page connects macro/liquidity regimes to equities and FICC; audience also includes policymakers/operators. https://substack.com/@lighthousemacro: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| OnlyFin | 414 | Fresh About page targets busy professionals and broad investing rather than active US-stock traders. https://substack.com/@onlyfin: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| Options Monitor by Kevin Smith | 16 | Fresh About page targets option income on dividend stocks and passive index portfolios; US-only focus is not established. https://substack.com/@optionsmonitor: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| The Option Strategist Substack | 4,000 | Fresh About page offers stock-market technical indicators and options strategies by Lawrence McMillan. https://substack.com/@optstrategist: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| SpotGamma’s Substack | 3,200 | Fresh publication describes stock insights from options flows; owner site analyzes S&P 500 gamma levels. https://substack.com/@spotgamma: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| TheoWave | 940 | Fresh About page describes global multi-asset Elliott-wave/options execution rather than US-stock specialization. https://substack.com/@theowave: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |
| You Got This Trading | 1,000 | Fresh About page mixes daily stock models and options education with Indian and European index coverage. https://substack.com/@yougotthistrading: public newsletter subscriber display (rounded where K/M/+ is shown). Under 5k included because the author publishes a relevant stock/options trading newsletter and a Message route; low reach keeps it out of the priority list. |

## Remaining route/evidence holds

| Name | Slug | Reason |
| --- | --- | --- |
| Brian Shannon | r1-alphatrends | Brian Shannon: saved HTML has no contact/message form |
| Invest with Henry | r1-investwithhenry | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| JJ Buckner | r1-jjbuckner | Weak/unverified US-trader fit: Current channel description and videos focus on personal finances, restaurants, cars and consumer debt. |
| TheStockGuy | r1-thestockguy | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| TraderLion | r1-traderlion | Contact source could not be saved successfully; not a finding of poor audience fit. |
| Financial Wisdom | r1-financialwisdom | Only customer-support scope verified; no eligible creator/partnership contact verified. |
| Vincent Desiano | r1-vincentdesiano | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Option Omega | r1-optionomega | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Real Life Trading | r1-reallifetrading | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Figuring Out Money | r1-figuringoutmoney | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| Trade Pro | r1-tradepro | Weak/unverified US-trader fit: Fresh public video list is dominated by crypto/Bitcoin and altcoin setups rather than US equity trading. |
| Carmine Rosato | r1-carmine-rosato | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| StocksToTrade | r1-stockstotrade | Trading-tool sponsor fit, but an explicit partnership/co-marketing route has not been verified; press/general support alone is insufficient. |
| Jeremy Lefebvre - 1000xstocks | r1-financialeducation2 | No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient. |
| The Traveling Trader | r1-thetravelingtrader | The Traveling Trader: saved HTML has no contact/message form |
| Options With Davis | r1-optionswithdavis | Only customer-support scope verified; no eligible creator/partnership contact verified. |
| Cassandra Unchained | r1-michaeljburry | No published Message route verified on the author profile; Chat alone does not prove author contact. |
| The Regime Report | r1-theregimereport | Specific US stock/options fit remains unverified; contact policy is not the reason. |
| TradeIntel | r1-tradeintelligent | Specific US stock/options fit remains unverified; contact policy is not the reason. |
| r/Daytrading | r1-gvyvjwqt9m | Invite identity alone does not establish an available moderator-contact route; Reddit surface rechecked separately. |
| Scanz | audit-scanz | Only customer-support scope verified; no eligible creator/partnership contact verified. |
| EarningsBeats | audit-earningsbeats | Trading-tool sponsor fit, but an explicit partnership/co-marketing route has not been verified; press/general support alone is insufficient. |
| Sasha the Options Coach / TradersFly | audit-tradersfly | Sasha the Options Coach / TradersFly: saved HTML has no contact/message form |

## Dashboard viewport gates

Verified on the live URL https://gg-tourney-hub.vercel.app at 2026-10-07T13:42:41.138Z, and independently on the local production build. Browser tests log in, compare /api/leads with the DB, check all four filters on both views, check analytics/status and stage/group counts, measure document overflow, confirm internal scrolling and partial next-column visibility at 390/820, and collect console/page errors. 1440 fits all stage columns; internal scrolling is checked when overflow exists. Reduced motion has automatic scroll behavior and disabled animation/transition styles.

| Browser | Width | Motion | Page overflow (list/board) | Next-column peek | DB/group counts | Console errors | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chrome | 390 | Normal | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Chrome | 390 | Reduced | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Chrome | 820 | Normal | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Chrome | 820 | Reduced | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Chrome | 1440 | Normal | PASS / PASS | N/A | PASS | 0 — PASS | PASS |
| Chrome | 1440 | Reduced | PASS / PASS | N/A | PASS | 0 — PASS | PASS |
| Edge | 390 | Normal | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Edge | 390 | Reduced | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Edge | 820 | Normal | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Edge | 820 | Reduced | PASS / PASS | PASS | PASS | 0 — PASS | PASS |
| Edge | 1440 | Normal | PASS / PASS | N/A | PASS | 0 — PASS | PASS |
| Edge | 1440 | Reduced | PASS / PASS | N/A | PASS | 0 — PASS | PASS |

All 12 local combinations and all 12 live combinations pass. Evidence: `evidence/creator-audit-r2/local-viewports.json`, `live-viewports.json`, and matching list/board screenshots. Production candidate login/API/rendering checks are saved in `candidate-proof.json`. Build, TypeScript and CSV/score/draft contract test pass; lint has zero errors and one pre-existing unused-variable warning in `scripts/verify-youtube-dates-r1.mjs`. Contact-gate regressions pass for missing/inferred emails, home/video pages and redirects, absent provenance, mismatched forms, spoofed native hosts, stripped CSV research columns, and CSV/sidecar mismatches.

## Preservation, artifacts and rollback

The transaction archives original archived rows and actual live rows before deletion/upsert. 94 archive entries include removed targets, retained-row backups, original archives and the QA fixture. _r2_was_live distinguishes the pre-R2 live set; archive_reason is metadata inside the archive only. demo-creator-audit-r2-2026-10-07 is the run ID. All four workflow fields are proven preserved on the pre-R2 live set and restored original rows. Final accepted research is compared to DB field by field.

Canonical R2 artifacts: `data/creator-list-r2.json` (rows, decisions and evidence manifest), `data/creator-list-r2.csv`, and this report. Original `data/creator-demo-audit.json` and its original archive run remain intact. The prior report is saved in `evidence/creator-audit-r2/original-report.md`. Evidence snapshots: `merge-before.json`, `merge-after.json`, `r2-archive.json`, `merge-proof.json`, and `rollback-check.json`. No repo commit/reset or unrelated workspace cleanup was performed.

Database rollback: `node scripts/rollback-creator-r2.mjs` previews; add `--apply` to execute. It restores the 51 pre-R2 DB rows, preserves later workflow edits on retained rows, and refuses to delete newly restored/added rows if their workflow fields changed. New additions are deleted only when the current full JSON still equals the inspected row. Archive records remain after rollback. Review later edits before using rollback.

UI deployment rollback: `vercel --scope team_hRjHSu4sSUQnuotRYCgsIo19 rollback https://whoraised-leads-demo-chrfk2mij-rummancouk1-9706s-projects.vercel.app --yes`. Previous deployment: `dpl_5xEgUhaRZKGz6HFboGJmZKX3Yhub`. R2 live deployment: `dpl_7qohMaJsk8oEPKp6f74qadM73Cbx`, built as a production candidate with `--skip-domain`, authenticated candidate checks passed, then promoted. Database and UI rollbacks are separate operations; perform both to restore the entire pre-R2 experience.

## Pre-send polish — 7 October 2026

Live at [gg-tourney-hub.vercel.app](https://gg-tourney-hub.vercel.app): **40 priority / 12 long tail / 52 real leads**, plus one excluded EXAMPLE. Default list, board, summaries and analytics use priority leads; Show long tail (12) includes all real leads and can be unchecked. Status shows both tier counts on both routes. The 1,000 reach boundary, unknown sentinel and explicit fit-line geography patterns live in src/config/fit-weights.json; no per-name exclusions or persisted tier field. Halal Trader, You Got This Trading, TheoWave and Options Monitor are long tail.

The live DB and every data CSV were already free of the boilerplate sentence; remaining copies were removed from the audit doc and report generator. Real fit evidence remains intact. Final DB comparison verifies every stored field unchanged, including stages, notes, slugs, last touch and signups. Backups, data proof and the full viewport matrix live in [polish evidence](../evidence/polish-r1/). Deployment: dpl_DKPPucXrxd6F3JnuBVghKCCGy92o.

| Gate | Result |
|---|---|
| DB / CSV / docs boilerplate removal | PASS |
| DB tier counts; default list/board/analytics; toggle on/off | PASS — 40 / 12 / 52 |
| Workflow preservation / reversible tier | PASS — all DB fields unchanged; display-only config |
| Build / TypeScript / contract including 999, 1000, unknown, non-US boundaries | PASS |
| Lint | PASS — zero errors; one pre-existing unused-variable warning |
| Live console errors | PASS — zero in all 12 cases |

Each cell checks both list and board: no page overflow, exact DB membership and tier counts, analytics counts, reversible toggle, plus board internal scrolling and next-column peek at 390/820. Reduced motion checks scroll-behavior auto.

| Browser / viewport | Normal motion | Reduced motion |
|---|---|---|
| Chrome / 390 | PASS | PASS |
| Chrome / 820 | PASS | PASS |
| Chrome / 1440 | PASS | PASS |
| Edge / 390 | PASS | PASS |
| Edge / 820 | PASS | PASS |
| Edge / 1440 | PASS | PASS |

[Live results](../evidence/polish-r1/live-gates.json), [local results](../evidence/polish-r1/local-gates.json), [final DB/CSV proof](../evidence/polish-r1/final-data-proof.json). Mobile/tablet live screenshots were visually reviewed. No outreach was sent.
