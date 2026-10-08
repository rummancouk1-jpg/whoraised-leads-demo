import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {checkContactEvidence} from './contact-evidence-gate.mjs';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const original=await read('data/creator-demo-audit.json');
const archive=await read('evidence/creator-audit-r2/original-archive.json');
const before=await read('evidence/creator-audit-r2/before.json');
const research=await read('data/creator-research-r2.json');
const records=new Map(original.records.map(r=>[r.lead.tracked_slug,r]));
const rows=new Map([...original.records.map(r=>[r.lead.tracked_slug,r.lead]),...original.accepted.map(l=>[l.tracked_slug,l])]);
const archived=new Map(archive.map(r=>[r.slug,r.data]));
const current=new Map(before.map(r=>[r.slug,r.data]));
const manifest=research.filter(r=>r.status===200).map(r=>({...r}));
const sources=[];
for(const f of ['creator-audit-source-loads','creator-backfill-source-loads','creator-additional-source-loads','creator-corrected-loads','creator-extra-loads'])sources.push(...await read(`data/${f}.json`));
const paid=new Set(['audit-barrons','audit-bloombergtelevision','audit-cboeglobalmarkets','audit-cnbctelevision','audit-interactivebrokers','audit-investorplace','audit-morningstar','audit-marketwatch','audit-nasdaq','audit-nyseofficial','audit-seekingalpha','audit-schaeffersresearch','audit-simplywallst','audit-tradingview','audit-wsj','audit-yahoofinance','r1-benzinga','r1-stockchartstv','r1-traderisk','audit-investorsbusinessdaily','audit-zacksinvestmentresearch']);
const sponsors=new Set(['r1-optionstrat','r1-trendspider','audit-tradeideas','audit-optionalpha','audit-marketchameleon','r1-stockstotrade','audit-scanz','audit-earningsbeats','r1-unusual-whales']);
const overrides={
 'r1-dd8njgqweq':['email','support@tanuki-trade.com','https://tanukitrade.com/contact.htm','Published contact page explicitly offers direct questions to the product owner, not just customer-account support.'],
 'r1-stockedup':['email','mike@stockedup.university','https://www.stockedup.university/contact-us','Named creator address published on its contact page; previous personal-looking rejection corrected.'],
 'r1-theotrade':['email','Stacie@theotrade.com','https://theotrade.com/contact/','Named media-relations contact published by TheoTrade; previous personal-looking rejection corrected.'],
 'r1-tradingwarzofficial':['email','rich@tradingwarz.com','https://tradingwarz.com/resources/','Named creator address published in the site footer on Resources; previous personal-looking rejection corrected.'],
 'r1-outliertrading':['email','erik@outliertrading.io','https://www.outliertrading.io/about','Creator publishes the named contact on About; prior missing-business-route rejection corrected.'],
 'r1-optionsplay':['email','info@optionsplay.com','https://www.youtube.com/@OptionsPlay/about?hl=en','Official channel About publishes this contact; no separate corporate role address required.'],
 'r1-tradesbymatt':['email','partner@tbm.gg','https://www.youtube.com/@tradesbymatt/about?hl=en','About explicitly labels this email for business inquiries.'],
 'r1-fxevolutionvideo':['email','support@fxevolution.com','https://www.youtube.com/@fxevolutionvideo/about?hl=en','About explicitly labels this address Business enquiries; it is not customer-support-only despite its local part.'],
 'r1-bthetrader87':['form','https://www.bthetrader.com/contact','https://www.bthetrader.com/contact','The actual Contact page contains the validated Showit email/name/message fields.'],
 'r1-thetravelingtrader':['form','https://www.thetravelingtrader.com/contact','https://www.thetravelingtrader.com/contact','Contact/message form is present in saved direct HTTP HTML; browser later blocked by ClickFunnels.'],
 'audit-optionalpha':['email','affiliates@optionalpha.com','https://optionalpha.com/affiliates','Affiliate page explicitly invites partnerships and co-marketing campaigns.'],
 'audit-tradeideas':['email','marissa@trade-ideas.com','https://www.trade-ideas.com/affiliate-program/','Affiliate program publishes named contact for referral partnerships.'],
 'audit-marketchameleon':['email','support@marketchameleon.com','https://marketchameleon.com/affiliates','Affiliate program explicitly invites partners; the email appears on that published partnership page.'],
};
const rejected=new Map(); const accepted=[];const decisions=[];
function success(url){return research.filter(r=>r.url===url&&r.status===200&&r.file).at(-1);}
function parsePreload(h){const m=h.match(/window\._preloads\s*=\s*JSON\.parse\(("(?:\\.|[^"\\])*")\)/);return m?JSON.parse(JSON.parse(m[1])):null;}
function owner(p){let result;function walk(v){if(v&&typeof v==='object'){if(v.owner===true&&v.handle&&v.user_id&&!result)result=v;for(const x of Object.values(v))walk(x)}}walk(p);return result;}
function count(text){const m=text.match(/([\d,.]+)([KM])?\+?\s+subscribers/i);return m?Math.round(Number(m[1].replaceAll(',',''))*({K:1000,M:1000000}[m[2]?.toUpperCase()]||1)):0;}
async function finish(l,reason,sourceText='',sourceUrl=''){
 const prev=current.get(l.tracked_slug)||archived.get(l.tracked_slug);
 if(prev)for(const key of ['stage','signups','last_touch','notes'])l[key]=prev[key];
 l.source_url_live='y';l.verified_at=new Date().toISOString();
 l.source_url=sourceUrl||records.get(l.tracked_slug)?.source_url||l.notes?.match(/Source: (https:\/\/\S+)/)?.[1]?.replace(/\.$/,'')||l.contact_source_url;
 const loaded=sources.find(s=>s.slug===l.tracked_slug)||sources.find(s=>s.source_url===l.source_url||s.url===l.source_url);
 const corpus=sourceText||loaded?.content||'';
 const earnings=corpus.match(/.{0,75}\bearnings\b.{0,110}/i);
 l.covers_earnings=earnings?'y':'n';
 l.earnings_evidence=earnings?earnings[0].replace(/\s+/g,' ').trim():'No explicit earnings coverage found in the checked public description/recent titles; broad stock/options fit only.';
 l.earnings_source_url=sourceUrl||loaded?.source_url||loaded?.url||l.source_url;
 if(l.audience_size<5000)l.audience_evidence=(l.audience_evidence||'Public displayed count.')+(l.audience_size===0?' Count unavailable; 0 is the schema sentinel, not zero readers. Included because ':' Under 5k included because ')+(l.covers_earnings==='y'?'the author explicitly covers earnings and publishes a direct route.':'the author publishes a relevant stock/options trading newsletter and a Message route; low or unknown reach keeps it out of the priority list.');
 else l.audience_evidence ||= 'Approximate public channel/member display verified in the Oct 7 source evidence; market coverage does not establish US residency.';
 const reach=l.audience_size?Math.min(1,Math.log10(1+l.audience_size)/6):0.2;
 const fit=l.us_trader_fit==='strong'?1:0.6;
 const earningsFactor=l.covers_earnings==='y'?1:0.35;
 const ease={email:1,form:0.8,substack:0.65,modmail:0.2,'discord-mod':0.3}[l.contact_type];
 l.priority_score=Math.round(reach*fit*earningsFactor*ease*10000)/100;
 try{const check=await checkContactEvidence(l,manifest);accepted.push(l);decisions.push({slug:l.tracked_slug,name:l.name,decision:current.has(l.tracked_slug)?'retain':archived.has(l.tracked_slug)?'restore':'add',reason,check});}catch(e){rejected.set(l.tracked_slug,e.message);decisions.push({slug:l.tracked_slug,name:l.name,decision:'pending',reason:e.message});}
}
for(const [slug,input] of rows){
 const l={...input};
 if(paid.has(slug)){decisions.push({slug,name:l.name,decision:'archive',reason:'paid-media only'});continue;}
 if(l.platform==='Reddit')continue;
 if(l.platform==='Substack'){
  if(l.us_trader_fit==='weak'){decisions.push({slug,name:l.name,decision:'pending',reason:'Specific US stock/options fit remains unverified; contact policy is not the reason.'});continue;}
  const source=records.get(slug)?.source_url||l.notes.match(/Source: (https:\/\/\S+)/)?.[1]?.replace(/\.$/,'');
  const about=success(source);if(!about){rejected.set(slug,'About source not saved');decisions.push({slug,name:l.name,decision:'pending',reason:'About source could not be saved; contact and fit remain unresolved.'});continue;}
  const p=parsePreload(await fs.readFile(about.file,'utf8'));const a=owner(p);
  const profile=a?success(`https://substack.com/@${a.handle}`):null;
  if(!profile||!/\bMessage\b/.test(profile.text)){decisions.push({slug,name:l.name,decision:'pending',reason:'No published Message route verified on the author profile; Chat alone does not prove author contact.'});continue;}
  Object.assign(l,{kind:'newsletter',contact_type:'substack',contact:profile.url,contact_source_url:profile.url,contact_evidence_file:profile.file,audience_size:count(profile.text),audience_evidence:`${profile.url}: public newsletter subscriber display (rounded where K/M/+ is shown).`});
  await finish(l,'Creator-published Substack Message route now counts; author/publication ownership is linked by its About page.',about.text,about.url);continue;
 }
 if(l.platform==='Discord'&&slug==='r1-gvyvjwqt9m'){decisions.push({slug,name:l.name,decision:'pending',reason:'Invite identity alone does not establish an available moderator-contact route; Reddit surface rechecked separately.'});continue;}
 const choice=overrides[slug];
 if(!current.has(slug)&&!choice){decisions.push({slug,name:l.name,decision:'pending',reason:records.get(slug)?.reason?.replace(/personal-looking[^;]*;/gi,'')||'No creator-published route verified after corrected-rule recheck.'});continue;}
 if(sponsors.has(slug))l.kind='sponsor';
 const type=choice?.[0]||(/@/.test(l.contact)?'email':'form');
 const contact=choice?.[1]||l.contact;const url=choice?.[2]||l.contact_source_url;
 const page=success(url);
 if(!page){decisions.push({slug,name:l.name,decision:'pending',reason:'Contact source could not be saved successfully; not a finding of poor audience fit.'});continue;}
 if(['r1-optionswithdavis','audit-scanz','r1-financialwisdom'].includes(slug)){decisions.push({slug,name:l.name,decision:'pending',reason:'Only customer-support scope verified; no eligible creator/partnership contact verified.'});continue;}
 if(slug==='r1-stockstotrade'||slug==='audit-earningsbeats'){decisions.push({slug,name:l.name,decision:'pending',reason:'Trading-tool sponsor fit, but an explicit partnership/co-marketing route has not been verified; press/general support alone is insufficient.'});continue;}
 Object.assign(l,{contact_type:type,contact,contact_source_url:url,contact_evidence_file:page.file});
 if(l.kind==='sponsor'){
  const why={ 'r1-optionstrat':'Options strategy visualization could co-promote an earnings expected-move prediction challenge to its users.', 'r1-trendspider':'Earnings strategy tools and its business/education partnerships align with a retail earnings contest.', 'audit-tradeideas':'Stock scanners could co-promote earnings movers through its published affiliate partnership program.', 'audit-optionalpha':'Options automation/backtesting plus its explicit co-marketing program could support an earnings challenge.', 'audit-marketchameleon':'Earnings and options research tools directly complement predicted earnings gaps; published affiliate program offers a partnership route.', 'r1-unusual-whales':'Options-flow data and a published partnerships email could support a joint earnings contest for retail traders.' };
  l.fit_evidence=why[slug]||l.fit_evidence;
 }
 await finish(l,choice?.[3]||'Published route retained after saved-HTML gate; outreach history preserved.');
}
// New newsletter: earnings-call reporting with a published author contact.
const transcript=success('https://thetranscript.substack.com/about');const profile=success('https://substack.com/@thetranscript');
if(transcript&&profile)await finish({name:'The Transcript',handle:'@thetranscript',platform:'Substack',kind:'newsletter',audience_size:count(profile.text),niche:'earnings',us_focus:'yes',contact:'admin@theweeklytranscript.com',tracked_slug:'r2-the-transcript',stage:'New',signups:0,last_touch:'',notes:'',contact_type:'email',contact_source_url:transcript.url,contact_evidence_file:transcript.file,us_trader_fit:'strong',fit_evidence:'Weekly earnings-call digest gives readers management commentary; a free earnings-gap challenge is a relevant editorial/community invitation.',audience_evidence:`${profile.url}: 33K+ newsletter subscribers, rounded public display.`},'New earnings newsletter; About explicitly publishes its editorial contact.',transcript.text,transcript.url);
// Platform-native Reddit routes use the successful public JSON reader, not blocked crawler HTML.
const redditFiles=['evidence/creator-audit-r2/reddit-reader.txt','evidence/creator-audit-r2/reddit-reader-additional.txt','evidence/creator-audit-r2/reddit-new-communities.txt'];
const redditText=await Promise.all(redditFiles.map(f=>fs.readFile(f,'utf8')));
const redditRules={options:'Promotion including free items requires moderator pre-approval; developers must contact mods before posting. Modmail inquiry only until approved.',thetagang:'No sales/referrals, advertisements, social-media spam or self-promotion. Ask mods about an exception; no public promotion permission is established.',Daytrading:'No spam, sales, promotion or disguised advertising. Content creators have separate guidelines. Ask mods for contest permission; no public promotion permission is established.',stocks:'Self-promotion/advertising is restricted. Ask moderators for explicit approval before sharing a free contest.',StockMarket:'Promotion is restricted to the community rules; ask moderators for explicit approval before sharing a free contest.'};
for(const sub of ['options','thetagang','Daytrading','stocks','StockMarket']){
 const idx=redditText.findIndex(s=>s.includes(`"display_name": "${sub}"`));if(idx<0)continue;
 const s=redditText[idx];const start=s.indexOf(`"display_name": "${sub}"`);const size=Number(s.slice(start,start+1600).match(/"subscribers": (\d+)/)?.[1]||0);
 const slug=['options','thetagang','Daytrading'].includes(sub)?`r1-r-${sub.toLowerCase()}`:`r2-r-${sub.toLowerCase()}`;
 const base=rows.get(slug)||{name:`r/${sub}`,handle:`r/${sub}`,platform:'Reddit',kind:'community',audience_size:size,niche:'options',us_focus:'yes',tracked_slug:slug,stage:'New',signups:0,last_touch:'',notes:''};
 const source=`https://www.reddit.com/r/${sub}/about.json?raw_json=1`;manifest.push({url:source,file:redditFiles[idx],status:200,checked_at:new Date().toISOString(),access_method:'web reader; direct crawler and Chrome returned 403'});
 const url=`https://www.reddit.com/message/compose/?to=r/${sub}`;
 const l={...base,kind:'community',audience_size:size,contact_type:'modmail',contact:url,contact_source_url:url,contact_evidence_file:redditFiles[idx],source_url:source,promotion_rules:redditRules[sub],us_trader_fit:sub==='Daytrading'?'partial':'strong',fit_evidence:sub==='options'?'Active exchange-traded options community with a recent Micron earnings IV-crush setup; request a moderator-approved free contest.':sub==='thetagang'?'Stock-option premium sellers are relevant to earnings volatility; ask moderators about a free community challenge.':`Public ${sub} community discusses US stocks/trading; moderator permission must be requested for any contest share.`,audience_evidence:`${source}: ${size.toLocaleString()} subscribers returned by the public JSON reader; an observed count, not verified US residency.`};
 await finish(l,'Crawler failure corrected using successful about.json reader; native moderator contact counts. Promotion remains permission-gated.',sub==='options'?'Public community post: [MU] Earnings IV Crush Setup for Oct 2nd.':'Public stock/options discussion.',source);
 if(sub==='options') { l.earnings_source_url='https://www.reddit.com/r/options/';l.earnings_evidence='Public feed includes “[MU] Earnings IV Crush Setup for Oct 2nd,” discussing post-announcement implied-volatility drops.';l.earnings_evidence_file='evidence/creator-audit-r2/options-earnings-reader.txt'; }
}
assert.equal(new Set(accepted.map(l=>l.tracked_slug)).size,accepted.length);
const groups=Object.fromEntries(['creator','newsletter','community','sponsor'].map(k=>[k,accepted.filter(l=>l.kind===k).length]));
assert(groups.newsletter+groups.community>=15);
const top15=accepted.filter(l=>l.kind!=='sponsor').sort((a,b)=>b.priority_score-a.priority_score||a.name.localeCompare(b.name)).slice(0,15).map(l=>l.tracked_slug);
const result={run_id:'demo-creator-audit-r2-2026-10-07',verified_at:new Date().toISOString(),groups,count:accepted.length,accepted,top15,decisions,paid_media:[...paid].map(slug=>({slug,name:rows.get(slug)?.name||archived.get(slug)?.name,reason:'paid-media only'})),contact_manifest:manifest.map(({url,file,status,checked_at,rendered,access_method,final_url})=>({url,file,status,checked_at,rendered,access_method,final_url})),ranking:'100 × min(1, log10(1+audience)/6) × fit(strong=1,partial=.6) × earnings(y=1,n=.35) × route(email=1,form=.8,Substack=.65,modmail=.2). Unknown reach=.2. Sponsors are ranked separately. Counts are observed public displays; US residency not verified.'};
await fs.writeFile('data/creator-list-r2.json',JSON.stringify(result,null,2));
await fs.writeFile('evidence/creator-audit-r2/contact-gates.json',JSON.stringify(decisions.filter(r=>r.check).map(r=>r.check),null,2));
console.log(JSON.stringify({count:accepted.length,groups,accepted:accepted.map(l=>l.name),pending:decisions.filter(d=>d.decision==='pending').map(d=>({name:d.name,reason:d.reason})),rejected:[...rejected]}));
