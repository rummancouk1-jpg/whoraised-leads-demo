/* eslint-disable @typescript-eslint/no-require-imports -- Reuse the real-code replay transport. */
const {harness,fixture,NOW}=require('./r2-independent-replay.cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const results=[];
async function check(name,fn){await fn();results.push({name,pass:true});console.log('PASS',name);}
(async()=>{
 await check('more than 50 pages resume across sync attempts and commit all messages once',async()=>{
  const h=harness();fixture(h,3);
  for(let i=0;i<120;i++)h.state.emails.push({id:'bulk-'+i,lead:'waiting@creator.invalid',campaign_id:'gg-campaign',ue_type:1,timestamp_email:new Date(NOW-(120-i)*60000).toISOString()});
  let outcome;for(let i=0;i<10;i++){outcome=await h.sync().runInstantlySync('cron');if(outcome.ok)break;assert(h.state.checkpoints.size>0);assert.equal(h.state.stats.size,0);}
  assert.equal(outcome.ok,true);assert.equal(h.state.stats.get('waiting').sent,121);assert.equal(h.state.checkpoints.size,0);
  const history=await h.load('src/lib/server/activity.ts').leadTimeline('waiting');assert(history.events.length>=123);
 });
 await check('long resumed reads retain their observation age, even after a successful commit',async()=>{
  const health=harness().load('src/lib/activity.ts').syncHealth([{startedAt:new Date(NOW).toISOString(),finishedAt:new Date(NOW).toISOString(),ok:true,error:null,trigger:'cron',counts:{observedFrom:new Date(NOW-3600000).toISOString()}}],NOW);
  assert.equal(health.state,'stale');
 });
 await check('signed webhook rejects tampering, expired deliveries, null bodies and nonce replay',async()=>{
  const h=harness(),post=h.load('src/app/api/attribution/signup/route.ts').POST,issue=h.load('src/lib/server/attribution-token.ts').issueClickToken;
  const token=issue('waiting',false);h.state.clicks.push({id:1,slug:'waiting',clicked_at:new Date(NOW).toISOString(),click_token:token,is_test:false,is_example:false});
  const req=(body,nonce=crypto.randomUUID(),at=NOW/1000,tamper=false)=>{const text=JSON.stringify(body),signature=crypto.createHmac('sha256',h.env.SIGNUP_WEBHOOK_SECRET).update(`${at}.${nonce}.${text}`).digest('hex');return new Request('https://preview.invalid/api/attribution/signup',{method:'POST',headers:{Authorization:'Bearer '+h.env.SIGNUP_WEBHOOK_SECRET,'x-gg-timestamp':String(at),'x-gg-nonce':nonce,'x-gg-signature':tamper?'0'.repeat(64):signature},body:text});};
  const body={id:'one',slug:'waiting',click_token:token,at:new Date(NOW).toISOString()},nonce=crypto.randomUUID();
  assert.equal((await post(req(body,nonce,NOW/1000,true))).status,401);
  assert.equal((await post(req(body,nonce,NOW/1000-301))).status,401);
  assert.equal((await post(req(null))).status,400);
  assert.equal((await (await post(req(body,nonce))).json()).recorded,true);
  assert.equal((await (await post(req({...body,id:'two'},nonce))).json()).recorded,false);assert.equal(h.state.signups.size,1);
 });
 await check('test flag in signed creator token cannot be removed by the signup sender',async()=>{
  const h=harness(),token=h.load('src/lib/server/attribution-token.ts').issueClickToken('waiting',true);
  h.state.clicks.push({id:1,slug:'waiting',clicked_at:new Date(NOW).toISOString(),click_token:token,is_test:false,is_example:false});
  const body=JSON.stringify({id:'test-signup',slug:'waiting',click_token:token,at:new Date(NOW).toISOString()}),nonce=crypto.randomUUID(),at=String(NOW/1000);
  const signature=crypto.createHmac('sha256',h.env.SIGNUP_WEBHOOK_SECRET).update(`${at}.${nonce}.${body}`).digest('hex');
  const r=await h.load('src/app/api/attribution/signup/route.ts').POST(new Request('https://preview.invalid/api/attribution/signup',{method:'POST',headers:{Authorization:'Bearer '+h.env.SIGNUP_WEBHOOK_SECRET,'x-gg-timestamp':at,'x-gg-nonce':nonce,'x-gg-signature':signature},body}));assert.equal(r.status,200);assert.equal(h.state.signups.get('test-signup').is_test,true);assert.equal((await h.load('src/lib/server/activity.ts').loadAttribution(h.leads)).signups,0);
 });
 await check('disabled digest produces no bookkeeping writes or provider delivery',async()=>{
  const h=harness();await h.load('src/lib/server/digest.ts').sendDigest();assert.equal(h.state.audits.length,0);assert.equal(h.state.deliveries,0);assert.equal(h.state.digestClaims.size,0);
 });
 fs.mkdirSync('evidence/r2-fix',{recursive:true});fs.writeFileSync('evidence/r2-fix/extra-contracts.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
