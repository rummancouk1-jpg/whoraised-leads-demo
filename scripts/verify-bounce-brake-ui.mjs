import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {chromium,expect} from '@playwright/test';
const origin=new URL(process.argv[2]??'https://gg-tourney-hub.vercel.app').origin;
const cookie=fs.readFileSync(process.argv[3]??'.env.gg-campaign-work/dashboard-cookie','utf8').trim();
const out='evidence/gg-bounce-brake';fs.mkdirSync(out,{recursive:true});
const read=await fetch(origin+'/api/email',{headers:{Cookie:cookie},signal:AbortSignal.timeout(60000)});assert.equal(read.status,200);const email=await read.json();assert(email.live);assert.equal(String(email.live.campaign.status),'2');
const result={checkedAt:new Date().toISOString(),origin,fixture:'Browser-only breach and active/stale fixtures. No production campaign mutations.',cases:[]};
const browser=await chromium.launch();
try{
 for(const width of [390,820,1440])for(const motion of ['normal','reduce'])for(const scenario of ['alert','stale']){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:motion==='reduce'?'reduce':'no-preference'});const i=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),url:origin,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'Strict'}]);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const now=Date.now(),at=new Date(now-(scenario==='stale'?31*60000:0)).toISOString();
  const success={at,ok:true,sent:200,bounced:scenario==='alert'?10:0,campaignStatus:scenario==='stale'?1:2};
  let fixture={alert:scenario==='alert'?{at,sent:200,bounced:10,rate:0.05,status:'paused'}:null,lastCheck:scenario==='stale'?{at:new Date(now).toISOString(),ok:false}:success,lastSuccess:success};
  let metrics=structuredClone(email);metrics.live.campaign.status=scenario==='stale'?1:2;
  await page.route('**/api/email/bounce-brake',route=>route.fulfill({json:fixture}));
  await page.route('**/api/email',route=>route.fulfill({json:metrics}));
  await page.route('**/api/sync**',route=>route.fulfill({json:{ok:true,ran:false,reason:'UI fixture; no sync mutation.'}}));
  await page.goto(origin+'/email',{waitUntil:'domcontentloaded',timeout:60000});
  const alert=page.getByRole('alert',{name:scenario==='stale'?'Bounce brake not running':'Campaign bounce brake'});await expect(alert).toBeVisible({timeout:60000});
  await expect(page.locator('time[datetime="'+at+'"]')).toBeVisible();
  if(scenario==='stale')await expect(alert).toContainText('No successful check in the last 30 minutes');
  else {await expect(alert).toContainText('10 bounced / 200 sent (5.00%)');await expect(alert).toContainText('Only Rumman resumes');}
  const geometry=await alert.evaluate(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return{left:r.left,right:r.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,border:style.borderLeftColor,animation:style.animationName,transition:style.transitionDuration,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};});
  assert(geometry.left>=0&&geometry.right<=width+1);assert(geometry.scrollWidth<=geometry.clientWidth+1);assert(!geometry.pageOverflow);assert.deepEqual(errors,[]);
  const [red,green,blue]=geometry.border.match(/\d+/g).map(Number);assert(red>green*1.5&&red>blue*1.5,'Alert must use the red error color');
  if(motion==='reduce'){assert(geometry.reduced);assert.equal(geometry.animation,'none');assert(geometry.transition.split(',').every(v=>parseFloat(v)===0));}
  const screenshot=scenario+'-'+width+'-'+motion+'.png';await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});result.cases.push({width,motion,scenario,status:'PASS',geometry,screenshot});fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(result,null,2));console.log(scenario+' '+width+' '+motion+': PASS');
  if(width===390&&motion==='normal'&&scenario==='stale'){
   // Paused campaigns have no active-campaign alarm; successful reads, missing history, and failure preserve freshness semantics.
   metrics.live.campaign.status=2;fixture.lastSuccess.campaignStatus=2;
   await page.reload();await expect(page.getByRole('alert',{name:'Bounce brake not running'})).toHaveCount(0);await expect(page.locator('time[datetime="'+at+'"]')).toBeVisible();
   metrics.live.campaign.status=1;fixture={alert:null,lastCheck:null,lastSuccess:null};
   await page.reload();await expect(page.getByRole('alert',{name:'Bounce brake not running'})).toBeVisible();
   const fresh=new Date().toISOString();fixture={alert:null,lastCheck:{at:fresh,ok:true},lastSuccess:{at:fresh,ok:true,campaignStatus:1}};
   await page.reload();await expect(page.locator('time[datetime="'+fresh+'"]')).toBeVisible();await expect(page.getByRole('alert',{name:'Bounce brake not running'})).toHaveCount(0);
   result.behavior='PASS: stale active + newer failed check, stale paused, missing success, fresh active';
  }
  await context.close();
 }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(result,null,2));
