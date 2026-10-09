import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import { neon } from '@neondatabase/serverless';
import { chromium } from '@playwright/test';
import { contract, schema } from './outreach-contract.mjs';
env.loadEnvConfig(process.cwd());
const origin=new URL(process.argv[2]||'http://localhost:3100').origin;
const label=process.argv[3]||'local';
assert(/^[a-z0-9-]+$/.test(label));
const sql=neon(process.env.DATABASE_URL);
const rows=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const real=rows.map(r=>r.data).filter(l=>!contract.isExample(l));
const groups=Object.fromEntries(schema.KINDS.map(k=>[k,real.filter(l=>l.kind===k).length]));
const results=[];
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel});
 for(const width of [390,820,1440])for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion});
  const page=await context.newPage();const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  const result={browser:channel==='chrome'?'Chrome':'Edge',width,reducedMotion,origin,groups,consoleErrors:errors,gates:{}};
  try{
   await page.goto(origin+'/login');
   await page.getByLabel('Workspace password',{exact:true}).fill(process.env.GG_ACCESS_PASSWORD);
   await page.locator('button[type=submit]').click();
   await page.waitForURL(origin+'/');
   await page.waitForFunction(n=>document.querySelectorAll('.gg-table tbody tr').length===n,real.length);
   const api=await context.request.get(origin+'/api/leads');assert(api.ok(),'leads API failed');
   const body=await api.json();const apiLeads=body.leads||body;
   assert.deepEqual(apiLeads.map(l=>l.tracked_slug).sort(),rows.map(r=>r.slug).sort(),'Browser API does not match DB');
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(overflow.page<=overflow.viewport,JSON.stringify(overflow));result.gates.listOverflow='PASS';
   const status=await page.getByRole('region',{name:'Outreach status'}).innerText();
   const groupPanel=page.locator('.gg-group-card').filter({has:page.getByRole('heading',{name:'Outreach group',exact:true})});
   for(const [kind,n] of Object.entries(groups)){
    const name=schema.GROUP_NAMES[kind];
    assert(status.includes(`${name}: ${n}`),'Status count mismatch: '+name);
    const analytics=groupPanel.locator('tbody tr').filter({hasText:name});
    assert((await analytics.innerText()).includes(`${n} leads`),'Analytics count mismatch: '+name);
    await page.getByRole('combobox',{name:/^Group/}).selectOption(kind);
    await page.waitForFunction(n=>document.querySelectorAll('.gg-table tbody tr').length===n,n);
    assert((await page.locator('.gg-table tbody tr td:nth-child(4)').allTextContents()).every(t=>t===name),'Wrong group label');
   }
   await page.getByRole('button',{name:'Reset filters',exact:true}).click();
   result.gates.listFiltersAnalyticsStatus='PASS';
   await page.screenshot({path:`evidence/creator-audit-r2/${label}-${channel}-${width}-${reducedMotion}-list.png`});
   await page.goto(origin+'/pipeline');
   await page.waitForFunction(n=>document.querySelectorAll('.gg-pipeline-card').length===n,real.length);
   const board=await page.locator('.gg-board').evaluate(el=>{
    const rect=el.getBoundingClientRect();const columns=[...el.querySelectorAll('.gg-column')].map(c=>{const r=c.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width};});
    return {page:document.documentElement.scrollWidth,viewport:innerWidth,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,left:rect.left,right:rect.right,columns,peek:columns.some(c=>c.left<rect.right-10&&c.right>rect.right+1)};
   });
   result.board=board;
   assert(board.page<=width,JSON.stringify(board));result.gates.boardOverflow='PASS';
   if(width<1000){assert(board.scrollWidth>board.clientWidth&&board.peek,'Next column must peek inside the board');result.gates.peek='PASS';}else result.gates.peek='N/A';
   const boardSlugs=await page.locator('.gg-pipeline-card').evaluateAll(els=>els.map(e=>e.dataset.lead));
   assert.deepEqual(boardSlugs.sort(),real.map(l=>l.tracked_slug).sort());
   for(const [kind,n] of Object.entries(groups)){
    const name=schema.GROUP_NAMES[kind];
    await page.getByRole('combobox',{name:/^Group/}).selectOption(kind);
    await page.waitForFunction(n=>document.querySelectorAll('.gg-pipeline-card').length===n,n);
    assert.equal(await page.locator('.gg-card-tags span').filter({hasText:new RegExp('^'+name+'$')}).count(),n);
   }
   await page.getByRole('button',{name:'Reset filters',exact:true}).click();
   await page.waitForFunction(n=>document.querySelectorAll('.gg-pipeline-card').length===n,real.length);
   for(const stage of schema.STAGES){
    const n=real.filter(l=>l.stage===stage).length;
    assert.equal(Number(await page.locator(`.gg-column[data-stage="${stage}"] .gg-column-count`).innerText()),n);
   }
   result.gates.boardGroups='PASS';
   if(board.scrollWidth>board.clientWidth){
    await page.locator('.gg-board').evaluate(el=>{el.scrollLeft=150;});
    await page.waitForTimeout(350);
    assert(await page.locator('.gg-board').evaluate(el=>el.scrollLeft>0),'Board cannot scroll');
    await page.locator('.gg-board').evaluate(el=>{el.scrollLeft=0;});
   }
   if(reducedMotion==='reduce')assert.equal(await page.locator('.gg-board').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto');
   result.gates.motion='PASS';
   await page.locator('.gg-board').evaluate(el=>window.scrollTo(0,scrollY+el.getBoundingClientRect().top-60));
   await page.screenshot({path:`evidence/creator-audit-r2/${label}-${channel}-${width}-${reducedMotion}-board.png`});
   await page.waitForTimeout(750);assert.equal(errors.length,0,errors.join('\n'));result.gates.console='PASS';result.pass=true;
  }catch(e){result.pass=false;result.failure=e.message;}
  results.push(result);console.log(JSON.stringify({browser:result.browser,width,reducedMotion,pass:result.pass,failure:result.failure}));
  await context.close();
 }
 await browser.close();
}
await fs.writeFile(`evidence/creator-audit-r2/${label}-viewports.json`,JSON.stringify({checked_at:new Date().toISOString(),origin,groups,results},null,2));
assert(results.every(r=>r.pass),'One or more viewport gates failed.');
