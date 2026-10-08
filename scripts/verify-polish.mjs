import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import env from '@next/env';
import {neon} from '@neondatabase/serverless';
import {chromium} from '@playwright/test';
import {contract,schema} from './outreach-contract.mjs';
env.loadEnvConfig(process.cwd());
const origin=process.argv[2]||'https://gg-tourney-hub.vercel.app',label=process.argv[3]||'live';
const sql=neon(process.env.DATABASE_URL),rows=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const all=rows.map(r=>r.data).filter(l=>!contract.isExample(l)),priority=all.filter(l=>contract.leadTier(l)==='priority'),tail=all.length-priority.length,results=[];
const counts={priority:priority.length,longTail:tail,total:all.length};
await fs.mkdir('evidence/polish-r1',{recursive:true});
for(const channel of ['chrome','msedge']) {
 const browser=await chromium.launch({channel});
 for(const width of [390,820,1440]) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion}),page=await context.newPage(),errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  const result={browser:channel,width,reducedMotion,counts,gates:{},consoleErrors:errors};
  try {
   await page.goto(origin+'/login');await page.getByLabel('Workspace password',{exact:true}).fill(process.env.GG_ACCESS_PASSWORD);await page.locator('button[type=submit]').click();await page.waitForURL(origin+'/');
   const api=await context.request.get(origin+'/api/leads');assert(api.ok());const body=await api.json();assert.deepEqual((body.leads||body).map(l=>l.tracked_slug).sort(),rows.map(r=>r.slug).sort());
   for(const route of ['/','/pipeline']) {
    await page.goto(origin+route);
    const selector=route==='/'?'.gg-table tbody tr':'.gg-pipeline-card';
    await page.waitForFunction(({selector,n})=>document.querySelectorAll(selector).length===n,{selector,n:priority.length});
    const status=await page.getByRole('region',{name:'Outreach status'}).innerText();assert(status.includes(`Priority: ${priority.length} · Long tail: ${tail}`));
    const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page-level overflow');await noOverflow();
    const toggle=page.getByRole('checkbox',{name:`Show long tail (${tail})`,exact:true});assert.equal(await toggle.isChecked(),false);
    if(route==='/') {
     const panel=page.locator('.gg-group-card').filter({has:page.getByRole('heading',{name:'Outreach group',exact:true})});
     const checkAnalytics=async leads=>{for(const kind of schema.KINDS){const n=leads.filter(l=>l.kind===kind).length;if(n)assert((await panel.locator('tbody tr').filter({hasText:schema.GROUP_NAMES[kind]}).innerText()).includes(`${n} leads`));}};
     await checkAnalytics(priority);await toggle.check();await page.waitForFunction(n=>document.querySelectorAll('.gg-table tbody tr').length===n,all.length);await checkAnalytics(all);
     const clickApi=(await api.json()).clicks;
     const expectedClicks=clickApi.leads.filter(r=>priority.some(l=>l.tracked_slug===r.slug)).reduce((n,r)=>n+r.clicks,0);
     await toggle.uncheck();await page.waitForFunction(n=>document.querySelectorAll('.gg-table tbody tr').length===n,priority.length);
     assert((await page.locator('.gg-learning').filter({has:page.getByRole('heading',{name:'Click activity',exact:true})}).locator('.gg-badge').innerText()).includes(`${expectedClicks} clicks`));
     const displayedNames=await page.locator('.gg-table tbody tr td:first-child button').evaluateAll(els=>els.map(el=>el.childNodes[0].textContent));assert.deepEqual(displayedNames.sort(),priority.map(l=>l.name).sort());
     result.gates.listAnalyticsCountsToggle='PASS';
    } else {
     const board=await page.locator('.gg-board').evaluate(el=>{const r=el.getBoundingClientRect();return {clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,peek:[...el.querySelectorAll('.gg-column')].some(c=>{const b=c.getBoundingClientRect();return b.left<r.right-10&&b.right>r.right+1}),scrollBehavior:getComputedStyle(el).scrollBehavior};});
     result.board=board;if(width<1000){assert(board.scrollWidth>board.clientWidth&&board.peek,'next-column peek');await page.locator('.gg-board').evaluate(el=>{el.scrollLeft=130});await page.waitForTimeout(350);assert(await page.locator('.gg-board').evaluate(el=>el.scrollLeft>0));await page.locator('.gg-board').evaluate(el=>{el.scrollLeft=0});}
     if(reducedMotion==='reduce')assert.equal(board.scrollBehavior,'auto');
     const slugs=await page.locator('.gg-pipeline-card').evaluateAll(els=>els.map(el=>el.dataset.lead));assert.deepEqual(slugs.sort(),priority.map(l=>l.tracked_slug).sort());
     await toggle.check();await page.waitForFunction(n=>document.querySelectorAll('.gg-pipeline-card').length===n,all.length);await noOverflow();await toggle.uncheck();await page.waitForFunction(n=>document.querySelectorAll('.gg-pipeline-card').length===n,priority.length);
     result.gates.boardCountsToggleScrollMotion='PASS';
     await page.locator('.gg-board').evaluate(el=>window.scrollTo(0,scrollY+el.getBoundingClientRect().top-30));
    }
    await noOverflow();await page.screenshot({path:`evidence/polish-r1/${label}-${channel}-${width}-${reducedMotion}-${route==='/'?'list':'board'}.png`});
   }
   await page.waitForTimeout(500);assert.equal(errors.length,0,errors.join('\n'));result.gates.overflowStatusConsole='PASS';result.pass=true;
  } catch(e){result.pass=false;result.failure=e.message;}
  results.push(result);console.log(JSON.stringify({browser:channel,width,reducedMotion,pass:result.pass,failure:result.failure}));await context.close();
 }
 await browser.close();
}
await fs.writeFile(`evidence/polish-r1/${label}-gates.json`,JSON.stringify({origin,checkedAt:new Date().toISOString(),counts,results},null,2));assert(results.every(r=>r.pass),'Viewport gate failure');
