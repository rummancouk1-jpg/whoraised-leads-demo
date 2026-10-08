import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {neon} from '@neondatabase/serverless';
import {schema} from './outreach-contract.mjs';
env.loadEnvConfig(process.cwd());
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const audit=await read('data/creator-list-r2.json');
const original=await read('data/creator-demo-audit.json');
const proof=await read('evidence/creator-audit-r2/merge-proof.json');
const live=await read('evidence/creator-audit-r2/live-viewports.json');
const local=await read('evidence/creator-audit-r2/local-viewports.json');
const sql=neon(process.env.DATABASE_URL);
const after=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const archive=await sql`SELECT slug,data FROM gg_creator_audit_archive WHERE run_id=${audit.run_id} ORDER BY slug`;
const bySlug=new Map(after.map(r=>[r.slug,r.data]));
for(const l of audit.accepted)for(const [key,value] of Object.entries(l))assert.deepEqual(bySlug.get(l.tracked_slug)?.[key],value,'DB differs from R2 artifact: '+l.tracked_slug+': '+key);
for(const r of archive.filter(r=>r.data._r2_was_live)){const target=bySlug.get(r.slug)||r.data;for(const key of proof.preserved_fields)assert.deepEqual(target[key],r.data[key]);}
assert(live.results.length===12&&live.results.every(r=>r.pass));
assert(local.results.length===12&&local.results.every(r=>r.pass));
await fs.writeFile('evidence/creator-audit-r2/merge-after.json',JSON.stringify(after,null,2));
await fs.writeFile('evidence/creator-audit-r2/r2-archive.json',JSON.stringify(archive,null,2));
proof.final_checked_at=new Date().toISOString();proof.all_final_research_matches=true;proof.live_viewports_passed=12;
await fs.writeFile('evidence/creator-audit-r2/merge-proof.json',JSON.stringify(proof,null,2));
try{await fs.copyFile('docs/CREATOR_LIST_AUDIT.md','evidence/creator-audit-r2/original-report.md',fs.constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
const cell=s=>String(s??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();
const table=(headers,rows)=>'| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.map(cell).join(' | ')+' |').join('\n');
const audience=l=>l.audience_size?l.audience_size.toLocaleString('en-US'):'Unknown';
const group=l=>schema.GROUP_NAMES[l.kind];
const restored=audit.decisions.filter(d=>d.decision==='restore');
const added=audit.decisions.filter(d=>d.decision==='add');
const earnings=audit.accepted.filter(l=>l.covers_earnings==='y').length;
const top=audit.top15.map(s=>audit.accepted.find(l=>l.tracked_slug===s));
const small=audit.accepted.filter(l=>l.audience_size<5000);
const originalRemoved=original.records.filter(r=>r.decision==='remove');
const sponsorPending=['r1-stockstotrade','audit-scanz','audit-earningsbeats'];
const lines=[
'# Creator list audit — R2 correction, 7 October 2026',
'',
`**${audit.count} qualified surfaces: ${audit.groups.creator} Creators, ${audit.groups.newsletter} Newsletters, ${audit.groups.community} Communities, and ${audit.groups.sponsor} Potential sponsors.** Newsletters + Communities = ${audit.groups.newsletter+audit.groups.community}. ${restored.length} previously archived rows restored; ${added.length} new rows added; ${proof.removals.length} previously live rows archived. The separate EXAMPLE fixture remains in the DB, giving ${after.length} total records. It is excluded from qualified counts and default views.`,
'',
'The list is for a free earnings-gap prediction contest, $1,000 prize, US 18+, October 19–November 13. Qualification means an evidence-backed route and plausible audience relevance, not agreement to share, verified US residence, or consent to receive outreach. No contact messages or forms were submitted.',
'',
'## Corrected rules and evidence',
'',
'1. Any creator/community-published contact, business, media or sponsorship route can count on any domain. A named address is valid; addresses inferred or scraped from unrelated sources and customer-support-only routes are rejected. FX Evolution explicitly publishes its support-named address for business enquiries. MarketChameleon’s affiliate page invites contact about partner offerings, linking to its general contact page; the published email therefore has a documented partnership context.',
'2. Substack Message on the publication owner’s profile, Reddit modmail and a published Discord moderator route count. Owner identity is linked from the publication About preload to the author profile. Chat alone and a Discord invite alone do not establish contact. Discord rows here use verified owner email routes; no moderator route is invented.',
'3. Reddit direct HTTP/Chrome requests returned 403. Successful public `about.json?raw_json=1` reader responses supply descriptions, subscriber counts and promotion restrictions. Blocked attempts remain in the research manifest. They do not establish poor fit. Public reader output is saved separately from HTML.',
'4. `scripts/contact-evidence-gate.mjs` validates email/form appearance in the saved HTML for the exact contact source, requires successful capture provenance, and rejects homepages, video tabs and redirects to those surfaces. Forms need actual email/message controls, including the observed Showit contact form. Native rows store the platform URL. `scripts/import-csv.mjs` calls this gate before authentication or mutation through `scripts/audited-csv-gate.mjs`; all real imports require matching JSON evidence sidecars, including base/legacy CSVs. CSV/sidecar contact mismatches fail. QA-only EXAMPLE imports remain separate.',
'5. Major media, exchanges, brokers and ad-sales-only routes are excluded from creator outreach and archived with `paid-media only`. Trading tools enter Potential sponsors only where a partnership/co-marketing route was verified. Affiliate programs are possible partnership routes, not promises of cash sponsorship or unpaid promotion.',
'',
`Every qualified row has covers_earnings, a one-line explanation and source URL: ${earnings} y, ${audit.count-earnings} n. **n means explicit earnings coverage was not verified in the checked description/recent titles**, not proof the target never discusses earnings. y requires an actual source statement/title; fit wording and negative “no earnings example” text are not counted. The r/options earnings example is saved in evidence/creator-audit-r2/options-earnings-reader.txt. Other earnings evidence is in the original Oct 7 source-load JSONs and the R2 saved About HTML.`,
'',
'Reach is an observed public subscriber/follower/member display, often rounded; it is not US adult reach. Unknown newsletter reach is `0` solely because the existing schema is numeric. Low-reach rows have explicit inclusion reasons below and are not used to inflate the Top 15.',
'',
'The retained surfaces share owners: TanukiTrade newsletter/Discord, TradingWarz creator/newsletter, and Unusual Whales tool/Discord. Coordinate one invitation per owner, then choose the best channel. Newsletter subscriber counts and Discord members must not be summed as independent people.',
'',
'## Counts by group',
'',
table(['Group','Qualified rows'],Object.entries(audit.groups).map(([k,n])=>[schema.GROUP_NAMES[k],n])),
'',
'## Restored rows',
'',
table(['Name','Group','Reason','contact_type','contact_source_url'],restored.map(d=>{const l=audit.accepted.find(l=>l.tracked_slug===d.slug);return[l.name,group(l),d.reason,l.contact_type,l.contact_source_url]})),
'',
'## New rows',
'',
table(['Name','Group','Reason','contact_source_url'],added.map(d=>{const l=audit.accepted.find(l=>l.tracked_slug===d.slug);return[l.name,group(l),d.reason,l.contact_source_url]})),
'',
'## Re-evaluation of every original removal',
'',
'The original 41 removed rows remain traceable by slug. Current inability to save an eligible route is unresolved evidence; it is not a negative audience-fit finding. JJ Buckner and Trade Pro retain their separate weak-fit findings; the other missing-route cases were checked under the corrected published-route policy.',
'',
table(['Original removed name','Slug','R2 result','Reason'],originalRemoved.map(r=>{const d=audit.decisions.find(d=>d.slug===r.lead.tracked_slug);assert(d,'Original removal missing decision');return[r.lead.name,r.lead.tracked_slug,d.decision,d.reason]})),
'',
'## Reddit verification and promotion rules',
'',
'Modmail is a request for permission. None of these communities has approved this contest. Restrictions reduce ease-of-route scores. No public contest post is authorized by this research.',
'',
table(['Community','Subscribers','Promotion status','Evidence'],audit.accepted.filter(l=>l.platform==='Reddit').map(l=>[l.name,audience(l),l.promotion_rules,l.source_url])),
'',
'r/stocks explicitly bans spam, ads, solicitations and self-promotion; r/StockMarket explicitly prohibits self-promotion including personal sites and Discord links. Their inclusion is for moderator permission requests only, with an exception required. r/thetagang similarly bans direct self-promotion; r/Daytrading bans promotion and disguised advertising. Only r/options explicitly describes pre-approval for free items/developers. An exception is not assumed elsewhere.',
'',
'## Paid-media archive list',
'',
`All ${audit.paid_media.length} excluded paid-media/major-corporate targets are represented in gg_creator_audit_archive under ${audit.run_id}, including the provisional IBD and Zacks rows carried from the original archive. This category names the exclusion reason; it does not imply that every company lacks other public email addresses.`,
'',
table(['Name','Slug','Archive reason'],audit.paid_media.map(l=>[l.name,l.slug,l.reason])),
'',
'## Top 15',
'',
audit.ranking,
'',
'The logarithmic reach factor avoids letting large general audiences overwhelm earnings fit. Earnings n retains a 0.35 factor for relevant retail-trading audiences. Modmail is 0.2 because permission must be sought. Potential sponsors are separate. The dashboard defaults to this score; the existing fit-score filter remains available. No Top 15 row has a known audience below 5,000.',
'',
table(['Name','Group','Audience','covers_earnings','Fit line','contact_type','contact_source_url'],top.map(l=>[l.name,group(l),audience(l),l.covers_earnings,`${l.fit_evidence}`,l.contact_type,l.contact_source_url])),
'',
'## Potential sponsors',
'',
table(['Name','Audience surface','covers_earnings','Why co-promote or sponsor','contact_type','Contact','contact_source_url'],audit.accepted.filter(l=>l.kind==='sponsor').sort((a,b)=>b.priority_score-a.priority_score).map(l=>[l.name,`${l.platform}: ${audience(l)}`,l.covers_earnings,l.fit_evidence,l.contact_type,l.contact,l.contact_source_url])),
'',
'StocksToTrade, Scanz and EarningsBeats were researched but remain outside the qualified sponsor list: press/customer support does not establish partnership scope. They are archived reversibly as unresolved route evidence, with reasons below.',
'',
table(['Potential sponsor held out','Reason'],sponsorPending.map(s=>{const d=audit.decisions.find(d=>d.slug===s);return[d.name,d.reason]})),
'',
'## Small and unknown audiences: reasons for inclusion',
'',
table(['Name','Audience','Stated reason and source'],small.map(l=>[l.name,audience(l),`${l.fit_evidence} ${l.audience_evidence}`])),
'',
'## Remaining route/evidence holds',
'',
table(['Name','Slug','Reason'],audit.decisions.filter(d=>d.decision==='pending').map(d=>[d.name,d.slug,d.reason])),
'',
'## Dashboard viewport gates',
'',
`Verified on the live URL ${live.origin} at ${live.checked_at}, and independently on the local production build. Browser tests log in, compare /api/leads with the DB, check all four filters on both views, check analytics/status and stage/group counts, measure document overflow, confirm internal scrolling and partial next-column visibility at 390/820, and collect console/page errors. 1440 fits all stage columns; internal scrolling is checked when overflow exists. Reduced motion has automatic scroll behavior and disabled animation/transition styles.`,
'',
table(['Browser','Width','Motion','Page overflow (list/board)','Next-column peek','DB/group counts','Console errors','Overall'],live.results.map(r=>[r.browser,r.width,r.reducedMotion==='reduce'?'Reduced':'Normal','PASS / PASS',r.gates.peek,'PASS','0 — PASS',r.pass?'PASS':'FAIL'])),
'',
'All 12 local combinations and all 12 live combinations pass. Evidence: `evidence/creator-audit-r2/local-viewports.json`, `live-viewports.json`, and matching list/board screenshots. Production candidate login/API/rendering checks are saved in `candidate-proof.json`. Build, TypeScript and CSV/score/draft contract test pass; lint has zero errors and one pre-existing unused-variable warning in `scripts/verify-youtube-dates-r1.mjs`. Contact-gate regressions pass for missing/inferred emails, home/video pages and redirects, absent provenance, mismatched forms, spoofed native hosts, stripped CSV research columns, and CSV/sidecar mismatches.',
'',
'## Preservation, artifacts and rollback',
'',
`The transaction archives original archived rows and actual live rows before deletion/upsert. ${archive.length} archive entries include removed targets, retained-row backups, original archives and the QA fixture. _r2_was_live distinguishes the pre-R2 live set; archive_reason is metadata inside the archive only. ${audit.run_id} is the run ID. All four workflow fields are proven preserved on the pre-R2 live set and restored original rows. Final accepted research is compared to DB field by field.`,
'',
'Canonical R2 artifacts: `data/creator-list-r2.json` (rows, decisions and evidence manifest), `data/creator-list-r2.csv`, and this report. Original `data/creator-demo-audit.json` and its original archive run remain intact. The prior report is saved in `evidence/creator-audit-r2/original-report.md`. Evidence snapshots: `merge-before.json`, `merge-after.json`, `r2-archive.json`, `merge-proof.json`, and `rollback-check.json`. No repo commit/reset or unrelated workspace cleanup was performed.',
'',
'Database rollback: `node scripts/rollback-creator-r2.mjs` previews; add `--apply` to execute. It restores the 51 pre-R2 DB rows, preserves later workflow edits on retained rows, and refuses to delete newly restored/added rows if their workflow fields changed. New additions are deleted only when the current full JSON still equals the inspected row. Archive records remain after rollback. Review later edits before using rollback.',
'',
'UI deployment rollback: `vercel --scope team_hRjHSu4sSUQnuotRYCgsIo19 rollback https://whoraised-leads-demo-chrfk2mij-rummancouk1-9706s-projects.vercel.app --yes`. Previous deployment: `dpl_5xEgUhaRZKGz6HFboGJmZKX3Yhub`. R2 live deployment: `dpl_7qohMaJsk8oEPKp6f74qadM73Cbx`, built as a production candidate with `--skip-domain`, authenticated candidate checks passed, then promoted. Database and UI rollbacks are separate operations; perform both to restore the entire pre-R2 experience.',
'',
];
await fs.writeFile('docs/CREATOR_LIST_AUDIT.md',lines.join('\n'));
const lessonFile='docs/LESSONS.md';const lessons=await fs.readFile(lessonFile,'utf8');
const heading='## 7 October 2026 — R2 creator audit correction';
if(!lessons.includes(heading))await fs.appendFile(lessonFile,'\n'+heading+'\n\n'+[
'- This correction supersedes the earlier instruction to reject personal-looking addresses. A named address published by its owner for contact/business/media/sponsorship is valid on any domain. Customer-support-only and inferred addresses still fail.',
'- Strict contact-form or generic-role-address rules bias lists toward corporations. Start from people and communities who could plausibly say yes to a free contest.',
'- Platform-native routes count: Substack owner messaging, Reddit modmail and published Discord moderator contact. Save the actual platform URL and confirm ownership/contact scope.',
'- Crawler failure ≠ unfit. Save blocked attempts separately and verify Reddit descriptions, subscribers and promotion rules through old.reddit.com or about.json. Permission requests are not permission to post.',
'- Padding with unreachable big names is worse than a shorter list. Separate potential tool sponsors; archive major media, brokers, exchanges and ad-sales-only targets as paid-media only.',
'- Rule 4 is permanent in scripts/import-csv.mjs through audited-csv-gate.mjs and contact-evidence-gate.mjs: real imports require matching sidecars and saved HTML containing the email or actual form; homepages, video tabs and redirects to them fail. Stripping audit columns does not bypass the check.',
'- Unknown audience is not zero readers. Explicitly label the numeric sentinel and state a reason for including audiences under 5k.',
'- Merge only research/contact fields into live JSON, archive before deletion and verify workflow preservation against captured DB state. Test all Chrome/Edge viewport and reduced-motion combinations after shared data loads.',
].join('\n')+'\n');
console.log(JSON.stringify({report:'docs/CREATOR_LIST_AUDIT.md',count:audit.count,groups:audit.groups,restored:restored.length,new:added.length,paid_media:audit.paid_media.length,live_passed:live.results.length,final_db_matches:true}));
