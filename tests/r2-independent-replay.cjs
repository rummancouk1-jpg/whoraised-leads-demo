/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS VM audit harness. */
/* Independent audit: execute the repository's real sync/provider/mapper/read-model code.
 * Only the database transport is replaced by an in-memory SQL adapter; provider HTTP
 * responses are deterministic fixtures. No UI mocks, credentials, or network access.
 * Run: node tests/r2-independent-replay.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-09T16:00:00Z');
const results = [];

function harness(now = NOW) {
  const state = { stats: new Map(), events: new Map(), runs: [], signups: new Map(), clicks: [], requests: [],
    remote: [], emails: [], fail: false, cycle: false, endless: false, noCampaign: false, paused: false,
    gate: null, queue: [], transactionFail: false, audits: [], deliveries: 0, leases: new Map(), checkpoints: new Map(), digestClaims: new Map() };
  const leads = ['waiting','answered','bounced','quiet','auto','unsubscribed','joined','test-person'].map(slug => ({
    name: slug, handle: '@' + slug, tracked_slug: slug, contact: slug + '@creator.invalid', platform: 'YouTube',
    kind: 'creator', audience_size: 20000, niche: 'earnings', us_focus: 'yes', stage: slug === 'joined' ? 'Joined' : 'Contacted',
    signups: 0, last_touch: '', notes: '' }));
  function execute(q) {
    const text = q.text.replace(/\s+/g, ' ').trim(), p = q.params;
    if (text.startsWith('SELECT') && text.includes('AS last_ok')) {
      const snapshot = [{ last_ok: state.runs.filter(r => r.ok).at(-1)?.finished_at ?? null,
        running: state.runs.filter(r => r.finished_at === null).length }];
      return snapshot;
    }
    if (text.startsWith('INSERT INTO gg_job_leases')) { if(state.leases.has(p[0])) return []; state.leases.set(p[0],p[1]); return [{owner:p[1]}]; }
    if (text.startsWith('DELETE FROM gg_job_leases')) { if(state.leases.get(p[0])===p[1]) state.leases.delete(p[0]); return []; }
    // Rate budgets are tested against real Postgres separately. This replay accelerates several days into one instant.
    if (text.startsWith('INSERT INTO gg_request_limits')) return [{used:1}];
    if (text.startsWith('SELECT state FROM gg_sync_checkpoints')) return state.checkpoints.has(p[0])?[{state:state.checkpoints.get(p[0])}]:[];
    if (text.startsWith('INSERT INTO gg_sync_checkpoints')) { state.checkpoints.set(p[0],JSON.parse(p[1]));return []; }
    if (text.startsWith('DELETE FROM gg_sync_checkpoints')) { state.checkpoints.delete(p[0]);return []; }
    if (text.startsWith('INSERT INTO gg_digest_deliveries')) { if(state.digestClaims.has(p[0]))return [];state.digestClaims.set(p[0],p[1]);return [{owner:p[1]}]; }
    if (text.startsWith('UPDATE gg_digest_deliveries')) return [];
    if (text.startsWith('INSERT INTO gg_sync_runs')) { const id = state.runs.length + 1; state.runs.push({ id, source:p[0], trigger:p[1], started_at:new Date(NOW).toISOString(), finished_at:null, ok:null, counts:null }); return [{id}]; }
    if (text.startsWith('UPDATE gg_sync_runs')) { const r = state.runs.find(r => r.id === p[1]); r.finished_at = new Date(NOW).toISOString(); r.ok = text.includes('ok=true'); if(r.ok) r.counts = JSON.parse(p[0]); else r.error = p[0]; return text.includes('RETURNING id')?[{id:r.id}]:[]; }
    if (text.startsWith('DELETE FROM gg_lead_stats')) { for(const slug of state.stats.keys()) if(!p[0].includes(slug)) state.stats.delete(slug); return []; }
    if (text.startsWith('INSERT INTO gg_lead_stats')) { for(const s of JSON.parse(p[0])) state.stats.set(s.slug, {...s,unknown_fields:['opened','clicked'].filter(k=>s[k]===null),synced_at:new Date(NOW).toISOString()}); return []; }
    if (text.startsWith('INSERT INTO gg_lead_events')) { for(const e of JSON.parse(p[0])) state.events.set(e.ref,e); return []; }
    if (text.startsWith('INSERT INTO gg_signups')) { const [id,at,test,nonce,slug,token] = p; const click=state.clicks.find(c=>c.click_token===token&&c.slug===slug&&c.clicked_at<=at);if(!click||state.signups.has(id)||[...state.signups.values()].some(s=>s.webhook_nonce===nonce)||!leads.some(l=>l.tracked_slug===slug)) return []; state.signups.set(id,{id,slug,signed_up_at:at,is_test:test,click_id:click.id,webhook_nonce:nonce}); return [{id}]; }
    if (text.startsWith('SELECT data')) return leads.map(data=>({data}));
    if (text.startsWith('SELECT slug,email,sent')) return [...state.stats.values()];
    if (text.startsWith('SELECT started_at')) return [...state.runs].reverse().filter(r=>!text.includes('AND ok=true')||r.ok===true).slice(0,text.includes('LIMIT 1')?1:p[1]);
    if (text.startsWith('SELECT fingerprint')||text.startsWith('SELECT e.fingerprint')) return [];
    if (text.startsWith('SELECT ref,kind')) return [...state.events.values()].filter(e=>e.slug===p[0]&&e.at).sort((a,b)=>a.at.localeCompare(b.at)||a.ref.localeCompare(b.ref));
    if (text.startsWith('SELECT metrics FROM gg_snapshots')) return [];
    if (text.startsWith('SELECT kind, max(recorded_at)')) return state.audits.filter(a=>a.kind==='digest-sent').map(a=>({kind:a.kind,at:a.at}));
    if (text.startsWith('INSERT INTO gg_internal_audit')) { state.audits.push({kind:text.includes('digest-sent')?'digest-sent':'digest-skipped',at:new Date(NOW).toISOString()});return []; }
    if (text.startsWith('SELECT s.slug, count(*)') && text.includes('gg_signups')) {
      const out = new Map(); for(const s of state.signups.values()) if(!s.is_test && state.clicks.some(c=>c.id===s.click_id&&c.slug===s.slug&&!c.is_test&&!c.is_example&&s.signed_up_at>=c.clicked_at&&(!p[0]||s.signed_up_at>=p[0]&&c.clicked_at>=p[0]))) {const x=out.get(s.slug)??{slug:s.slug,n:0,last_at:null,first_at:null}; x.n++; x.last_at=!x.last_at||s.signed_up_at>x.last_at?s.signed_up_at:x.last_at; x.first_at=!x.first_at||s.signed_up_at<x.first_at?s.signed_up_at:x.first_at;out.set(s.slug,x);}return [...out.values()];
    }
    if (text.startsWith('SELECT slug, count(*)') && text.includes('gg_clicks')) { const out=new Map();for(const c of state.clicks) if(!c.is_test&&!c.is_example&&(!p[0]||c.clicked_at>=p[0])) out.set(c.slug,(out.get(c.slug)??0)+1);return [...out].map(([slug,n])=>({slug,n})); }
    if (text.startsWith('SELECT count(*)') && text.includes('gg_clicks')) {const rows=state.clicks.filter(c=>c.slug===p[0]&&!c.is_test&&!c.is_example);return [{n:rows.length,last_at:rows.map(c=>c.clicked_at).sort().at(-1)??null}];}
    if (text.startsWith('SELECT count(*)') && text.includes('gg_signups')) {const rows=[...state.signups.values()].filter(s=>s.slug===p[0]&&!s.is_test&&state.clicks.some(c=>c.id===s.click_id&&c.slug===s.slug&&!c.is_test&&!c.is_example&&s.signed_up_at>=c.clicked_at&&(!p[1]||s.signed_up_at>=p[1]&&c.clicked_at>=p[1])));return [{n:rows.length,last_at:rows.map(s=>s.signed_up_at).sort().at(-1)??null}];}
    throw new Error('Unexpected audit SQL: '+text);
  }
  function sql(parts,...params) {const q={text:parts.join('?'),params};q.then=(yes,no)=>Promise.resolve().then(()=>execute(q)).then(yes,no);q.catch=no=>q.then(undefined,no);return q;}
  sql.transaction=async queries=>{if(state.transactionFail)throw new Error('injected transaction failure');const out=[];for(const q of queries)out.push(await q);return out;};
  const env={INSTANTLY_API_KEY:'audit-fixture-key',SIGNUP_WEBHOOK_SECRET:'audit-webhook-key',ATTRIBUTION_SIGNING_SECRET:'audit-click-key'};
  class AuditDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  async function fetchFixture(input,init={}) {
    const u=new URL(input); if(u.origin==='https://api.resend.com'){state.deliveries++;return Response.json({id:'in-memory-delivery'});} if(u.origin!=='https://api.instantly.ai')throw new Error('Network forbidden');
    state.requests.push({path:u.pathname,query:u.search,body:init.body});
    const route=u.pathname.replace('/api/v2/','');const body=init.body?JSON.parse(init.body):{};
    const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
    if(state.fail && route==='emails' && u.searchParams.get('limit')!=='1')return json({error:'rate limit'},429);
    if(route==='campaigns')return json({items:state.noCampaign?[]:[{id:'gg-campaign',name:'GG Outreach'}]});
    if(route==='accounts')return json({items:[]});
    if(route==='accounts/analytics/daily')return json([]);
    if(route==='leads/list'&&body.limit===1||route==='emails'&&u.searchParams.get('limit')==='1')return json({items:[]});
    if(route==='leads/list'||route==='emails') {
      const cursor=body.starting_after??u.searchParams.get('starting_after');const rows=route==='leads/list'?state.remote:state.emails;
      if(state.cycle)return json({items:rows.slice(0,1),next_starting_after:'stuck'});
      if(state.endless)return json({items:rows.slice(0,1),next_starting_after:String(Number(cursor??0)+1)});
      const filtered=route==='emails'&&u.searchParams.has('campaign_id')?rows.filter(r=>r.campaign_id===u.searchParams.get('campaign_id')):rows;
      const start=Number(cursor??0);const items=filtered.slice(start,start+2);
      return json({items,...(start+2<filtered.length?{next_starting_after:String(start+2)}:{})});
    }
    throw new Error('Unexpected provider request: '+route);
  }
  const cache=new Map();
  function load(file) {
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
    if(file.endsWith(path.join('server','db.ts')))return {database:()=>sql,initializeDatabase:async()=>{},withDatabaseDeadline:async work=>work()};
    const mod={exports:{}};cache.set(file,mod);
    const localRequire=id=>{if(id==='server-only')return {};if(id==='next/headers')return {cookies:async()=>({get:()=>undefined})};
      if(id.startsWith('@/')||id.startsWith('.')){let target=id.startsWith('@/')?path.join(ROOT,'src',id.slice(2)):path.resolve(path.dirname(file),id);if(fs.existsSync(target+'.json'))return JSON.parse(fs.readFileSync(target+'.json','utf8'));if(!path.extname(target))target+='.ts';return load(target);}return require(id);};
    const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    vm.runInNewContext('(function(require,module,exports){'+js+'\n})',{Date:AuditDate,process:{env},fetch:fetchFixture,console,URL,URLSearchParams,AbortSignal,AbortController,Response,Request,Headers,Buffer,setTimeout,clearTimeout})(localRequire,mod,mod.exports);
    return mod.exports;
  }
  return {state,leads,env,load:p=>load(path.join(ROOT,p)),sync:()=>load(path.join(ROOT,'src/lib/server/sync.ts'))};
}
function fixture(h,day) {
  const send=(slug,n,at,type=1,auto=0)=>({id:slug+'-'+n,lead:slug+'@creator.invalid',campaign_id:'gg-campaign',ue_type:type,is_auto_reply:auto,timestamp_email:at});
  h.state.remote=h.leads.map(l=>({email:l.contact,status:l.tracked_slug==='bounced'?-1:l.tracked_slug==='unsubscribed'?-2:1,email_open_count:l.tracked_slug==='waiting'?3:0,email_reply_count:0,email_click_count:l.tracked_slug==='waiting'?1:0,timestamp_last_open:l.tracked_slug==='waiting'?'2026-10-04T15:00:00Z':null,timestamp_last_click:l.tracked_slug==='waiting'?'2026-10-05T15:00:00Z':null}));
  h.state.emails=h.leads.map(l=>send(l.tracked_slug,'send','2026-10-01T15:00:00Z'));
  if(day>=2)h.state.emails.push(send('waiting','reply','2026-10-06T15:00:00Z',2),send('answered','reply','2026-10-06T15:00:00Z',2));
  if(day>=3)h.state.emails.push(send('answered','manual','2026-10-07T15:00:00Z',3));
  // Repeated API item is realistic when page boundaries move during a sync.
  h.state.emails.push({...h.state.emails[0]},send('quiet','scheduled','2026-10-12T15:00:00Z',4));
}
async function check(name,work){try{await work();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,'—',e.message);}}

(async()=>{
 await check('multi-day real sync replay: pagination, cumulative replacement, dedupe, timeline, queue',async()=>{
   const h=harness();for(const day of [1,2,3]){fixture(h,day);assert.equal((await h.sync().runInstantlySync('cron')).ok,true);}
   const before=JSON.stringify([...h.state.stats]);const eventCount=h.state.events.size;
   await h.sync().runInstantlySync('manual');assert.equal(JSON.stringify([...h.state.stats]),before);assert.equal(h.state.events.size,eventCount);
   const model=h.load('src/lib/server/activity.ts');const activity=await model.getActivity();
   assert.equal(activity.stats.waiting.sent,1);assert.equal(activity.stats.answered.sent,2);assert.equal(activity.stats.waiting.replied,1);
   assert.equal(activity.stats.waiting.opened,3);assert.equal(activity.stats.waiting.clicked,1);assert.equal(activity.stats.bounced.bounced,true);
   assert.deepEqual(JSON.parse(JSON.stringify(activity.queue.map(q=>q.kind+':'+q.slug))),['reply:waiting','bounce:bounced','followup:auto','followup:quiet']);
   const timeline=await model.leadTimeline('waiting');assert(timeline.events.length>=4);assert.deepEqual(timeline.events.map(e=>e.at),timeline.events.map(e=>e.at).sort());assert.equal(timeline.steps[0].detail,'1 email sent');assert.equal(timeline.steps[1].detail,'3 opens');assert.equal(timeline.steps[2].at,'2026-10-06T15:00:00.000Z');assert.equal(timeline.steps[3].done,true);
   assert(h.state.requests.some(r=>r.query.includes('starting_after=')));
 });
 await check('numeric is_auto_reply=1 must not create a reply or needs-action item',async()=>{
   const h=harness();fixture(h,1);h.state.emails.push({id:'ooo',lead:'auto@creator.invalid',campaign_id:'gg-campaign',ue_type:2,is_auto_reply:1,timestamp_email:'2026-10-08T15:00:00Z'});
   await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert.equal(a.stats.auto.replied,0);assert(!a.queue.some(q=>q.slug==='auto'&&q.kind==='reply'));
 });
 await check('cron + open tab + manual must acquire a single sync lease',async()=>{
   const h=harness();fixture(h,3);
   const outcomes=await Promise.all(['cron','auto','manual'].map(t=>h.sync().runInstantlySync(t)));
   assert.equal(h.state.stats.get('waiting').sent,1,'replacement prevents arithmetic double-count');
   assert.equal(outcomes.filter(o=>o.ran).length,1);
 });
 await check('429 preserves previous rows and reports failed health',async()=>{
   const h=harness();fixture(h,3);await h.sync().runInstantlySync('cron');const before=JSON.stringify([...h.state.stats]);h.state.fail=true;
   const out=await h.sync().runInstantlySync('cron');assert.equal(out.ok,false);assert.equal(JSON.stringify([...h.state.stats]),before);assert.equal((await h.sync().currentSyncHealth()).state,'failing');
 });
 await check('repeated campaign cursor must fail instead of replacing full stats with partial data',async()=>{
   const h=harness();fixture(h,3);await h.sync().runInstantlySync('cron');h.state.cycle=true;const out=await h.sync().runInstantlySync('cron');assert.equal(out.ok,false);
 });
 await check('bounded pagination must retain a checkpoint instead of recording truncated success',async()=>{
   const h=harness();fixture(h,3);h.state.endless=true;const out=await h.sync().runInstantlySync('cron');assert.equal(out.ok,false);assert(h.state.checkpoints.size>0);assert.equal(h.state.stats.size,0);
 });
 await check('no selected campaign must not claim existing activity is freshly synced',async()=>{
   const h=harness();fixture(h,3);await h.sync().runInstantlySync('cron');h.state.noCampaign=true;await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert.equal(Object.keys(a.stats).length,0);
 });
 await check('ET sent-today must use New York day near UTC midnight',async()=>{
   const midnight=Date.parse('2026-10-09T00:30:00Z');const h=harness(midnight);h.state.noCampaign=true;
   const m=await h.load('src/lib/server/instantly.ts').fetchEmailMetrics();
   assert.equal(m.day,new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date(midnight)));
 });
 await check('test-prefixed leads must not enter client sync stats/queue',async()=>{
   const h=harness();fixture(h,3);await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert(!a.stats['test-person']);
 });
 await check('webhook duplicate ID is idempotent and unknown slug ignored',async()=>{
   const h=harness();const post=h.load('src/app/api/attribution/signup/route.ts').POST;
   const request=(id,slug='waiting')=>{
     const token=h.load('src/lib/server/attribution-token.ts').issueClickToken(slug,false);
     h.state.clicks.push({id:h.state.clicks.length+1,slug,click_token:token,clicked_at:new Date(NOW).toISOString(),is_test:false,is_example:false});
     const body=JSON.stringify({id,slug,click_token:token,at:new Date(NOW).toISOString()});
     const timestamp=String(NOW/1000),nonce=require('node:crypto').randomUUID();
     const signature=require('node:crypto').createHmac('sha256',h.env.SIGNUP_WEBHOOK_SECRET).update(`${timestamp}.${nonce}.${body}`).digest('hex');
     return new Request('https://preview.invalid/api/attribution/signup',{method:'POST',headers:{Authorization:'Bearer audit-webhook-key','Content-Type':'application/json','x-gg-timestamp':timestamp,'x-gg-nonce':nonce,'x-gg-signature':signature},body});
   };
   assert.equal((await (await post(request('signup-1'))).json()).recorded,true);assert.equal((await (await post(request('signup-1'))).json()).recorded,false);assert.equal((await (await post(request('signup-2','unknown'))).json()).recorded,false);assert.equal(h.state.signups.size,1);
 });
 await check('test=1 redirect must preserve test marker for downstream signup',async()=>{
   const h=harness();const dest=h.load('src/lib/click-tracking.ts').preregDestination('waiting','https://signup.invalid','https://preview.invalid/go/waiting?test=1');assert.equal(new URL(dest).searchParams.get('test'),'1');
 });
 await check('PREREG_LIVE_AT must filter signup cohort as well as clicks',async()=>{
   const h=harness();h.env.PREREG_LIVE_AT='2026-10-08T00:00:00Z';h.state.signups.set('old',{slug:'waiting',signed_up_at:'2026-10-01T00:00:00Z',is_test:false});
   const a=await h.load('src/lib/server/activity.ts').loadAttribution(h.leads);assert.equal(a.signups,0);
 });
 await check('signup without click cannot be presented as verified click conversion',async()=>{
   const h=harness();h.state.signups.set('unjoined',{slug:'waiting',signed_up_at:'2026-10-08T00:00:00Z',is_test:false});const a=await h.load('src/lib/server/activity.ts').loadAttribution(h.leads);assert.equal(a.signups,0);
 });
 await check('reply after a same-day earlier contact must remain in needs-action queue',async()=>{
   const h=harness();fixture(h,2);h.leads.find(l=>l.tracked_slug==='waiting').last_touch='2026-10-06';
   await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert(a.queue.some(q=>q.slug==='waiting'&&q.kind==='reply'));
 });
 await check('manual answer with null campaign_id must clear waiting reply',async()=>{
   const h=harness();fixture(h,2);h.state.emails.push({id:'manual-answer',lead:'waiting@creator.invalid',campaign_id:null,ue_type:3,is_auto_reply:0,timestamp_email:'2026-10-07T15:00:00Z'});
   await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert(!a.queue.some(q=>q.slug==='waiting'&&q.kind==='reply'));
 });
 await check('provider fields absent must not invent a known zero',async()=>{
   const h=harness();fixture(h,1);delete h.state.remote.find(l=>l.email==='waiting@creator.invalid').email_open_count;
   await h.sync().runInstantlySync('cron');const a=await h.load('src/lib/server/activity.ts').getActivity();assert.notEqual(a.stats.waiting.opened,0);
 });
 await check('concurrent digest triggers must send exactly one message',async()=>{
   const h=harness();Object.assign(h.env,{DIGEST_SEND_ENABLED:'true',RESEND_API_KEY:'fixture',DIGEST_FROM:'audit@example.invalid',DIGEST_RECIPIENTS:'audit@example.invalid'});
   const sender=h.load('src/lib/server/digest.ts');await Promise.all([sender.sendDigest(),sender.sendDigest()]);assert.equal(h.state.deliveries,1);
 });
 await check('bad webhook bearer must fail before any signup insert',async()=>{
   const h=harness();const post=h.load('src/app/api/attribution/signup/route.ts').POST;
   const r=await post(new Request('https://preview.invalid/api/attribution/signup',{method:'POST',headers:{Authorization:'Bearer wrong'},body:'{}'}));assert.equal(r.status,401);assert.equal(h.state.signups.size,0);
 });
 const evidence=path.resolve(ROOT,process.env.EVIDENCE_ROOT||'evidence/r2-independent');
 fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'replay.json'),JSON.stringify({at:new Date().toISOString(),database:'in-memory transport; no network',results},null,2));
 console.log(`${results.filter(r=>r.pass).length}/${results.length} checks passed`);process.exitCode=results.some(r=>!r.pass)?1:0;
})();
