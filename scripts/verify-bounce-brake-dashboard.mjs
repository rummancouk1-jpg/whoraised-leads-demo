// Read-only dashboard matrix. Browser fixtures never call campaign or sync mutations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = new URL(process.argv[2] ?? 'http://localhost:3101').origin;
const out = process.argv[3] ?? 'evidence/gg-bounce-brake-sample-aware/local';
fs.mkdirSync(out, { recursive: true });
function envValue(file, name) {
  const value = fs.readFileSync(file, 'utf8').match(new RegExp('^' + name + '=(.*)$', 'm'))?.[1]?.trim();
  assert(value, name + ' unavailable');
  return value.startsWith('"') ? JSON.parse(value) : value;
}
const local = origin.includes('localhost');
let ownedSession = false;
let cookie;
if (local) {
  const response = await fetch(origin + '/api/auth', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({password:envValue('.env.local', 'GG_ACCESS_PASSWORD')}) });
  assert.equal(response.status, 200, 'Local login');
  cookie = response.headers.get('set-cookie').split(';')[0];
  ownedSession = true;
} else cookie = fs.readFileSync('.env.gg-campaign-work/dashboard-cookie', 'utf8').trim();
const read = async endpoint => {
  const response = await fetch(origin + endpoint, { headers: {Cookie:cookie}, signal:AbortSignal.timeout(60000) });
  assert.equal(response.status,200,endpoint);
  return response.json();
};
const browser = await chromium.launch();
const result = {checkedAt:new Date().toISOString(),origin,fixture:'Browser-only historic and hard-only pause events; no campaign or sync mutations.',cases:[]};
try {
  const email = local ? {live:null,history:[],error:''} : await read('/api/email');
  const base = email.live ?? email.history.find(row=>row.metrics.campaign)?.metrics ?? {
    fetchedAt:new Date().toISOString(),day:'2026-10-13',campaignMessage:'',batches:[],
    inboxes:Array.from({length:8},(_,i)=>({email:`fixture-${i}@example.invalid`,warmup:'Active',health:100,sentToday:0,dailyLimit:30})),
    campaign:{id:'e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef',name:'GG Tournament Oct',status:2,sent:59,sentToday:0,contacted:59,opened:0,replied:0,clicked:0,bounced:2,unsubscribed:0,leadsCount:986,ready:true},
  };
  for (const width of [390,820,1440]) for (const scheme of ['light','dark']) for (const motion of ['normal','reduce']) {
    const context = await browser.newContext({viewport:{width,height:960},colorScheme:scheme,reducedMotion:motion==='reduce'?'reduce':'no-preference',serviceWorkers:'block'});
    const i = cookie.indexOf('=');
    await context.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),url:origin,httpOnly:true,secure:!local,sameSite:'Strict'}]);
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on('pageerror', error=>errors.push(error.message));
    let scenario = 'historical';
    let activityUnavailable = false;
    const at = new Date().toISOString();
    await context.route('**/api/**', async route => {
      const request = route.request(), endpoint = new URL(request.url()).pathname;
      if (request.method() !== 'GET') {
        writes.push(endpoint);
        return route.fulfill({json:{ok:true,ran:false,reason:'Browser fixture blocked mutation.'}});
      }
      if (endpoint === '/api/email/bounce-brake') {
        const hard = scenario === 'hard';
        return route.fulfill({json:{alert:{at,sent:hard?100:59,bounced:hard?4:2,rate:hard?0.04:2/59,status:'paused',...(hard?{bounceBasis:'hard',softBounced:2,unknownBounced:0}:{})},lastCheck:{at,ok:true,campaignStatus:2},lastSuccess:{at,ok:true,campaignStatus:2}}});
      }
      if (endpoint === '/api/email') return route.fulfill({json:{...email,error:'',live:{...base,fetchedAt:at,campaign:{...base.campaign,status:2,sent:59,bounced:2}}}});
      if (endpoint === '/api/activity') {
        if (activityUnavailable) return route.fulfill({status:503,json:{error:'Browser activity fixture unavailable'}});
        return route.fulfill({json:{generatedAt:at,sync:{state:'ok',lastOkAt:at,lastAttemptAt:at,lastError:null,failedSince:null,consecutiveFailures:0,counts:{matched:0}},queue:[],stats:{},attribution:{live:false,since:null,rows:[],clicks:0,signups:0,lastSignupAt:null},errors24h:0}});
      }
      return route.continue();
    });
    for (scenario of ['historical','hard']) {
      await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
      const copy = scenario==='hard'?'Campaign paused by bounce brake — 4 of 100 hard bounced':'Campaign paused by bounce brake — 2 of 59 bounced';
      await expect(page.locator('h1')).toHaveText(copy,{timeout:60000});
      const needs = page.getByRole('region',{name:/Needs action today/});
      await expect(needs).toContainText(copy);
      await expect(needs).not.toContainText(/Nothing yet|You're clear/);
      const review = needs.getByRole('link',{name:/Review bounces/});
      await expect(review).toHaveAttribute('href','/email#bounce-brake');
      await review.focus();
      await expect(review).toBeFocused();
      const wrapped = await review.locator('strong').evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,clipped:el.scrollWidth>el.clientWidth+1}));
      assert.equal(wrapped.whiteSpace,'normal', 'Brake event must wrap');
      assert(!wrapped.clipped,'Brake event clipping');
      const geometry = await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,scheme:getComputedStyle(document.documentElement).colorScheme}));
      assert(!geometry.overflow, 'Page overflow');
      assert(geometry.scheme.includes(scheme),'Correct appearance');
      if(motion==='reduce') assert(geometry.reduced);
      const axe = await new AxeBuilder({page}).analyze();
      assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[], 'Dashboard axe');
      const screenshot = `${scenario}-${width}-${scheme}-${motion}.png`;
      await review.evaluate(el=>el.blur());
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>window.scrollY===0);
      await page.screenshot({path:path.join(out,screenshot),fullPage:true,animations:'disabled'});
      await review.click();
      await expect(page).toHaveURL(origin+'/email#bounce-brake');
      const alert = page.getByRole('alert',{name:'Campaign bounce brake'});
      await expect(alert).toBeVisible({timeout:60000});
      await expect(alert).toContainText('at least 100 sends');
      await expect(alert).toContainText('6 hard bounces');
      if(scenario==='historical')await expect(alert).toContainText('historical pause');
      if(motion==='reduce') {
        const animation = await alert.evaluate(el=>({name:getComputedStyle(el).animationName,transition:getComputedStyle(el).transitionDuration}));
        assert.equal(animation.name,'none');
        assert(animation.transition.split(',').every(value=>parseFloat(value)===0));
      }
      const emailAxe = await new AxeBuilder({page}).analyze();
      assert.deepEqual(emailAxe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[], 'Review page axe');
      assert.deepEqual(errors,[], 'Browser errors');
      assert.deepEqual(writes,[], 'Unexpected mutation attempt');
      result.cases.push({width,scheme,motion,scenario,status:'PASS',dashboardAxe:0,reviewAxe:0,geometry,screenshot});
      fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
      console.log(`${scenario} ${width} ${scheme} ${motion}: PASS, axe 0`);
    }
    if(width===390&&scheme==='light'&&motion==='reduce') {
      activityUnavailable=true;scenario='historical';
      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await expect(page.locator('h1')).toHaveText('Campaign paused by bounce brake — 2 of 59 bounced');
      await expect(page.getByRole('region',{name:/Needs action today/}).getByRole('link',{name:/Review bounces/})).toBeVisible();
      result.activityFailure='PASS: brake action survives activity read failure';
    }
    await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
} finally {
  await browser.close();
  if(ownedSession)await fetch(origin+'/api/auth',{method:'DELETE',headers:{Origin:origin,Cookie:cookie}});
}
