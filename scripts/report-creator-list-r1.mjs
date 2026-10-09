import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const a=JSON.parse(await fs.readFile('data/creator-list-r1-audit.json','utf8'));
const v=JSON.parse(await fs.readFile('evidence/creator-list-r1/verification.json','utf8'));
assert.equal(v.browsers.length,2);assert.equal(v.apiCount,a.count);
for(const b of v.browsers){assert.equal(b.draftLinksVerified,66);assert.equal(b.checks.length,30);assert(b.checks.every(c=>c.status==='PASS'));assert.deepEqual(b.errors,[]);}
const escape=s=>s.replaceAll('|','\\|');
const text=`# Creator list R1 — production import

66 researched creator/community entries imported into [GG Outreach](https://whoraised-leads-demo.vercel.app) on October 7, 2026. Production contains **66 real leads + 1 existing EXAMPLE fixture = 67 rows**. All new leads remain New, signups 0 and last_touch blank. No outreach messages were sent.

## Delivery and deployment gate

- [Import CSV](../data/creator-list-r1.csv) — exact real importer schema; 66 unique tracked slugs, all prefixed r1-.
- [Research/score audit](../data/creator-list-r1-audit.json), [YouTube channel evidence](../data/creator-youtube-research-r1.json), [exact YouTube upload dates](../data/creator-youtube-verified-r1.json), [newsletter evidence](../data/creator-research-r1.json), [Discord presence and X permalinks](../data/creator-community-research-r1.json), [public contact/source evidence](../data/creator-public-source-evidence-r1.json).
- Gate satisfied before import: public HEAD /go/r1-deployment-probe returned HTTP 302, X-Matched-Path /go/[slug], no-store and destination utm_content=r1-deployment-probe. The click-tracking deployment is documented in [GG_CLICK_TRACKING.md](GG_CLICK_TRACKING.md), deployment dpl_6aE6p82pPmqLLb7y67ewZkrNjZQe.
- Pulled latest with git pull --ff-only origin main; resulting HEAD da7520b36182d557e630a96de541e604c3b0ef1b. Existing uncommitted application changes were preserved. This task made no commit or deployment.
- Imported using **node scripts/import-csv.mjs https://whoraised-leads-demo.vercel.app data/creator-list-r1.csv**, the existing authenticated production importer, with replace=false and oneTime=true. No direct database insertion or mocked API.
- CSV SHA-256: ${v.csvSha256}.

## Platform split

| Platform | Rows |
|---|---:|
${Object.entries(a.platforms).map(([p,n])=>`| ${p} | ${n} |`).join('\n')}
| Total | 66 |

Trading podcasts are represented through their real supported distribution platform: Chat With Traders and B The Trader on YouTube; DailyStockPick's newsletter includes its podcast. These are not duplicate podcast rows. All 25 newsletter rows are Substack publications; beehiiv was researched but has no supported platform enum and was not mislabeled. YouTube rows all have public subscriber counts between 5,000 and 500,000.

## Verification and data interpretation

The activity window is **September 7–October 7, 2026**, verified October 7. Every row's notes contain group, owner, channel, source URL, activity date and URL, audience provenance, one-line fit and suggested pitch angle. No extra columns were added to the CSV; group/channel/fit/angle use notes because the importer does not have dedicated fields for them.

YouTube evidence uses each channel's public subscriber label and a recent video with an exact datePublished meta value. Substack evidence uses the publication's own dated archive and About-page public subscriber label. Reddit evidence uses dated public discussion plus the community's current rules; member counts are explicitly labelled members/subscribers, not the newer weekly visitor metric.

Discord communities have **current public online presence** on October 7: TanukiTrade 1,066 online / 6,027 approximate members; Unusual Whales 9,573 / 98,652; r/Daytrading 2,605 / 32,987. This verifies currently active communities via Discord's public invite API, not private message publication dates. Their official newsletter/site/subreddit links establish ownership. Private server promotion policies were not accessible; notes require administrator approval.

The X account's October 5 stock-catalyst post is available as a direct X permalink in notes, indexed by DailyGram, with the timestamp cross-checked against its status ID. Direct X access was restricted. A secondary cached follower estimate of 5.4M is recorded separately; the imported primary-source audience remains unknown.

**${a.unknownAudience.length} audience sizes are undisclosed:** ${a.unknownAudience.map(escape).join('; ')}. The schema requires a nonnegative integer, so these use **0 as a missing-data sentinel**, explicitly explained in each row. They are not claimed to have zero subscribers. The unchanged fit config consequently puts them in its Under 5K band, which understates their audience factor. Public counts elsewhere are rounded/lower-bound or approximate counts, not precise census figures. US focus describes the covered market and is an editorial judgment; US audience residency is not measured. Mixed-market and futures-heavy secondary candidates are flagged in their fit notes.

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
${a.top15.map((r,i)=>`| ${i+1} | ${escape(r.name)} | ${r.platform} | ${r.score} | [/go/${r.slug}](https://whoraised-leads-demo.vercel.app/go/${r.slug}) |`).join('\n')}

## Production browser checks

[Raw verification](../evidence/creator-list-r1/verification.json), captured ${v.checkedAt}. Actual installed Chrome and Edge, headless desktop automation; no emulation claimed as a physical-device test.

- Authenticated production API returned all 66 imported slugs in both browsers; total 67, real count 66.
- Opened **every imported lead's actual deployed drawer in both browsers** and verified its generated pitch contains https://whoraised-leads-demo.vercel.app/go/<that-lead-slug>: 132 pitch checks. Notes match the persisted row.
- Five uniformly random rows sampled without replacement using crypto.randomInt and reused across both browsers. Each opened at 390, 820 and 1440 pixels, in normal and reduced motion: **60 responsive drawer checks passed**. Checked correct heading/pitch, settled bounds inside the viewport and no page-level horizontal overflow. Narrow tables intentionally allow internal horizontal scrolling.
- Reduced-motion dashboard checks found no active CSS animations or transitions. No browser page errors in either browser. A 390-pixel reduced-motion screenshot was visually inspected and showed readable content and usable drawer controls.

| Browser | Version | All lead pitch checks | Sampled width/motion checks |
|---|---|---:|---:|
${v.browsers.map(b=>`| ${b.channel==='chrome'?'Chrome':'Microsoft Edge'} | ${b.version} | ${b.draftLinksVerified} PASS | ${b.checks.length} PASS |`).join('\n')}

| Random row | 390 normal/reduced | 820 normal/reduced | 1440 normal/reduced |
|---|---|---|---|
${v.sample.map(s=>`| ${s.slug} | Chrome + Edge PASS | Chrome + Edge PASS | Chrome + Edge PASS |`).join('\n')}

Screenshots for each of the 60 checks are linked by filename in the raw verification JSON. Generic production pitch wording remains the existing configured draft; the tailored suggested pitch angle is in each lead's notes. All pitches use the new /go/ link. No campaign link was clicked during this list verification, so tests did not inflate real-lead click counts.
`;
await fs.writeFile('docs/CREATOR_LIST_R1.md',text);console.log('Report saved: docs/CREATOR_LIST_R1.md');
