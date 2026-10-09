import fs from 'node:fs/promises';
import {webkit,expect} from '@playwright/test';
import {login,logout,cookieParts} from '../design/lib.mjs';
const origin='http://localhost:3103',cookie=await login(origin),browser=await webkit.launch();
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await context.addCookies([{...cookieParts(cookie),url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
const page=await context.newPage();await page.goto(origin+'/email');await expect(page.locator('.gg-digest')).toBeVisible({timeout:20000});
const rows=[];
await page.locator('#digest-title').evaluate(el=>{el.tabIndex=-1;el.focus();});
for(let i=0;i<8;i++){
 await page.keyboard.press('Tab');await page.waitForTimeout(250);
 rows.push(await page.evaluate(()=>({tag:document.activeElement.tagName,tabIndex:document.activeElement.tabIndex,html:document.activeElement.outerHTML.slice(0,500),y:scrollY})));
}
const link=page.getByRole('link',{name:'Open the exact email in a new tab'});await link.focus();
rows.push({directFocus:await link.evaluate(el=>el===document.activeElement)});
await page.locator('#digest-title').evaluate(el=>el.focus());
for(let i=0;i<3;i++){
 await page.keyboard.press('Alt+Tab');await page.waitForTimeout(250);
 rows.push(await page.evaluate(()=>({key:'Alt+Tab',tag:document.activeElement.tagName,html:document.activeElement.outerHTML.slice(0,350)})));
}
await page.screenshot({path:'evidence/r2-independent/screenshots/webkit-tab-diagnostic.png'});
await fs.writeFile('evidence/r2-independent/webkit-tab-diagnostic.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
await context.close();await browser.close();await logout(origin,cookie);
