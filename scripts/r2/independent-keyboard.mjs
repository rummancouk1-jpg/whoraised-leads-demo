// Actual Tab traversal of the new R2 surfaces in all 36 configurations. No shared writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit,expect} from '@playwright/test';
import {login,logout,cookieParts,activityFixture} from '../design/lib.mjs';
const origin='http://localhost:3103',dir='evidence/r2-independent';
const leads=JSON.parse(await fs.readFile(dir+'/leads.json','utf8'));
const rows=JSON.parse(await fs.readFile(dir+'/keyboard.json','utf8').catch(()=>'[]'));
for(const [engine,launch]of [['chrome',()=>chromium.launch({channel:'chrome'})],['edge',()=>chromium.launch({channel:'msedge'})],['webkit',()=>webkit.launch()]]){
 const browser=await launch();
 for(const width of [390,820,1440])for(const motion of ['no-preference','reduce'])for(const theme of ['light','dark']){
  const key=`${engine}-${width}-${motion}-${theme}`;
  if(rows.some(r=>r.key===key&&r.checks.length===6&&r.checks.every(c=>c.pass)))continue;
  const row={key,checks:[]};const previous=rows.findIndex(r=>r.key===key);if(previous>=0)rows.splice(previous,1);rows.push(row);
  const cookie=await login(origin),context=await browser.newContext({viewport:{width,height:width===390?844:1000},hasTouch:width<900,colorScheme:theme,reducedMotion:motion,serviceWorkers:'block'});
  await context.addCookies([{...cookieParts(cookie),url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
  await context.addInitScript(t=>localStorage.setItem('gg-theme',JSON.stringify(t)),theme);
  let fx=activityFixture('busy',leads);const timeline=fx.timeline;
  await context.route('**/api/activity',r=>{const body={...fx};delete body.timeline;return r.fulfill({json:body});});
  await context.route('**/api/sync**',r=>r.fulfill({json:{ran:false,ok:true}}));
  await context.route('**/api/errors',r=>r.fulfill({json:{ok:true}}));
  await context.route(/\/api\/leads\/[^/?]+\/activity$/,r=>r.fulfill({json:timeline(decodeURIComponent(new URL(r.request().url()).pathname.split('/').at(-2)))}));
  await context.route(/\/api\/leads(?:\/[^/?]+)?$/,r=>r.request().method()==='GET'?r.continue():r.abort('blockedbyclient'));
  const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
  async function check(label,fn){try{row.checks.push({label,pass:true,detail:await fn()});}catch(e){row.checks.push({label,pass:false,error:e.message.slice(0,800)});await page.screenshot({path:dir+'/screenshots/'+key+'-keyboard-failure.png'});}}
  async function traverse(rootSelector,selector,max=120){
   const wanted=await page.locator(selector).count();assert(wanted>0,'No targets rendered');
   const seen=new Set(),order=[];
   for(let i=0;i<max&&seen.size<wanted;i++){
    await page.keyboard.press('Tab');await page.waitForTimeout(120);
    const a=await page.evaluate(({rootSelector,selector})=>{
     const targets=[...document.querySelectorAll(selector)],active=document.activeElement,index=targets.indexOf(active);
     if(index<0)return null;
     const r=active.getBoundingClientRect();
     const points=[[.2,.2],[.5,.2],[.8,.2],[.2,.5],[.5,.5],[.8,.5],[.2,.8],[.5,.8],[.8,.8]];
     const visible=points.some(([x,y])=>{const px=r.left+r.width*x,py=r.top+r.height*y;if(px<0||px>=innerWidth||py<0||py>=innerHeight)return false;return document.elementsFromPoint(px,py).some(e=>e===active||active.contains(e));});
     return {index,inRoot:document.querySelector(rootSelector).contains(active),visible,text:active.textContent.slice(0,100)};
    },{rootSelector,selector});
    if(a&&!seen.has(a.index)){assert(a.inRoot);assert(a.visible,'Focused control obscured: '+a.text);seen.add(a.index);order.push(a.index);}
   }
   assert.equal(seen.size,wanted,'Some R2 targets unreachable by Tab');
   return {targets:wanted,order};
  }
  try{
   await page.goto(origin+'/');await expect(page.locator('.gg-needs-item').first()).toBeVisible({timeout:20000});
   await check('Home queue/freshness actual Tab order',async()=>{const r=await traverse('main','.gg-sync-pill time[tabindex="0"],.gg-needs .gg-fresh time[tabindex="0"],.gg-needs-item');assert.deepEqual(r.order,[...r.order].sort((a,b)=>a-b));return r;});
   await check('Focused timestamp shows exact time; Escape hides tooltip',async()=>{await page.locator('.gg-sync-pill time').focus();await expect(page.locator('.gg-sync-pill [role=tooltip]')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.gg-sync-pill [role=tooltip]')).toBeHidden();return 'exact time accessible on focus; Escape hides';});
   await page.locator('.gg-needs-item').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.gg-timeline')).toBeVisible({timeout:20000});
   await check('Drawer timeline actual Tab traversal',()=>traverse('[role=dialog]','.gg-timeline time[tabindex="0"]',180));
   await page.keyboard.press('Escape');
   for(const state of ['stale','failing']){fx=activityFixture(state,leads);await page.reload();await expect(page.locator('.gg-sync-banner')).toBeVisible({timeout:20000});await check(state+' warning actual Tab traversal',()=>traverse('main','.gg-sync-banner time[tabindex="0"],.gg-sync-banner button'));}
   await page.goto(origin+'/email');await expect(page.locator('.gg-digest')).toBeVisible({timeout:20000});
   await page.locator('#digest-title').evaluate(el=>{el.setAttribute('tabindex','-1');el.focus();});
   await check('Digest actual Tab traversal',()=>traverse('section:has(#digest-title)','section:has(#digest-title) time[tabindex="0"],section:has(#digest-title) a[href]',200));
  }finally{await context.close();await logout(origin,cookie);await fs.writeFile(dir+'/keyboard.json',JSON.stringify(rows,null,2));}
  console.log(key,row.checks.filter(c=>!c.pass).length+' keyboard failures');
 }
 await browser.close();
}
console.log(JSON.stringify({runs:rows.length,checks:rows.flatMap(r=>r.checks).length,failed:rows.flatMap(r=>r.checks).filter(c=>!c.pass).length}));
