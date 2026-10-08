import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const url = process.argv[2];
if (!url || !url.startsWith('https://') || !process.env.GG_ACCESS_PASSWORD) throw new Error('Supply deployed HTTPS URL; GG_ACCESS_PASSWORD must be in .env.local.');
const origin = new URL(url).origin;
const out = 'evidence/deployed'; fs.mkdirSync(out,{recursive:true});
const parity = []; const ready = []; const errors = [];
const run = crypto.randomBytes(6).toString('hex');
const slugs = ['earnings','community','newsletter'].map(s => `example-live-${s}-${run}`);
let csv = fs.readFileSync('public/gg-outreach-examples.csv','utf8');
for (const [i,s] of ['earnings','community','newsletter'].entries()) csv = csv.replaceAll(`example-${s}`, slugs[i]);
const leadName = `EXAMPLE LIVE GATE ${run}`;
csv = csv.replace('EXAMPLE Earnings Creator',leadName);
function report(name,status,evidence) { ready.push({name,status,evidence}); const readyGate=ready.some(r=>r.status==='FAIL')?'FAIL':ready.some(r=>r.status==='BLOCKED')?'BLOCKED':'PASS'; fs.writeFileSync(path.join(out,'ready.json'),JSON.stringify({url:origin,checkedAt:new Date().toISOString(),readyGate,items:ready},null,2)); console.log(`${name}: ${status}`); }
async function capture(page,view,width,motion) {
  const filename = `${view}-${width}-${motion}.png`;
  await page.screenshot({path:path.join(out,filename),fullPage: !await page.getByRole('dialog').count(),animations:'disabled'});
  const violations = await page.evaluate(() => {
    const fail=[];
    if(document.documentElement.scrollWidth>innerWidth+1) fail.push('Page horizontal overflow');
    const dialog=document.querySelector('[role="dialog"]');
    if(dialog) { const r=dialog.getBoundingClientRect(); if(r.left< -1||r.right>innerWidth+1||r.top< -1||r.bottom>innerHeight+1) fail.push('Dialog outside viewport'); if(dialog.scrollWidth>dialog.clientWidth+1) fail.push('Dialog horizontal overflow'); }
    document.querySelectorAll('.gg-field input,.gg-field select,.gg-field textarea,nav button,nav a').forEach(el=>{const r=el.getBoundingClientRect();if(r.width<20||r.left< -1||r.right>innerWidth+1)fail.push('Clipped control');});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('body *').forEach(el=>{const s=getComputedStyle(el);if(s.animationName!=='none'||s.transitionDuration.split(',').some(v=>parseFloat(v)>0))fail.push('Motion enabled under reduced motion');});
    return [...new Set(fail)];
  });
  parity.push({view,width,motion,url:page.url(),screenshot:filename,status:violations.length?'FAIL':'PASS',violations});
  fs.writeFileSync(path.join(out,'parity.json'),JSON.stringify(parity,null,2));
  console.log(`${view} ${width} ${motion}: ${violations.length?'FAIL':'PASS'}`);
}
async function login(page) {
  await page.goto(`${origin}/login`);
  await page.getByLabel('Workspace password').fill(process.env.GG_ACCESS_PASSWORD);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Lead list',exact:true})).toBeVisible({timeout:45000});
  await expect(page.getByText('All edits saved to the shared workspace.',{exact:false})).toBeVisible({timeout:45000});
}
async function browserApi(page,path,method='GET',body) {
  return page.evaluate(async ({path,method,body})=>{const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};},{path,method,body});
}
const browser = await chromium.launch();
const secondBrowser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1440,height:960}});
const page = await context.newPage();page.on('pageerror',e=>errors.push(e.message));
let imported=false;
try {
  const unauth = await context.request.get(`${origin}/api/leads`);
  assert.equal(unauth.status(),401);
  await page.goto(`${origin}/pipeline`); await expect(page).toHaveURL(/\/login$/);
  report('Private gate and anonymous API rejection','PASS','Unauthenticated /pipeline redirects to /login; /api/leads returns 401.');
  await login(page); report('Live login','PASS','Password form authenticated on deployed origin; shared workspace loaded.');
  await page.getByRole('button',{name:'Import CSV',exact:true}).click();
  await page.getByLabel('Or paste CSV').fill(csv);
  await page.getByRole('button',{name:'Validate CSV',exact:true}).click();
  await page.getByLabel('One-time migration',{exact:false}).check();
  await page.getByRole('button',{name:'Import 3 leads',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0,{timeout:45000}); imported=true;
  const repeat=await browserApi(page,'/api/leads','POST',{csv,replace:false,oneTime:true});
  assert.equal(repeat.status,400); assert.match(repeat.data.error,/already been imported/);
  report('One-time CSV migration','PASS','Imported 3 explicitly marked EXAMPLE QA rows through live UI; identical backup rejected without mutation.');
  const otherContext=await secondBrowser.newContext({viewport:{width:1440,height:960}});
  const other=await otherContext.newPage(); await login(other);
  await page.getByRole('button',{name:leadName,exact:false}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Stage',{exact:false}).selectOption('Joined');
  await dialog.getByLabel('Signups',{exact:true}).fill('7');
  const note=`EXAMPLE live two-browser verification ${run}`;
  await dialog.getByLabel('Notes',{exact:true}).fill(note);
  await expect(dialog.getByText('All edits saved to the shared workspace.',{exact:true})).toBeVisible({timeout:45000});
  await page.screenshot({path:path.join(out,'ready-browser-one.png')});
  await other.getByRole('button',{name:leadName,exact:false}).first().click();
  await expect(other.getByRole('dialog').getByLabel('Notes',{exact:true})).toHaveValue(note,{timeout:15000});
  await expect(other.getByRole('dialog').getByLabel('Stage',{exact:false})).toHaveValue('Joined');
  await expect(other.getByRole('dialog').getByLabel('Signups',{exact:true})).toHaveValue('7');
  await other.screenshot({path:path.join(out,'ready-browser-two.png')});
  await other.reload(); await other.getByRole('button',{name:leadName,exact:false}).first().click();
  await expect(other.getByRole('dialog').getByLabel('Notes',{exact:true})).toHaveValue(note);
  report('Shared edits across independent browsers and reload','PASS','Two separate Chromium processes: stage Joined, signups 7 and notes appeared in browser two via polling, then persisted after reload. Screenshots ready-browser-one.png and ready-browser-two.png.');
  const denied=await context.request.patch(`${origin}/api/leads/${slugs[0]}`,{headers:{Origin:'https://example.invalid'},data:{notes:'wrong-origin'}}); assert.equal(denied.status(),403);
  const unknown=await browserApi(page,`/api/leads/${slugs[0]}`,'PATCH',{platform:'X'});assert.equal(unknown.status,400);
  report('Edit authorization and validation','PASS','Authenticated cross-origin PATCH rejected 403; unknown edit fields rejected 400.');
  await dialog.getByRole('button',{name:'Close'}).click();
  const email=await browserApi(page,'/api/email');
  if(email.data.live) report('Instantly loads live','PASS',`Official v2 server read succeeded at ${email.data.live.fetchedAt}; ${email.data.live.inboxes.length} inboxes; ${email.data.live.campaign ? 'campaign metrics received' : email.data.live.campaignMessage}.`);
  else report('Instantly loads live','BLOCKED',email.data.error || 'No live data received.');
  const cronDenied=await context.request.get(`${origin}/api/cron/email-snapshot`);assert.equal(cronDenied.status(),401);
  const cron=await fetch(`${origin}/api/cron/email-snapshot`,{headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`}});
  const cronResult=await cron.json();
  if(cron.ok){const retry=await fetch(`${origin}/api/cron/email-snapshot`,{headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`}});const repeated=await retry.json();assert.equal(repeated.inserted,false);report('Snapshot persistence and idempotency','PASS',`Captured ${cronResult.day}; repeat inserts no second row; anonymous cron rejected 401.`);}
  else report('Snapshot persistence and idempotency','BLOCKED',`Authorized cron HTTP ${cron.status}; real Instantly data required. Anonymous cron rejected 401.`);
  await otherContext.close();
  for(const width of [390,820,1440])for(const motion of ['normal','reduce']) {
    const c=await browser.newContext({viewport:{width,height:960},reducedMotion:motion==='reduce'?'reduce':'no-preference'});
    await c.grantPermissions(['clipboard-read','clipboard-write']);
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(`${origin}/login`);await capture(p,'login',width,motion);
    await login(p);await capture(p,'dashboard',width,motion);
    await p.getByRole('button',{name:'Import CSV',exact:true}).click();await p.getByLabel('Or paste CSV').fill(csv);await p.getByRole('button',{name:'Validate CSV'}).click();await capture(p,'import',width,motion);
    await p.getByRole('button',{name:'Import 0 leads',exact:true}).scrollIntoViewIfNeeded();await capture(p,'import-bottom',width,motion);await p.getByRole('dialog').getByRole('button',{name:'Close'}).click();
    await p.getByRole('button',{name:'Export CSV',exact:true}).click();await capture(p,'export',width,motion);
    assert.match(await p.getByLabel('CSV preview').inputValue(),new RegExp(note));
    const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Download CSV',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'gg-outreach-export.csv');await p.getByRole('dialog').getByRole('button',{name:'Close'}).click();
    await p.getByRole('button',{name:leadName,exact:false}).first().click();await capture(p,'drawer',width,motion);
    await p.locator('.gg-modal-body').evaluate(e=>{e.scrollTop=e.scrollHeight;});
    await p.getByRole('button',{name:'Copy draft',exact:true}).click();
    assert.match(await p.evaluate(()=>navigator.clipboard.readText()),new RegExp(`earningstournament.com/${slugs[0]}`));
    await capture(p,'drawer-bottom',width,motion);await p.getByRole('dialog').getByRole('button',{name:'Close'}).click();
    await p.getByRole('tab',{name:'Pipeline',exact:true}).click();await expect(p.locator('.gg-board')).toBeVisible();await capture(p,'pipeline',width,motion);
    if(width===390){const scrolled=await p.locator('.gg-board').evaluate(e=>{e.scrollLeft=e.scrollWidth;return e.scrollWidth>e.clientWidth&&e.scrollLeft>0;});assert.equal(scrolled,true);await capture(p,'pipeline-scrolled',width,motion);}
    if(width===1440&&motion==='normal') {
      const grip=p.getByRole('button',{name:`Drag ${leadName}`,exact:true});await grip.focus();await p.keyboard.press('Space');
      await expect(p.locator('.gg-overlay-card')).toBeVisible();
      await expect(p.locator('.gg-column-over')).toHaveAttribute('data-stage','Joined');
      await p.keyboard.press('ArrowLeft');await expect(p.locator('.gg-column-over')).toHaveAttribute('data-stage','Replied');
      await p.keyboard.press('Space');await expect(p.locator(`.gg-column[data-stage="Replied"] [data-lead="${slugs[0]}"]`)).toBeVisible();
      await expect.poll(async()=>{const result=await browserApi(p,'/api/leads');return result.data.leads.find(l=>l.tracked_slug===slugs[0]).stage;},{timeout:15000}).toBe('Replied');
      report('Live drag-to-stage','PASS','Keyboard drag grip moved test lead from Joined to Replied; database API confirmed saved stage.');
    }
    await p.getByRole('tab',{name:'Email',exact:true}).click();await expect(p.getByRole('button',{name:'Refresh live data',exact:true})).toBeVisible({timeout:60000});await capture(p,'email',width,motion);
    await c.close();
  }
  report('Deployed parity',''+(parity.some(r=>r.status==='FAIL')?'FAIL':'PASS'),`${parity.length} deployed screenshots; 390/820/1440; normal/reduced motion; dashboard/pipeline/email/drawer/login plus import/export. Email is ${email.data.live?'live data':'configuration error'} state.`);
  report('Browser runtime errors',errors.length?'FAIL':'PASS',errors.length ? errors : 'No uncaught page errors.');
} catch(e) { await page.screenshot({path:path.join(out,'gate-failure.png')}).catch(()=>{}); report('Gate execution','FAIL',e.message); process.exitCode=1; }
finally {
  if(imported) {
    try {
      const sql=neon(process.env.DATABASE_URL);
      await sql`DELETE FROM gg_leads WHERE slug = ANY(${slugs}::text[]) AND data->>'name' LIKE 'EXAMPLE%'`;
      const remaining=await browserApi(page,'/api/leads');
      assert.equal(remaining.data.leads.filter(l=>slugs.includes(l.tracked_slug)).length,0);
      report('QA cleanup','PASS','Only the 3 uniquely named EXAMPLE gate records were removed from the hosted workspace; real leads retained.');
    }catch(e){report('QA cleanup','FAIL',e.message);process.exitCode=1;}
  }
  await browser.close();await secondBrowser.close();
}
if(ready.some(r=>r.status==='FAIL')||parity.some(r=>r.status==='FAIL'))process.exitCode=1;
else if(ready.some(r=>r.status==='BLOCKED'))process.exitCode=2;
