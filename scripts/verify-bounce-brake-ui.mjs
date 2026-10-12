import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {chromium,expect} from '@playwright/test';
const origin=new URL(process.argv[2]??'https://gg-tourney-hub.vercel.app').origin;
const cookieFile=process.argv[3]??'.env.gg-campaign-work/dashboard-cookie';const cookie=fs.readFileSync(cookieFile,'utf8').trim();
const out='evidence/gg-bounce-brake';fs.mkdirSync(out,{recursive:true});
const read=await fetch(origin+'/api/email',{headers:{Cookie:cookie},signal:AbortSignal.timeout(60000)});assert.equal(read.status,200);const email=await read.json();assert(email.live);assert.equal(email.live.campaign.status,2);
const fixture={alert:{at:new Date().toISOString(),sent:200,bounced:10,rate:0.05,status:'paused'},lastCheck:{at:new Date().toISOString(),ok:true,sent:200,bounced:10}};
const result={checkedAt:new Date().toISOString(),origin,fixture:'Browser-only simulated 200 sends / 10 bounces. No production alert or bounce was fabricated.',cases:[]};
const browser=await chromium.launch();
try{
 for(const width of [390,820,1440])for(const motion of ['normal','reduce']){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:motion==='reduce'?'reduce':'no-preference'});const i=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),url:origin,httpOnly:true,secure:true,sameSite:'Strict'}]);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/email/bounce-brake',route=>route.fulfill({json:fixture}));
  await page.route('**/api/email',route=>route.fulfill({json:email}));
  await page.route('**/api/sync**',route=>route.fulfill({json:{ok:true,ran:false,reason:'UI fixture; no sync mutation.'}}));
  await page.goto(origin+'/email',{waitUntil:'domcontentloaded',timeout:60000});const alert=page.getByRole('alert',{name:'Campaign bounce brake'});await expect(alert).toBeVisible({timeout:60000});await expect(alert).toContainText('10 bounced / 200 sent (5.00%)');await expect(alert).toContainText('Only Rumman resumes');
  const geometry=await alert.evaluate(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return{left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,border:style.borderLeftColor,animation:style.animationName,transition:style.transitionDuration,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};});
  assert(geometry.left>=0&&geometry.right<=width+1);assert(geometry.scrollWidth<=geometry.clientWidth+1);assert(!geometry.pageOverflow);assert.deepEqual(errors,[]);
  if(motion==='reduce'){assert(geometry.reduced);assert.equal(geometry.animation,'none');assert(geometry.transition.split(',').every(v=>parseFloat(v)===0));}
  const screenshot='alert-'+width+'-'+motion+'.png';await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});result.cases.push({width,motion,status:'PASS',geometry,screenshot});fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(result,null,2));console.log(width+' '+motion+': PASS');await context.close();
 }
}finally{await browser.close();}
