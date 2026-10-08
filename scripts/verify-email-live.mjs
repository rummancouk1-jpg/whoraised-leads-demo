import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const origin=new URL(process.argv[2]).origin;
if(!origin.startsWith('https://'))throw new Error('Use the deployed HTTPS URL.');
const out='evidence/deployed/email-live';fs.mkdirSync(out,{recursive:true});
const result={url:origin,checkedAt:new Date().toISOString(),status:'BLOCKED',items:[],inboxes:[],parity:[]};
const save=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
const add=(name,status,evidence)=>{result.items.push({name,status,evidence});save();console.log(`${name}: ${status}`);};
async function capture(page,view,width,motion){
  const screenshot=`${view}-${width}-${motion}.png`;
  await page.screenshot({path:path.join(out,screenshot),fullPage:true,animations:'disabled'});
  const violations=await page.evaluate(()=>{
    const fail=[];
    if(document.documentElement.scrollWidth>innerWidth+1)fail.push('Page horizontal overflow');
    document.querySelectorAll('nav button,nav a,.gg-header-content button').forEach(el=>{const r=el.getBoundingClientRect();if(r.left< -1||r.right>innerWidth+1||r.width<20)fail.push('Clipped control');});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('body *').forEach(el=>{const s=getComputedStyle(el);if(s.animationName!=='none'||s.transitionDuration.split(',').some(v=>parseFloat(v)>0))fail.push('Reduced motion violated');});
    return [...new Set(fail)];
  });
  result.parity.push({view,width,motion,screenshot,url:page.url(),status:violations.length?'FAIL':'PASS',violations});save();assert.deepEqual(violations,[]);console.log(`${view} ${width} ${motion}: PASS`);
}
const browser=await chromium.launch();
try{
  const login=await fetch(`${origin}/api/auth`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:process.env.GG_ACCESS_PASSWORD})});
  assert.equal(login.status,200,'Live authentication needed to read the private Email view.');
  const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
  async function metrics(){const response=await fetch(`${origin}/api/email`,{headers:{Cookie:cookie}});assert.equal(response.status,200);return response.json();}
  const before=await metrics();assert.equal(before.error,'');assert.equal(before.historyError,'');assert.ok(before.live,'Live API data missing');assert.ok(before.live.inboxes.length>0,'No real sending inboxes found');
  assert.equal(before.live.campaign,null);assert.equal(before.live.campaignMessage,'No campaign yet');
  result.inboxes=before.live.inboxes;result.liveFetchedAt=before.live.fetchedAt;
  fs.writeFileSync(path.join(out,'live-metrics.json'),JSON.stringify(before,null,2));
  add('Instantly real inbox connection','PASS',`Server read succeeded at ${before.live.fetchedAt}; ${before.live.inboxes.length} inboxes; no campaign; no API/history errors.`);
  const day=before.live.day;const existed=before.history.some(s=>s.day===day);
  const cron=await fetch(`${origin}/api/cron/email-snapshot`,{headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`}});const written=await cron.json();assert.equal(cron.status,200);assert.equal(written.day,day);assert.equal(written.inserted,!existed);
  const after=await metrics();assert.equal(after.error,'');assert.equal(after.historyError,'');const snapshot=after.history.find(s=>s.day===day);assert.ok(snapshot,'Snapshot not readable after write');assert.deepEqual(snapshot.metrics.inboxes.map(i=>i.email).sort(),before.live.inboxes.map(i=>i.email).sort());assert.equal(snapshot.metrics.campaign,null);assert.ok(snapshot.captured_at);
  const retry=await fetch(`${origin}/api/cron/email-snapshot`,{headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`}});const repeated=await retry.json();assert.equal(retry.status,200);assert.equal(repeated.inserted,false);
  const reread=await metrics();assert.equal(reread.history.filter(s=>s.day===day).length,1);assert.equal(reread.history.find(s=>s.day===day).captured_at,snapshot.captured_at);
  result.snapshot={day,inserted:written.inserted,alreadyExisted:existed,capturedAt:snapshot.captured_at,inboxes:snapshot.metrics.inboxes.length,retryInserted:repeated.inserted,rowsForDay:1};
  fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(snapshot,null,2));
  add('First real daily snapshot write/read/idempotency','PASS',`${day}: ${existed?'existing real snapshot retained':'first snapshot inserted'}; ${snapshot.metrics.inboxes.length} inboxes persisted; read back through private API; retry retained one unchanged row.`);
  const uncaught=[];const network=[];const ignoredPrefetch=[];
  for(const width of [390,820,1440])for(const motion of ['normal','reduce']){
    const context=await browser.newContext({viewport:{width,height:960},reducedMotion:motion==='reduce'?'reduce':'no-preference'});
    const [name,...values]=cookie.split('=');await context.addCookies([{name,value:values.join('='),url:origin,httpOnly:true,secure:true,sameSite:'Strict'}]);
    const page=await context.newPage();page.on('pageerror',e=>uncaught.push(e.message));page.on('requestfailed',r=>{
      const failure={url:r.url(),error:r.failure()?.errorText};
      if(new URL(r.url()).searchParams.has('_rsc') && failure.error==='net::ERR_ABORTED')ignoredPrefetch.push(failure);
      else network.push(failure);
    });
    page.on('response',r=>{if(r.url().includes('/api/') && r.status()>=400)network.push({url:r.url(),status:r.status()});});
    await page.goto(`${origin}/email`);await expect(page.getByRole('button',{name:'Refresh live data',exact:true})).toBeVisible({timeout:60000});
    await expect(page.getByRole('heading',{name:'No campaign yet',exact:true})).toBeVisible();await expect(page.locator('.gg-error[role="alert"]')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Send batch comparison',exact:true})).toHaveCount(0);
    await expect(page.getByRole('region',{name:'Campaign snapshot trends',exact:true})).toHaveCount(0);
    await expect(page.getByRole('region',{name:'Sending inbox metrics',exact:true}).locator('tbody tr')).toHaveCount(before.live.inboxes.length);
    for(const inbox of before.live.inboxes){const row=page.getByRole('region',{name:'Sending inbox metrics',exact:true}).getByRole('row').filter({hasText:inbox.email});await expect(row).toContainText(inbox.warmup);}
    await expect(page.getByRole('region',{name:'Inbox snapshot trends',exact:true}).locator('tbody tr')).not.toHaveCount(0);
    await capture(page,'email',width,motion);
    if(width<1440){const region=page.getByRole('region',{name:'Sending inbox metrics',exact:true});await region.evaluate(e=>{e.scrollLeft=e.scrollWidth;});await capture(page,'email-inbox-scroll',width,motion);}
    await context.close();
  }
  result.ignoredCancelledRoutePrefetches=ignoredPrefetch;
  assert.deepEqual(uncaught,[]);assert.deepEqual(network,[]);
  add('Populated prelaunch Email parity','PASS',`${result.parity.length} deployed screenshots: 390/820/1440, normal/reduced; real inboxes and snapshot; No campaign yet; no alerts, empty campaign tables, batch charts, runtime errors or failed requests.`);
  result.status='AWAITING_VISUAL_REVIEW';save();
}catch(e){add('Blocked-item rerun','FAIL',e.message);result.status='FAIL';save();process.exitCode=1;}
finally{await browser.close();}
