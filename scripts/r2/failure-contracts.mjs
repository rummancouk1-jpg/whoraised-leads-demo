// Deliberate HTTP faults exercise browser behavior; no provider or database mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { bypass } from './infra.mjs';
import { login, logout, cookieParts, protectionHeaders, activityFixture } from '../design/lib.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass();
const origin=process.argv[2],dir='evidence/r2-fix/failure',rows=[];
await fs.mkdir(dir,{recursive:true});
const leads=JSON.parse(await fs.readFile('evidence/r2-independent/leads.json','utf8'));
const cookie=await login(origin),browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders:protectionHeaders(),serviceWorkers:'block'});
await context.addCookies([{...cookieParts(cookie),url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
let fx=activityFixture('busy',leads);fx.queue=[];let failed=false,syncFailed=false;const errors=[];
await context.route('**/api/activity',r=>failed?r.fulfill({status:503,json:{error:'fixture slow DB'}}):r.fulfill({json:fx}));
await context.route('**/api/sync**',r=>r.fulfill({json:{ran:true,ok:!syncFailed,reason:syncFailed?'fixture Instantly down':undefined}}));
await context.route('**/api/errors',r=>r.fulfill({json:{ok:true}}));
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:Date.now()});
try {
 await page.goto(origin,{waitUntil:'domcontentloaded'});await expect(page.locator('.gg-needs-empty')).toContainText("You're clear");
 failed=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('.gg-needs-empty')).toContainText("Can't confirm");await expect(page.locator('.gg-sync-banner')).toBeVisible();rows.push({case:'healthy queue followed by 503',pass:true});await page.screenshot({path:dir+'/503.png'});
 failed=false;fx=activityFixture('busy',leads);fx.queue=[];await page.getByRole('button',{name:'Retry reading activity'}).click();await expect(page.locator('.gg-needs-empty')).toContainText("You're clear");rows.push({case:'activity retry recovers',pass:true});
 await context.unroute('**/api/activity');await context.route('**/api/activity',r=>r.abort());await page.clock.fastForward(45*60000);await expect(page.locator('.gg-needs-empty')).not.toContainText("You're clear");await expect(page.locator('.gg-sync-banner')).toBeVisible();rows.push({case:'45 minutes without a successful read suppresses clear',pass:true});await page.screenshot({path:dir+'/45-minutes.png'});
 await page.clock.resume();await context.unroute('**/api/activity');fx=activityFixture('failing',leads);syncFailed=true;await context.route('**/api/activity',r=>r.fulfill({json:fx}));await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('.gg-sync-banner')).toBeVisible();await page.locator('.gg-sync-banner').getByRole('button',{name:'Sync now'}).click();await expect(page.locator('.gg-sync-banner').getByRole('button',{name:'Sync now'})).toBeEnabled();await expect(page.locator('.gg-needs-empty')).not.toContainText("You're clear");rows.push({case:'HTTP 200 sync outcome ok:false stays failed',pass:true});
 await context.setOffline(true);await expect(page.locator('.gg-sync-banner')).toContainText('offline');rows.push({case:'offline event marks cached activity untrustworthy',pass:true});await context.setOffline(false);
 await context.route('**/api/auth',r=>r.abort());await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('button',{name:'Retry logout'})).toBeVisible();rows.push({case:'offline navigation logout offers retry',pass:true});
 await page.getByRole('button',{name:'Search or run a command'}).first().click();await page.getByRole('combobox').fill('log out');await page.getByRole('option',{name:'Log out'}).click();await expect(page.getByRole('button',{name:'Retry logout'}).last()).toBeVisible();rows.push({case:'offline palette logout offers retry',pass:true});
 assert.equal(errors.length,0,JSON.stringify(errors));rows.push({case:'no unhandled browser exceptions',pass:true});
} finally { await fs.writeFile(dir+'/results.json',JSON.stringify({at:new Date().toISOString(),origin,rows,errors,fixtures:true},null,2));await context.close();await browser.close();await logout(origin,cookie); }
console.log(rows.length+' browser failure contracts passed');
