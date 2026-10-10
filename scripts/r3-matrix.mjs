// R3 browser gate: live reads, browser-local stage writes; no inserted lead fixtures.
import fs from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {parseEnv,bypass} from './r2/infra.mjs';
const engine=process.argv[2]||'chrome', width=Number(process.argv[3]||390), origin=process.argv[4]||'http://localhost:3103';
const root=(process.env.R3_MATRIX_ROOT||'evidence/r3/matrix')+'/'+engine+'-'+width;await fs.mkdir(root,{recursive:true});
const env=parseEnv('.env.local'),headers=origin.startsWith('https:')?{'x-vercel-protection-bypass':bypass()}:{};
const auth=await fetch(origin+'/api/auth',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.GG_ACCESS_PASSWORD})});
if(!auth.ok)throw new Error('Auth '+auth.status);
const cookie=auth.headers.get('set-cookie').split(';')[0],split=cookie.indexOf('='),name=cookie.slice(0,split),value=cookie.slice(split+1);
const read=await fetch(origin+'/api/leads',{headers:{...headers,Cookie:cookie}}),initial=await read.json();
if(!read.ok||!initial.leads.length)throw new Error('Real lead preflight failed');
const browser=await (engine==='webkit'?webkit.launch():chromium.launch({channel:engine==='edge'?'msedge':'chrome'}));
const rows=[],stages=['New','Contacted','Replied','Joined','Declined'];
try {
for(const theme of ['light','dark'])for(const motion of ['normal','reduce']){
 const row={preview:origin,engine,width,theme,motion,states:[],checks:[],failures:[],mutationTransport:'browser-local; real records and read endpoints'};
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1180:900},colorScheme:theme,reducedMotion:motion==='reduce'?'reduce':'no-preference',serviceWorkers:'block',timezoneId:'Asia/Karachi',hasTouch:width<=820});
 await context.addCookies([{name,value,url:origin,httpOnly:true,secure:origin.startsWith('https:')}]);
 const overrides=new Map();
 await context.route('**/*',async route=>{
   try {
   const request=route.request(),url=new URL(request.url());if(url.origin!==origin)return route.continue();
   const h={...request.headers(),...headers};
   if(url.pathname==='/api/leads'&&request.method()==='GET'){
     const response=await route.fetch({headers:h});const body=await response.json();body.leads=body.leads.map(l=>({...l,...overrides.get(l.tracked_slug)}));return route.fulfill({response,json:body});
   }
   if(/^\/api\/leads\/[^/]+$/.test(url.pathname)&&request.method()==='PATCH'){
     const slug=decodeURIComponent(url.pathname.split('/').pop()),patch=request.postDataJSON();
     const lead=initial.leads.find(l=>l.tracked_slug===slug);overrides.set(slug,{...overrides.get(slug),...patch});
     return route.fulfill({status:200,json:{lead:{...lead,...overrides.get(slug),version:lead.version}}});
   }
   return route.continue({headers:h});
   } catch { /* A closed page cancels its outstanding reads. */ }
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>row.failures.push('Runtime: '+e.message));
 const check=async(label,work)=>{try{await work();row.checks.push(label);}catch(e){row.failures.push(label+': '+String(e.message).slice(0,1400));}};
 const ready=async route=>{await page.goto(origin+route);await page.locator('main').waitFor();await page.locator('.gg-sync-pill').first().waitFor({state:'attached'});await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);};
 const shot=async state=>{
   await page.waitForTimeout(500);const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations;
   const geometry=await page.evaluate(({reduce})=>{
     const faults=[],targets=[],dialog=document.querySelector('[role=dialog][aria-modal=true]');
     if(document.documentElement.scrollWidth>innerWidth+1)faults.push('Document overflow: '+document.documentElement.scrollWidth+'/'+innerWidth);
     for(const e of document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[tabindex="0"]')){
       if(dialog&&!dialog.contains(e)&&!e.closest('[data-modal-safe]'))continue;
       if(e.closest('[inert]')||e.classList.contains('gg-skip'))continue;
       const box=e.matches('input[type=checkbox]')?e.closest('label'):e,r=box.getBoundingClientRect();
       if(!r.width||!r.height||getComputedStyle(box).visibility==='hidden'||e.closest('details:not([open])')&&!e.matches('summary'))continue;
       if(r.width<43.5||r.height<43.5)targets.push((e.getAttribute('aria-label')||e.textContent||e.className).trim().slice(0,40)+' '+Math.round(r.width)+'x'+Math.round(r.height));
     }
     if(reduce&&document.getAnimations().some(a=>a.playState==='running'))faults.push('Motion is running');
     return {faults,targets};
   },{reduce:motion==='reduce'});
   const screenshot=root+'/'+theme+'-'+motion+'-'+state+'.png';await page.screenshot({path:screenshot,animations:'disabled',scale:'css',fullPage:state==='home'});
   row.states.push({state,screenshot,axe:violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),...geometry});
   if(violations.length||geometry.faults.length||geometry.targets.length)row.failures.push(state+': '+violations.length+' axe; '+geometry.faults.join('; ')+'; '+geometry.targets.join('; '));
 };
 try{
   await ready('/');await expect(page.locator('.leadrow')).toHaveCount(5);await shot('home');
   await check('No campaign is healthy WAITING with no warning banner',async()=>{await expect(page.locator('.gg-sync-banner')).toHaveCount(0);await expect(page.locator('.gg-sync-pill')).toContainText('Waiting for first campaign');expect(await page.locator('main').innerText()).not.toMatch(/sync is failing|sync failing|no good sync/i);});
   await check('Vetted checklist uses the KPI qualified partner count',async()=>{await expect(page.locator('.checklist li').filter({hasText:'Partner list vetted'})).toContainText(`${initial.leads.length} / ${initial.leads.length} verified`);expect(initial.leads.length).toBe(52);});
   await check('Analytics card expands content and collapses',async()=>{await page.locator('.r3-analytics>summary').click();await expect(page.locator('.r3-analytics')).toHaveAttribute('open','');await expect(page.locator('.r3-analytics .card-b').first()).toBeVisible();await shot('analytics-open');await page.locator('.r3-analytics>summary').click();await expect(page.locator('.r3-analytics')).not.toHaveAttribute('open','');});
   await check('Home has no full lead table',()=>expect(page.locator('main > .gg-container > .gg-table-scroll')).toHaveCount(0));
   await check('Four KPI tiles, launch checklist, five stage tiles',async()=>{await expect(page.locator('.gg-status-strip>.kpi')).toHaveCount(4);await expect(page.locator('.checklist li')).toHaveCount(4);await expect(page.locator('.gg-stagelist li')).toHaveCount(5);});
   await ready('/pipeline');await page.locator('.gg-card-name').first().waitFor();await shot('pipeline');
   const opener=page.locator('.gg-card-name').first(),leadName=await opener.locator('[data-partner-name]').innerText(),slug=await opener.evaluate(e=>e.closest('[data-lead]').dataset.lead),original=initial.leads.find(l=>l.tracked_slug===slug).stage;
   await check('Open full-screen partner drawer',async()=>{await opener.click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('.gg-tl-body').first().waitFor();const box=await page.getByRole('dialog').boundingBox();expect(box.x).toBe(width>820?12:0);expect(Math.round(box.width)).toBe(width>820?width-24:width);});
   await shot('drawer');
   await check('Draft and tracked links use canonical host and clean slug',async()=>{const expected='https://gg-tourney-hub.vercel.app/go/'+slug.replace(/^preclient-/,'');await expect(page.locator('.r3-draft .gg-draft a')).toHaveAttribute('href',expected);await expect(page.locator('.r3-tracked a')).toHaveAttribute('href',expected);await expect(page.locator('.r3-draft')).not.toContainText('preclient-');});
   await check('Focus trap and J/K navigation',async()=>{
     await page.getByRole('button',{name:'Close dialog'}).focus();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]'))).toBe(true);
     await page.getByRole('button',{name:'Close dialog'}).focus();await page.keyboard.press('j');await page.waitForTimeout(500);expect(await page.locator('.profile h2').innerText()).not.toBe(leadName);await page.keyboard.press('k');await expect(page.locator('.profile h2')).toHaveText(leadName);
   });
   await check('Stage keys, 5s Undo and card relocation',async()=>{
     await page.getByRole('button',{name:'Close dialog'}).focus();const next=original==='Contacted'?'Replied':'Contacted';await page.keyboard.press(String(stages.indexOf(next)+1));
     await expect(page.getByRole('group',{name:'Stage'}).getByRole('button',{name:next,exact:false})).toHaveAttribute('aria-pressed','true');
     await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeVisible();await page.getByRole('button',{name:'Undo',exact:true}).click();
     await expect(page.getByRole('group',{name:'Stage'}).getByRole('button',{name:original,exact:false})).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(650);
   });
   await check('Draft, tracked link and source controls',async()=>{await page.getByRole('button',{name:'Copy draft',exact:true}).click();await expect(page.getByText('Copied draft',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Copy link',exact:true}).click();await expect(page.getByText('Copied tracked link',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Open profile'})).toHaveCount(1);await expect(page.getByRole('link',{name:'Source evidence'})).toHaveCount(1);});
   await check('Escape returns focus',async()=>{await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('[data-lead]').filter({has:page.locator('[data-partner-name]',{hasText:leadName})}).locator('.gg-card-name')).toBeFocused();});
   await page.getByRole('button',{name:'Table',exact:true}).click();await page.locator('.gg-name-button').first().waitFor();await shot('table');
   await check('Column sort, sticky header and mobile first column',async()=>{
     await page.locator('th.c-name button').click();await expect(page.locator('th.c-name')).toHaveAttribute('aria-sort','ascending');await page.locator('th.c-name button').click();await expect(page.locator('th.c-name')).toHaveAttribute('aria-sort','descending');
     expect(await page.locator('th.c-name').evaluate(e=>getComputedStyle(e).position)).toBe('sticky');if(width<=820)expect(await page.locator('td.c-name').first().evaluate(e=>getComputedStyle(e).position)).toBe('sticky');
   });
   await check('CSV export uses current filtered view',async()=>{
     await page.locator('#lead-search').fill(slug);await expect(page.locator('.gg-name-button')).toHaveCount(1);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export current view'}).click();const download=await downloadPromise;const text=await fs.readFile(await download.path(),'utf8');expect(text).toContain(slug);expect(text.split('\n').filter(Boolean).length).toBe(2);await page.locator('#lead-search').fill('');
   });
   await check('Saved view survives reload',async()=>{
     await page.locator('#lead-search').fill(slug);await page.getByRole('button',{name:'Save view',exact:true}).click();await page.getByLabel('View name').fill('Partner focus');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:/^Partner focus/})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:/^Partner focus/})).toBeVisible();
   });
   await check('Command palette and shortcut overlay',async()=>{
     await page.keyboard.press('Control+k');await expect(page.getByRole('dialog',{name:'Command palette'})).toBeVisible();await page.getByRole('dialog',{name:'Command palette'}).getByRole('combobox').fill('Switch to table');await expect(page.getByRole('dialog',{name:'Command palette'}).getByRole('option').first()).toContainText('Switch to table');await page.keyboard.press('Escape');await page.locator('main').focus();await page.keyboard.press('?');await expect(page.getByRole('dialog',{name:'Keyboard shortcuts'})).toBeVisible();await page.keyboard.press('Escape');
   });
   await ready('/email');await page.locator('.inbox h3').first().waitFor();await shot('email');
   await check('Email health rings and fourteen-day heatmap',async()=>{expect(await page.locator('.inboxes .r3-ring').count()).toBeGreaterThan(0);expect(await page.locator('.heat .c').count()).toBe((await page.locator('.inboxes .r3-ring').count())*14);});
   await check('No example or test rows in client presentation',async()=>{const text=await page.locator('main').innerText();expect(text).not.toMatch(/EXAMPLE|QA fixture|lorem ipsum|undefined|NaN/);});
 }catch(e){row.failures.push('Flow: '+String(e.message).slice(0,1400));await page.screenshot({path:root+'/'+theme+'-'+motion+'-failure.png'}).catch(()=>{});}
 await context.unrouteAll({behavior:'ignoreErrors'});await context.close();row.pass=row.failures.length===0;rows.push(row);await fs.writeFile(root+'/results.json',JSON.stringify(rows,null,2));console.log(engine,width,theme,motion,row.pass?'PASS':'FAIL',row.failures.join('\n'));
}
}finally{await browser.close();await fetch(origin+'/api/auth',{method:'DELETE',headers:{...headers,Origin:origin,Cookie:cookie}});}
if(rows.some(r=>!r.pass))process.exitCode=1;





