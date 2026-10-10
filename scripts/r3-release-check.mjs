import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {parseEnv,bypass,api,project} from './r2/infra.mjs';
const origin=process.argv[2],mode=process.argv[3]||'stage';
assert(origin?.startsWith('https://'));
const env=parseEnv('.env.local'),headers=mode==='production'?{}:{'x-vercel-protection-bypass':bypass()};
const auth=await fetch(origin+'/api/auth',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.GG_ACCESS_PASSWORD})});
assert.equal(auth.status,200,'real authentication');
const cookie=auth.headers.get('set-cookie').split(';')[0];
const read=async path=>{const r=await fetch(origin+path,{headers:{...headers,Cookie:cookie}});assert.equal(r.status,200,path);return r.json();};
const before=await read('/api/leads');assert.equal(before.leads.length,52);
const sync=await fetch(origin+'/api/sync?manual=1',{method:'POST',headers:{...headers,Cookie:cookie,Origin:origin}});assert.equal(sync.status,200);const outcome=await sync.json();assert.equal(outcome.ok,true);
const activity=await read('/api/activity');assert.equal(activity.sync.state,'waiting');assert.equal(activity.sync.lastError,null);
const probes=[];
for(const lead of before.leads){
 const slug=lead.tracked_slug,clean=slug.replace(/^preclient-/,'');
 for(const pathSlug of new Set([slug,clean])){
  const r=await fetch(origin+'/go/'+pathSlug,{method:'HEAD',headers,redirect:'manual'});assert.equal(r.status,302,'HEAD '+pathSlug);assert.equal(new URL(r.headers.get('location')).searchParams.get('utm_content'),slug);probes.push({slug:pathSlug,status:r.status});
 }
}
const lead=before.leads.find(l=>l.tracked_slug.startsWith('preclient-'))??before.leads[0];
for(const slug of new Set([lead.tracked_slug,lead.tracked_slug.replace(/^preclient-/, '')])){
 const r=await fetch(origin+'/go/'+slug+'?test=1',{headers:{...headers,'x-gg-test-click':'1'},redirect:'manual'});assert.equal(r.status,302,'GET '+slug);const location=new URL(r.headers.get('location'));assert.equal(location.searchParams.get('utm_content'),lead.tracked_slug);assert(location.searchParams.get('gg_click'));
}
const after=await read('/api/leads');assert.deepEqual(after.clicks,before.clicks,'real click counts retained');
await fetch(origin+'/api/auth',{method:'DELETE',headers:{...headers,Cookie:cookie,Origin:origin}});
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
if(mode!=='production')await context.route('**/*',route=>{const r=route.request();return route.continue({headers:new URL(r.url()).origin===origin?{...r.headers(),...headers}:r.headers()});});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/login');await page.getByLabel('Workspace password',{exact:true}).fill(env.GG_ACCESS_PASSWORD);await page.getByRole('button',{name:/enter|log in|sign in|unlock/i}).click();await page.waitForURL(origin+'/');await expect(page.locator('.leadrow')).toHaveCount(5);await expect(page.locator('.gg-sync-pill')).toContainText('Waiting for first campaign');await expect(page.locator('.gg-sync-banner')).toHaveCount(0);await expect(page.locator('.checklist li').filter({hasText:'Partner list vetted'})).toContainText('52 / 52 verified');
 await page.goto(origin+'/pipeline');await page.locator('.gg-card-name').first().click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.r3-tracked a')).toHaveAttribute('href',/^https:\/\/gg-tourney-hub\.vercel\.app\/go\/(?!preclient-)/);await page.keyboard.press('Escape');await page.goto(origin+'/email');await page.locator('.inbox h3').first().waitFor();await expect(page.locator('.gg-sync-banner')).toHaveCount(0);assert.deepEqual(errors,[]);
 fs.mkdirSync('evidence/r3-release',{recursive:true});await page.screenshot({path:'evidence/r3-release/'+mode+'-login.png'});
 const deployment=api('/v13/deployments/'+new URL(origin).hostname);
 const report={at:new Date().toISOString(),origin,mode,commit:deployment.meta?.githubCommitSha,target:deployment.target,readyState:deployment.readyState,deploymentId:deployment.id,partners:52,sync:activity.sync.state,redirects:probes.length,clickHistoryUnchanged:true,browserLogin:true,runtimeErrors:errors};fs.writeFileSync('evidence/r3-release/'+mode+'-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await context.close();await browser.close();}
