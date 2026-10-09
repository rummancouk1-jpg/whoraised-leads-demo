// UI acceptance audit against an immutable, isolated preview deployment.
// Activity fixtures exercise otherwise empty R2 states; all writes are intercepted.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit,expect as baseExpect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {login,logout,cookieParts,activityFixture,protectionHeaders} from '../design/lib.mjs';
const origin=process.argv[2]||'http://localhost:3104',dir=process.env.EVIDENCE_ROOT||'evidence/r2-fix/matrix';
await fs.mkdir(dir+'/screenshots',{recursive:true});
const leads=JSON.parse(await fs.readFile('evidence/r2-independent/leads.json','utf8'));
const rows=[];const browsers=[['chrome',()=>chromium.launch({channel:'chrome'})],['edge',()=>chromium.launch({channel:'msedge'})],['webkit',()=>webkit.launch()]].filter(([engine])=>!process.env.MATRIX_ENGINE||engine===process.env.MATRIX_ENGINE);
const selected=process.env.MATRIX_KEYS?.split(',');
// Remote hydration and data reads can exceed the default five seconds on a contended machine.
const expect=baseExpect.configure({timeout:20000});
for(const [engine,launch] of browsers){
 let browser;try{browser=await launch();}catch(e){rows.push({engine,unavailable:e.message});continue;}
 for(const width of [390,820,1440])for(const motion of ['no-preference','reduce'])for(const theme of ['light','dark']){
  const key=`${engine}-${width}-${motion}-${theme}`;const row={key,checks:[],screenshots:[],errors:[]};rows.push(row);
  if(selected&&!selected.includes(key)){rows.pop();continue;}
  const cookie=await login(origin);const parts=cookieParts(cookie);
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},hasTouch:width<900,colorScheme:theme,reducedMotion:motion,serviceWorkers:'block',extraHTTPHeaders:protectionHeaders()});
  await context.addCookies([{...parts,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
  await context.addInitScript(t=>localStorage.setItem('gg-theme',JSON.stringify(t)),theme);
  let fx=activityFixture('busy',leads);const timeline=fx.timeline;let timelineFailed=false,digestFailed=false;
  await context.route('**/api/activity',r=>{const body={...fx};delete body.timeline;return r.fulfill({json:body});});
  await context.route('**/api/sync**',r=>r.fulfill({json:{ran:false,ok:true}}));
  await context.route('**/api/errors',r=>r.fulfill({json:{ok:true}}));
  await context.route(/\/api\/leads\/[^/?]+\/activity$/,r=>{
   if(timelineFailed)return r.fulfill({status:503,json:{error:'fixture unavailable'}});
   const state=timeline(decodeURIComponent(new URL(r.request().url()).pathname.split('/').at(-2)));
   const now=Date.now();state.events=[{ref:'fixture-day-one-send',kind:'sent',at:new Date(now-6*86400000).toISOString(),n:1},{ref:'fixture-day-two-open',kind:'opened',at:new Date(now-2*86400000).toISOString(),n:1},{ref:'fixture-day-three-reply',kind:'replied',at:new Date(now-5*3600000).toISOString(),n:1}];
   return r.fulfill({json:state});
  });
  await context.route('**/api/digest',r=>digestFailed?r.fulfill({status:503,json:{error:'fixture unavailable'}}):r.continue());
  await context.route(/\/api\/leads(?:\/[^/?]+)?$/,r=>r.request().method()==='GET'?r.continue():r.abort('blockedbyclient'));
  const page=await context.newPage();page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>row.errors.push(e.message));
  row.assetFailures=[];
  page.on('requestfailed',request=>{if(request.url().includes('/_next/static/'))row.assetFailures.push({url:request.url(),error:request.failure()?.errorText});});
  page.on('response',response=>{if(response.status()>=400&&response.url().includes('/_next/static/'))row.assetFailures.push({url:response.url(),status:response.status()});});
  async function check(label,fn){try{const detail=await fn();row.checks.push({label,pass:true,detail});}catch(e){row.checks.push({label,pass:false,error:e.message.slice(0,700)});}}
  async function axe(label){await check(label,async()=>{const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));return 0;});}
  async function capture(label,selector){const loc=page.locator(selector).first();await loc.scrollIntoViewIfNeeded();const file=`screenshots/${key}-fixture-${label}.png`;await loc.screenshot({path:dir+'/'+file});row.screenshots.push(file);}
  async function traverse(selector,start){
   if(start)await page.locator(start).first().evaluate(el=>{el.tabIndex=-1;el.focus();});
   const wanted=await page.locator(selector).count();assert(wanted>0,'No keyboard targets rendered');const seen=new Set(),order=[];
   for(let i=0;i<150&&seen.size<wanted;i++){
    await page.keyboard.press('Tab');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const value=await page.evaluate(selector=>{const targets=[...document.querySelectorAll(selector)],el=document.activeElement,index=targets.indexOf(el);if(index<0)return null;const r=el.getBoundingClientRect();const visible=[[.2,.2],[.5,.5],[.8,.8]].some(([x,y])=>{const px=r.left+r.width*x,py=r.top+r.height*y;return px>=0&&px<innerWidth&&py>=0&&py<innerHeight&&document.elementsFromPoint(px,py).some(n=>n===el||el.contains(n));});return {index,visible,text:el.textContent.slice(0,100)};},selector);
    if(value&&!seen.has(value.index)){assert(value.visible,'Focused target obscured: '+value.text);seen.add(value.index);order.push(value.index);}
   }
   assert.equal(seen.size,wanted,'Some controls unreachable by actual Tab');assert.deepEqual(order,[...order].sort((a,b)=>a-b));return {targets:wanted,order};
  }
  async function inspect(label,selector){await check(label,async()=>page.locator(selector).first().evaluate(root=>{
   const rect=root.getBoundingClientRect();const controls=[...root.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"],[role="option"],[role="tab"]')].filter(el=>el.getClientRects().length);
   const small=controls.map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,90),w:r.width,h:r.height};}).filter(r=>r.w<43.9||r.h<43.9);
   const clipped=[...root.querySelectorAll('*')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+2&&['hidden','clip'].includes(getComputedStyle(el).overflowX)).map(el=>({tag:el.tagName,text:el.textContent.slice(0,100)}));
   return {w:rect.width,pageOverflow:document.documentElement.scrollWidth-innerWidth,small,clipped};
  }));const c=row.checks.at(-1);if(c.detail&&(c.detail.small.length||c.detail.pageOverflow>2)){c.pass=false;c.error='Controls below 44px or page overflow';}}
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await expect(page.locator('.gg-needs-item').first()).toBeVisible();await expect(page.locator('.gg-name-button').first()).toBeVisible();
   await inspect('needs-action queue targets, overflow, truncation','.gg-needs');await capture('queue','.gg-needs');await axe('busy queue axe WCAG');
   await inspect('freshness pill targets','.gg-sync-pill');await capture('freshness','.gg-sync-pill');
   await check('queue and freshness actual Tab order',()=>traverse('.gg-sync-pill time[tabindex="0"],.gg-needs .gg-fresh time[tabindex="0"],.gg-needs-item','.gg-hero'));
   await check('queue keyboard Enter, focus trap, Escape, return focus',async()=>{
    const button=page.locator('.gg-needs-item').first();await button.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.gg-timeline').first()).toBeVisible();
    await page.keyboard.press('Shift+Tab');assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Tab');assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));
    await expect(page.getByRole('heading',{name:'History',exact:true})).toBeVisible();await inspect('activity timeline and multi-day history targets and overflow','.gg-drawer-section:has(.gg-timeline)');await capture('timeline','.gg-drawer-section:has(.gg-timeline)');await axe('timeline drawer axe WCAG');await check('timeline and history actual Tab order',()=>traverse('.gg-drawer-section:has(.gg-timeline) time[tabindex="0"]','.gg-drawer-section:has(.gg-timeline)'));await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(button).toBeFocused();return 'Enter opens, Tab wraps, Escape closes, focus restored';
   });
   await check('queue tap on relative time opens drawer',async()=>{await page.locator('.gg-needs-item').first().locator('time').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');return 'opens';});
   await check('timeline failure retry and restored trigger focus',async()=>{
    timelineFailed=true;const trigger=page.locator('.gg-needs-item').first();await trigger.click();await expect(page.getByRole('button',{name:'Retry lead activity'})).toBeVisible();await inspect('timeline failure targets','[role=dialog]');await axe('timeline failure axe WCAG');
    timelineFailed=false;await page.getByRole('button',{name:'Retry lead activity'}).click();await expect(page.locator('.gg-timeline').first()).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();return '503, visible retry, recovered timeline, exact opener';
   });
   await check('ordinary dialog Tab wrap and trigger focus restoration',async()=>{
    const trigger=page.getByRole('button',{name:'Export CSV',exact:true});await trigger.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));await axe('ordinary dialog axe WCAG');await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();return 'keyboard opens, wraps, restores';
   });
   for(const state of ['stale','failing']){fx=activityFixture(state,leads);await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('.gg-sync-banner')).toContainText(state==='stale'?"hasn't synced in over 40 minutes":'HTTP 401');await inspect(state+' warning targets and overflow','.gg-sync-banner');await capture(state,'.gg-sync-banner');await axe(state+' warning axe WCAG');await check(state+' warning actual Tab order',()=>traverse('.gg-sync-banner time[tabindex="0"],.gg-sync-banner button','.gg-sync-banner'));await check(state+' honest empty queue',async()=>{await expect(page.locator('.gg-needs-empty')).toContainText("Can't confirm");return await page.locator('.gg-needs-empty').innerText();});}
   await check('home axe WCAG',async()=>{await page.evaluate(()=>scrollTo(0,0));const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));return 0;});
   digestFailed=true;await page.goto(origin+'/email',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'Retry digest preview'})).toBeVisible();await inspect('digest failure retry targets','section:has(#digest-title)');await axe('digest failure axe WCAG');digestFailed=false;await page.getByRole('button',{name:'Retry digest preview'}).click();await expect(page.locator('.gg-digest')).toBeVisible({timeout:20000});await inspect('digest preview targets, overflow, truncation','section:has(#digest-title)');await capture('digest','section:has(#digest-title)');
   await check('digest link keyboard reachable',async()=>{const link=page.getByRole('link',{name:'Open the exact email in a new tab'});await link.focus();await expect(link).toBeFocused();assert.equal(await link.getAttribute('href'),'/api/digest?format=html');return 'focusable exact-email link';});
   await check('digest actual Tab order',()=>traverse('section:has(#digest-title) time[tabindex="0"],section:has(#digest-title) a[href]','#digest-title'));
   await check('email axe WCAG',async()=>{await page.evaluate(()=>scrollTo(0,0));const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));return 0;});
   await check('palette keyboard trap and trigger focus restoration',async()=>{const trigger=page.getByRole('button',{name:/search|command/i}).first();await trigger.focus();await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();await inspect('palette hit targets','[role=dialog]');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();return 'focus restored';});
   await page.goto(origin+'/pipeline',{waitUntil:'domcontentloaded'});await expect(page.locator('.gg-pipeline-card').first()).toBeVisible();await check('pipeline R2 warning and page overflow',async()=>{await expect(page.locator('.gg-sync-banner')).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));return 'banner visible; no page overflow';});
   await axe('pipeline axe WCAG');
   if(motion==='reduce')await check('reduced motion',async()=>{assert(await page.locator('.gg-sync-banner').evaluate(el=>getComputedStyle(el).animationName==='none'&&parseFloat(getComputedStyle(el).transitionDuration)===0));return 'none';});
  }catch(e){row.errors.push(e.message.slice(0,900));row.failurePage={url:page.url(),text:(await page.locator('body').innerText().catch(()=>'' )).slice(0,2500)};await page.screenshot({path:dir+'/screenshots/'+key+'-runtime-failure.png',fullPage:true}).catch(()=>{});}
  finally{await context.close();await logout(origin,cookie);await fs.writeFile(dir+'/matrix.json',JSON.stringify(rows,null,2));}
  console.log(key,row.checks.filter(c=>!c.pass).length+' failed checks',row.errors.length+' runtime errors');
 }
 await browser.close();
}
const summary={at:new Date().toISOString(),origin,runs:rows.length,checks:rows.flatMap(r=>r.checks??[]).length,failed:rows.flatMap(r=>r.checks??[]).filter(c=>!c.pass).length,runtimeErrors:rows.flatMap(r=>r.errors??[]).length,axeScans:rows.flatMap(r=>r.checks??[]).filter(c=>/axe/.test(c.label)).length};await fs.writeFile(dir+'/matrix.json',JSON.stringify(rows,null,2));await fs.writeFile(dir+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));if(summary.runs!==(selected?.length??(process.env.MATRIX_ENGINE?12:36))||summary.failed||summary.runtimeErrors||rows.some(r=>r.unavailable))process.exitCode=1;
