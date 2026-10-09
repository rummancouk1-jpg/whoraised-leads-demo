// Independent UI audit against the real local build behind independent-readonly.cjs.
// Activity fixtures exercise otherwise empty R2 states; all writes are intercepted.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {login,logout,cookieParts,activityFixture} from '../design/lib.mjs';
const origin='http://localhost:3103',dir='evidence/r2-independent';
await fs.mkdir(dir+'/screenshots',{recursive:true});
const leads=JSON.parse(await fs.readFile(dir+'/leads.json','utf8'));
const rows=[];const browsers=[['chrome',()=>chromium.launch({channel:'chrome'})],['edge',()=>chromium.launch({channel:'msedge'})],['webkit',()=>webkit.launch()]];
for(const [engine,launch] of browsers){
 let browser;try{browser=await launch();}catch(e){rows.push({engine,unavailable:e.message});continue;}
 for(const width of [390,820,1440])for(const motion of ['no-preference','reduce'])for(const theme of ['light','dark']){
  const key=`${engine}-${width}-${motion}-${theme}`;const row={key,checks:[],screenshots:[],errors:[]};rows.push(row);
  const cookie=await login(origin);const parts=cookieParts(cookie);
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},hasTouch:width<900,colorScheme:theme,reducedMotion:motion,serviceWorkers:'block'});
  await context.addCookies([{...parts,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
  await context.addInitScript(t=>localStorage.setItem('gg-theme',JSON.stringify(t)),theme);
  let fx=activityFixture('busy',leads);const timeline=fx.timeline;
  await context.route('**/api/activity',r=>{const body={...fx};delete body.timeline;return r.fulfill({json:body});});
  await context.route('**/api/sync**',r=>r.fulfill({json:{ran:false,ok:true}}));
  await context.route('**/api/errors',r=>r.fulfill({json:{ok:true}}));
  await context.route(/\/api\/leads\/[^/?]+\/activity$/,r=>r.fulfill({json:timeline(decodeURIComponent(new URL(r.request().url()).pathname.split('/').at(-2)))}));
  await context.route(/\/api\/leads(?:\/[^/?]+)?$/,r=>r.request().method()==='GET'?r.continue():r.abort('blockedbyclient'));
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
  async function check(label,fn){try{const detail=await fn();row.checks.push({label,pass:true,detail});}catch(e){row.checks.push({label,pass:false,error:e.message.slice(0,700)});}}
  async function capture(label,selector){const loc=page.locator(selector).first();await loc.scrollIntoViewIfNeeded();const file=`screenshots/${key}-fixture-${label}.png`;await loc.screenshot({path:dir+'/'+file});row.screenshots.push(file);}
  async function inspect(label,selector){await check(label,async()=>page.locator(selector).first().evaluate(root=>{
   const rect=root.getBoundingClientRect();const controls=[...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(el=>el.getClientRects().length);
   const small=controls.map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,90),w:r.width,h:r.height};}).filter(r=>r.w<43.9||r.h<43.9);
   const clipped=[...root.querySelectorAll('*')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+2&&['hidden','clip'].includes(getComputedStyle(el).overflowX)).map(el=>({tag:el.tagName,text:el.textContent.slice(0,100)}));
   return {w:rect.width,pageOverflow:document.documentElement.scrollWidth-innerWidth,small,clipped};
  }));const c=row.checks.at(-1);if(c.detail&&(c.detail.small.length||c.detail.pageOverflow>2)){c.pass=false;c.error='Controls below 44px or page overflow';}}
  try{
   await page.goto(origin+'/');await expect(page.locator('.gg-needs-item').first()).toBeVisible();await expect(page.locator('.gg-name-button').first()).toBeVisible();
   await inspect('needs-action queue targets, overflow, truncation','.gg-needs');await capture('queue','.gg-needs');
   await inspect('freshness pill targets','.gg-sync-pill');await capture('freshness','.gg-sync-pill');
   await check('queue keyboard Enter, focus trap, Escape, return focus',async()=>{
    const button=page.locator('.gg-needs-item').first();await button.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.gg-timeline')).toBeVisible();
    await page.keyboard.press('Shift+Tab');assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Tab');assert(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)));
    await inspect('activity timeline targets and overflow','.gg-timeline');await capture('timeline','.gg-timeline');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(button).toBeFocused();return 'Enter opens, Tab wraps, Escape closes, focus restored';
   });
   await check('queue tap on relative time opens drawer',async()=>{await page.locator('.gg-needs-item').first().locator('time').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');return 'opens';});
   for(const state of ['stale','failing']){fx=activityFixture(state,leads);await page.reload();await expect(page.locator('.gg-sync-banner')).toBeVisible();await inspect(state+' warning targets and overflow','.gg-sync-banner');await capture(state,'.gg-sync-banner');await check(state+' honest empty queue',async()=>{await expect(page.locator('.gg-needs-empty')).toContainText("Can't confirm");return await page.locator('.gg-needs-empty').innerText();});}
   await check('home axe WCAG',async()=>{await page.evaluate(()=>scrollTo(0,0));const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));return 0;});
   await page.goto(origin+'/email');await expect(page.locator('.gg-digest')).toBeVisible({timeout:20000});await inspect('digest preview targets, overflow, truncation','section:has(#digest-title)');await capture('digest','section:has(#digest-title)');
   await check('digest link keyboard reachable',async()=>{const link=page.getByRole('link',{name:'Open the exact email in a new tab'});await link.focus();await expect(link).toBeFocused();assert.equal(await link.getAttribute('href'),'/api/digest?format=html');return 'focusable exact-email link';});
   await check('email axe WCAG',async()=>{await page.evaluate(()=>scrollTo(0,0));const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));return 0;});
   await page.goto(origin+'/pipeline');await expect(page.locator('.gg-pipeline-card').first()).toBeVisible();await check('pipeline R2 warning and page overflow',async()=>{await expect(page.locator('.gg-sync-banner')).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));return 'banner visible; no page overflow';});
   if(motion==='reduce')await check('reduced motion',async()=>{assert(await page.locator('.gg-sync-banner').evaluate(el=>getComputedStyle(el).animationName==='none'&&parseFloat(getComputedStyle(el).transitionDuration)===0));return 'none';});
  }catch(e){row.errors.push(e.message.slice(0,900));}
  finally{await context.close();await logout(origin,cookie);await fs.writeFile(dir+'/matrix.json',JSON.stringify(rows,null,2));}
  console.log(key,row.checks.filter(c=>!c.pass).length+' failed checks',row.errors.length+' runtime errors');
 }
 await browser.close();
}
console.log(JSON.stringify({runs:rows.length,checks:rows.flatMap(r=>r.checks??[]).length,failed:rows.flatMap(r=>r.checks??[]).filter(c=>!c.pass).length,runtimeErrors:rows.flatMap(r=>r.errors??[]).length}));
