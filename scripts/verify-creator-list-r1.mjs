import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const origin='https://whoraised-leads-demo.vercel.app';
const audit=JSON.parse(await fs.readFile('data/creator-list-r1-audit.json','utf8'));
const csv=await fs.readFile('data/creator-list-r1.csv','utf8');
const root='evidence/creator-list-r1';await fs.mkdir(root,{recursive:true});
// Uniform sample without replacement, recorded once and reused in both browsers.
const pool=[...audit.evidence],sample=[];for(let i=0;i<5;i++)sample.push(pool.splice(crypto.randomInt(pool.length),1)[0]);
const result={origin,checkedAt:new Date().toISOString(),csvSha256:crypto.createHash('sha256').update(csv).digest('hex'),expected:audit.count,sample:sample.map(r=>({slug:r.slug,source:r.profile})),browsers:[]};
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel});const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const checks=[];
 try{
  await page.goto(origin+'/login');await page.getByLabel('Workspace password').fill(process.env.GG_ACCESS_PASSWORD);await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Lead list',exact:true})).toBeVisible({timeout:45000});
  const response=await context.request.get(origin+'/api/leads');assert.equal(response.status(),200);const shared=await response.json();
  const imported=shared.leads.filter(l=>audit.evidence.some(e=>e.slug===l.tracked_slug));assert.equal(imported.length,audit.count);result.sharedCount=shared.leads.length;result.realCount=shared.leads.filter(l=>!/^EXAMPLE\b/i.test(l.name)).length;
  result.apiCount=imported.length;result.weights=shared.weights;
  // Each imported lead's actual deployed drawer must generate its own /go/ URL.
  for(const l of imported){await page.getByLabel('Search leads',{exact:true}).fill(l.tracked_slug);await page.getByRole('button',{name:`${l.name} ${l.handle}`,exact:true}).click();await expect(page.locator('.gg-draft')).toContainText(origin+'/go/'+l.tracked_slug);await expect(page.getByLabel('Notes',{exact:true})).toHaveValue(l.notes);await page.getByRole('button',{name:'Close dialog',exact:true}).click();}
  for(const width of [390,820,1440])for(const motion of ['no-preference','reduce']){
   await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:motion});await page.getByLabel('Search leads',{exact:true}).fill('');await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(motion==='reduce')assert.equal(await page.evaluate(()=>[...document.querySelectorAll('body *')].some(el=>{const s=getComputedStyle(el);return s.animationName!=='none'||s.transitionDuration.split(',').some(v=>parseFloat(v)>0)})),false);
   for(const e of sample){const l=imported.find(l=>l.tracked_slug===e.slug);await page.getByLabel('Search leads',{exact:true}).fill(e.slug);await page.getByRole('button',{name:`${l.name} ${l.handle}`,exact:true}).click();await expect(page.getByRole('heading',{name:l.name,exact:true})).toBeVisible();await expect(page.locator('.gg-draft')).toContainText(origin+'/go/'+e.slug);await expect.poll(async()=>{const b=await page.getByRole('dialog').boundingBox();return b.x>=-1&&b.x+b.width<=width+1&&b.y>=-1&&b.y+b.height<=961}).toBe(true);
    const screenshot=`${channel}-${width}-${motion==='reduce'?'reduce':'normal'}-${e.slug}.png`;await page.screenshot({path:root+'/'+screenshot,animations:'disabled'});await page.getByRole('button',{name:'Close dialog',exact:true}).click();checks.push({width,motion,slug:e.slug,status:'PASS',screenshot});
   }
  }
  assert.deepEqual(errors,[]);result.browsers.push({channel,version:browser.version(),draftLinksVerified:imported.length,checks,errors});console.log(`${channel}: ${imported.length} deployed pitch links; ${checks.length} responsive drawer checks passed`);
 }finally{await browser.close();await fs.writeFile(root+'/verification.json',JSON.stringify(result,null,2));}
}
assert.equal(result.browsers.length,2);console.log(JSON.stringify({count:result.apiCount,sharedCount:result.sharedCount,realCount:result.realCount,sample:result.sample},null,2));
