import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
const enc=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const types=enc(compile(await fs.readFile('src/types/outreach.ts','utf8')));
const config=JSON.parse(await fs.readFile('src/config/fit-weights.json','utf8'));
const source=(await fs.readFile('src/lib/outreach.ts','utf8')).replace('import config from "@/config/fit-weights.json";',`const config=${JSON.stringify(config)};`).replace('"@/types/outreach"',JSON.stringify(types));
const api=await import(enc(compile(source)));
const leads=[],audit=[];
function add(r,e) {
 const slug='r1-'+r.handle.toLowerCase().replace(/^@/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 assert(e.date>='2026-09-07'&&e.date<='2026-10-07',`Activity out of window: ${r.name}`);
 const unknown=r.audience_size===0;
 const notes=`Group: ${e.group}. Owner: ${e.owner||r.handle}. Channel: ${r.contact?.includes('@')?'business email':'DM/form'}. Source: ${e.profile}. Active: ${e.date}; ${e.activity}; ${e.activityDetail||'dated public publication'}. Audience source: ${e.audienceSource||e.profile}; ${unknown?'UNKNOWN; schema requires integer, 0 is a missing-data sentinel, not a measured audience':e.sizeDetail||'public rounded subscriber count, approximate'}. Why fit: ${e.fit}. Suggested pitch angle: ${e.angle}. ${e.rules?`Self-promo rules: ${e.rules}. `:''}${e.contactSource?`Business contact source: ${e.contactSource}. `:''}Verified: 2026-10-07. US focus describes market coverage; audience residency is not verified.`;
 const lead={...r,contact:r.contact||'',tracked_slug:slug,stage:'New',signups:0,last_touch:'',notes};
 leads.push(lead);audit.push({slug,...e,audienceUnknown:unknown});
}
const yt=JSON.parse(await fs.readFile('data/creator-youtube-verified-r1.json','utf8'));
// Editorial fit and angles are judgments grounded in each channel's public trading coverage.
const ymeta={
 TradeBrigade:['day trading','yes','Daily US index preparation audience','Challenge the host on the next earnings-driven session'],
 fxevolutionvideo:['swing','mixed','S&P 500 and Nasdaq chart followers','US-stock picks alongside the weekly market outlook'],
 StockedUp:['options','yes','US stock and options watchlist audience','Turn earnings watchlists into a creator-versus-viewer picks challenge'],
 alphatrends:['swing','yes','US equity trend and anchored VWAP learners','A transparent pick streak using the same chart discipline'],
 tradesbymatt:['day trading','mixed','Active index day traders; futures-heavy secondary fit','A simple US-stock prediction challenge between live sessions'],
 chatwithtraderspodcast:['day trading','mixed','Trading interview listeners across equities and futures','A short podcast invitation to compete against the host'],
 theotrade:['options','yes','US options education viewers','An earnings direction challenge requiring no option position'],
 jjbuckner:['options','yes','Retail options and income investors','Invite wheel-strategy viewers to a free earnings pick streak'],
 InvestwithHenry:['options','yes','US options education and stock selection followers','A creator benchmark for earnings direction picks'],
 TheStockGuy:['day trading','yes','Stock-focused livestream community','Let the live audience compete against the host daily'],
 TraderLion:['swing','yes','US growth-stock and momentum traders','Convert breakout watchlists into one earnings-season pick'],
 financialwisdom:['swing','mixed','Rules-based equity strategy learners','A short measurable picks challenge alongside strategy education'],
 VincentDesiano:['options','yes','US intraday stock and options traders','A morning-watchlist earnings prediction challenge'],
 OptionOmega:['options','yes','SPX options backtesting audience','Test direction calls in a free prediction tournament'],
 Optionstrat:['options','yes','US option-strategy visualization users','Compare predicted earnings direction without risking premium'],
 TradingDecoded:['day trading','yes','Intraday US stock chart learners','Practice selecting a daily stock before the earnings catalyst'],
 OptionsPlay:['options','yes','US equity options education audience','An educational direction-picking exercise around earnings'],
 StockChartsTV:['swing','yes','US technical chart and sector viewers','A chart-reader versus chart-reader earnings pick challenge'],
 RealLifeTrading:['day trading','yes','US day and swing trading learners','A community contest applying their daily stock analysis'],
 FiguringOutMoney:['day trading','yes','US equity market-analysis viewers','Put the daily market outlook to a friendly prediction test'],
 Benzinga:['earnings','yes','US stock-news and catalyst-watchlist viewers','A free earnings-calendar picks segment for the audience'],
 TradePro:['day trading','mixed','Technical trading strategy viewers; mixed asset coverage','US equity challenge as an optional companion to technical lessons'],
 TradingWarzOfficial:['options','yes','US S&P and stock options education viewers','Compete against the creator on earnings direction'],
 BTheTrader87:['day trading','yes','Trading podcast and equity trader interviews','A host-versus-listener earnings pick invitation'],
 carmine_rosato:['day trading','yes','Intraday index and stock-market traders','One stock prediction alongside daily preparation'],
 OutlierTrading:['options','yes','Retail options strategy and risk learners','An earnings direction contest separate from funded positions'],
 RockwellTradingServices:['options','yes','US wheel and stock-income traders','A community prediction streak alongside stock screening'],
 TradeRisk:['swing','yes','Systematic US equity swing-trading followers','Use weekly watchlists to choose an earnings-season daily pick'],
 StocksToTrade:['day trading','yes','US retail stock scanner and day-trading audience','A catalyst-watchlist creator versus audience challenge'],
 TrendSpider:['day trading','yes','US charting and automated technical-analysis users','A chart-based daily earnings direction challenge'],
 FinancialEducation2:['general investing','yes','Retail US individual-stock investors','Predict near-term earnings reactions for familiar holdings'],
 TheTravelingTrader:['options','yes','Stock and options trade analysis followers','A friendly earnings pick competition with the creator'],
 OptionswithDavis:['options','mixed','US equity options learners with international reach','Invite eligible US readers to a no-position earnings challenge'],
 projectoption:['options','yes','US equity options education audience','Use earnings lessons in a free direction-prediction streak']
};
for(const r of yt){const m=ymeta[r.handle];assert(m,`Missing fit ${r.handle}`);assert(r.audienceSize>=5000&&r.audienceSize<=500000);const podcast=['chatwithtraderspodcast','BTheTrader87'].includes(r.handle);add({name:r.name,handle:'@'+r.handle,platform:'YouTube',kind:'creator',audience_size:r.audienceSize,niche:m[0],us_focus:m[1],contact:r.handle==='chatwithtraderspodcast'?'hello@chatwithtraders.com':''},{group:podcast?'Trading podcast (YouTube distribution)':'YouTube trading creator',profile:r.source,date:r.activity.date.slice(0,10),activity:r.activity.source,fit:m[2],angle:m[3],contactSource:r.handle==='chatwithtraderspodcast'?'https://chatwithtraders.com/sponsors':undefined,owner:r.handle==='TradingWarzOfficial'?'TradingWarz':r.handle});}
const smeta={
 chartnotes:['swing','yes','QQQ technical notes readers','A Nasdaq-stock earnings direction pick alongside weekly notes'],
 coffeegroundstrading:['day trading','yes','US session recap and market-intelligence readers','A recap footer inviting readers to a daily picks streak'],
 dailystockpick:['earnings','yes','US stock watchlist readers and podcast listeners','An October-watchlist pick challenge in the newsletter and podcast'],
 denisdoroshenko:['earnings','mixed','Value and momentum stock readers following earnings demand','Turn an earnings thesis into a friendly daily direction call'],
 dynalogic:['general investing','yes','Readers tracking overbought and oversold securities','A picks challenge based on the daily Investor Compass'],
 halaltrader:['swing','yes','US equity swing-setup readers','A free stock-only earnings challenge suited to the community'],
 jminvestments:['earnings','yes','Weekly US market and earnings-calendar readers','Add a free pick challenge to the coming-week earnings brief'],
 lighthousemacro:['general investing','yes','US market-regime and stock-risk readers','A one-pick earnings challenge as a community experiment'],
 marlincapital:['swing','yes','QQQ and equity breakout readers','Compare readers daily earnings picks with the author'],
 michaeljburry:['general investing','yes','US stock-analysis and trading-post readers','A reader stock-prediction exercise around earnings'],
 onlyfin:['swing','mixed','Market playbook readers timing risk exposure','Invite eligible US readers to compare earnings direction calls'],
 optionsmonitor:['options','yes','Readers following live US options trade alerts','An earnings direction contest requiring no funded options trade'],
 optionsoracle:['options','yes','US equity cash-secured-put and options readers','A stock-direction streak beside weekly option ideas'],
 optionstrategist:['options','yes','McMillan SPX and equity-options readers','A free earnings-prediction exercise for options learners'],
 paretoinvestor:['general investing','mixed','Individual-stock portfolio and market readers','A reader-versus-author earnings reaction challenge'],
 spotgamma:['options','yes','US options positioning and gamma readers','Compare positioning-based direction predictions on earnings stocks'],
 stockanalysiscompilation:['earnings','mixed','Readers collecting individual-stock investment pitches','A daily earnings-reaction call for a featured stock thesis'],
 tacticalallocationdesk:['general investing','yes','US equity allocation and market-signal readers','A limited reader experiment in earnings prediction'],
 tanukitrade:['options','yes','US options and Nasdaq-market outlook readers','A newsletter-versus-Discord earnings picks leaderboard'],
 themultiplier:['options','yes','US covered-call and individual-stock income readers','Pick earnings direction without placing a covered-call trade'],
 theowave:['options','yes','SPX option positioning and market-model readers','Compare model readers daily earnings direction calls'],
 theregimereport:['earnings','yes','US stock catalyst and market regime readers','Convert company catalyst discussions into daily picks'],
 tradeintelligent:['options','yes','US ETF and options strategy/backtest readers','A free prediction test beside the quantitative trade discussion'],
 tradingwarzcpa:['options','yes','US S&P and individual-stock LEAPS readers','A creator versus reader earnings pick streak'],
 yougotthistrading:['day trading','mixed','Active daily US session and macro-prep readers','Invite US readers to pick one earnings stock with the author']
};
const ss=JSON.parse(await fs.readFile('data/creator-research-r1.json','utf8'));
for(const [domain,m]of Object.entries(smeta)){const r=ss.find(r=>r.domain===domain);assert(r?.posts?.length);const n=Number((r.subscriberLabel||'0').replaceAll(',',''));add({name:r.name.trim(),handle:domain,platform:'Substack',kind:'newsletter',audience_size:n,niche:m[0],us_focus:m[1]},{group:domain==='dailystockpick'?'Newsletter / trading podcast':'Substack trading newsletter',profile:r.origin+'/about',date:r.posts[0].date.slice(0,10),activity:r.posts[0].url,activityDetail:r.posts[0].title,fit:m[2],angle:m[3],sizeDetail:'Substack public subscriber label; rounded/lower bound, not an exact count',owner:domain==='tradingwarzcpa'?'TradingWarz':domain==='tanukitrade'?'TanukiTrade':domain});}
const communities=JSON.parse(await fs.readFile('data/creator-community-research-r1.json','utf8'));
for(const r of communities.filter(r=>r.code)){const uw=r.code==='unusualwhales',day=r.code==='gVyVJWqt9m';add({name:r.name,handle:r.code,platform:'Discord',kind:'community',audience_size:r.members,niche:day?'day trading':'options',us_focus:'yes',contact:uw?'partnerships@unusualwhales.com':''},{group:'Discord trading community',owner:uw?'Unusual Whales':day?'r/Daytrading':'TanukiTrade',profile:'https://discord.gg/'+r.code,date:r.checkedAt.slice(0,10),activity:r.source,activityDetail:`Public Discord invite API shows ${r.online} members online at ${r.checkedAt}; current presence verifies active community, private message dates not inspected`,audienceSource:r.source,sizeDetail:'approximate Discord invite member count',fit:day?'Active day-trading community discussing US equity setups':'Active US options community suited to earnings-direction discussion',angle:'Ask community administrators for an approved creator-versus-members earnings challenge',rules:'Private server promotion rules not publicly verified; administrator approval required before posting',contactSource:uw?'https://unusualwhales.com/advertise':undefined});}
const reddit=[
 ['options',1442123,'options','2026-09-29','https://www.reddit.com/r/options/comments/1wtgr2k/mu_earnings_iv_crush_setup_for_oct_2nd/','US equity options community actively discussing earnings IV','Request moderator pre-approval for an educational earnings-direction tournament','Rule 7 prohibits promotions and solicitations even for free tools; developers must obtain moderator pre-approval. Rule 1 prohibits AI-generated content; do not paste the generic generated draft into posts'],
 ['Daytrading',5199460,'day trading','2026-10-06','https://www.reddit.com/r/Daytrading/comments/1wymnyo/market_intelligence_106/','US intraday market and stock-catalyst discussion','Ask moderators about an approved community challenge or use paid Reddit advertising','Rule 3 prohibits product/service/community promotion, referral links and requests to DM; creator guidelines apply; paid Reddit ads are the stated alternative. Rule 4 prohibits generic low-effort AI content'],
 ['thetagang',346122,'options','2026-10-01','https://www.reddit.com/r/thetagang/comments/1wuogon/daily_rthetagang_discussion_thread_what_are_your/','US equity options sellers already discussing earnings risks','Ask moderators whether any sanctioned free educational challenge is acceptable; no organic posting without approval','Rules 1/3/5 prohibit sales, referrals, social-media spam and self-promotion including free blog gateways; no unsolicited campaign posts']
];
for(const [sub,n,niche,date,activity,fit,angle,rules]of reddit)add({name:'r/'+sub,handle:'r/'+sub,platform:'Reddit',kind:'community',audience_size:n,niche,us_focus:'yes',contact:''},{group:'Reddit moderator-gated community',owner:'r/'+sub,profile:'https://www.reddit.com/r/'+sub+'/',date,activity,fit,angle,rules,audienceSource:sub==='Daytrading'?'https://www.reddit.com/r/Daytrading/':'https://www.reddit.com/r/stocks/',sizeDetail:sub==='Daytrading'?'Subscriber Info sidebar; not weekly visitors':'Related communities sidebar explicitly labelled members'});
const x=communities.find(r=>r.platform==='X');
const snow=BigInt(x.links[1].split('/').at(-1));const xDate=new Date(Number((snow>>22n)+1288834974657n)).toISOString().slice(0,10);
add({name:'Unusual Whales',handle:'@unusual_whales',platform:'X',kind:'creator',audience_size:0,niche:'options',us_focus:'yes',contact:'partnerships@unusualwhales.com'},{group:'X / FinTwit',owner:'Unusual Whales',profile:'https://x.com/unusual_whales',date:xDate,activity:x.links[1],activityDetail:'Oct 5 chip and memory stocks post indexed at https://dailygram.me/x/unusual_whales; date cross-checked from X status ID; direct X access restricted',fit:'US stock catalyst and options-flow readers',angle:'A free earnings-direction leaderboard for followers using the stock catalyst feed',contactSource:'https://unusualwhales.com/advertise'});
assert(leads.length>=60&&leads.length<=100);
const csv=api.exportCsv(leads), parsed=api.parseLeadsCsv(csv);assert.deepEqual(parsed,leads);
for(const l of parsed)assert(api.generateDraft(l).includes(`/go/${l.tracked_slug}`));
const sorted=[...parsed].sort((a,b)=>api.fitScore(b).score-api.fitScore(a).score||a.name.localeCompare(b.name));
await fs.writeFile('data/creator-list-r1.csv',csv+'\r\n');
await fs.writeFile('data/creator-list-r1-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),window:['2026-09-07','2026-10-07'],count:parsed.length,platforms:Object.fromEntries([...new Set(parsed.map(l=>l.platform))].map(p=>[p,parsed.filter(l=>l.platform===p).length])),unknownAudience:parsed.filter(l=>!l.audience_size).map(l=>l.name),top15:sorted.slice(0,15).map(l=>({name:l.name,platform:l.platform,score:api.fitScore(l).score,slug:l.tracked_slug})),evidence:audit},null,2));
console.log(JSON.stringify({count:leads.length,top15:sorted.slice(0,15).map(l=>[l.name,api.fitScore(l).score])},null,2));
