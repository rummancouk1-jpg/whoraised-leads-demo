import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {parseEnv,bypass} from './r2/infra.mjs';
const origin=(await fs.readFile('evidence/r3/preview-url.txt','utf8')).trim(),root='evidence/r3/recordings';await fs.mkdir(root,{recursive:true});
const headers={'x-vercel-protection-bypass':bypass()},env=parseEnv('.env.local'),auth=await fetch(origin+'/api/auth',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.GG_ACCESS_PASSWORD})});
if(!auth.ok)throw Error('Auth '+auth.status);const cookie=auth.headers.get('set-cookie').split(';')[0],at=cookie.indexOf('='),initial=await (await fetch(origin+'/api/leads',{headers:{...headers,Cookie:cookie}})).json();
const browser=await chromium.launch({channel:'chrome'}),results=[];
try{for(const width of [390,820,1440])for(const motion of ['normal','reduce'])for(let attempt=0;attempt<3;attempt++){
 const height=width===390?844:width===820?1180:900,context=await browser.newContext({viewport:{width,height},recordVideo:{dir:root+'/raw',size:{width,height}},reducedMotion:motion==='reduce'?'reduce':'no-preference',colorScheme:'dark',serviceWorkers:'block'});
 await context.route(origin+'/**',route=>route.continue({headers:{...route.request().headers(),...headers}}));
 await context.addCookies([{name:cookie.slice(0,at),value:cookie.slice(at+1),url:origin,httpOnly:true,secure:true}]);const overrides=new Map();
 await context.addInitScript(()=>{window.__r3Frames=[];let last;const frame=now=>{if(last!==undefined)window.__r3Frames.push(now-last);last=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await context.route('**/api/leads**',async route=>{try{const r=route.request(),url=new URL(r.url());if(url.pathname==='/api/leads'&&r.method()==='GET')return route.fulfill({json:{...initial,leads:initial.leads.map(l=>({...l,...overrides.get(l.tracked_slug)}))}});if(r.method()==='PATCH'){const slug=decodeURIComponent(url.pathname.split('/').pop()),lead=initial.leads.find(l=>l.tracked_slug===slug);overrides.set(slug,{...overrides.get(slug),...r.postDataJSON()});return route.fulfill({json:{lead:{...lead,...overrides.get(slug)}}});}return route.continue();}catch{}});
 await context.request.get(origin+'/pipeline',{headers});
 const page=await context.newPage(),video=page.video(),start=Date.now();
 await page.goto(origin+'/pipeline',{waitUntil:'domcontentloaded'});await page.locator('.gg-card-name').first().waitFor();await page.waitForTimeout(650);
 const slug=await page.locator('.gg-card-name').first().evaluate(e=>e.closest('[data-lead]').dataset.lead),original=initial.leads.find(l=>l.tracked_slug===slug).stage,next=original==='Contacted'?'Replied':'Contacted';
 await page.locator('.gg-card-name').first().click();await page.locator('.profile').waitFor();await page.waitForTimeout(750);
 const stageGroup=page.getByRole('group',{name:'Stage'});await stageGroup.getByRole('button',{name:next,exact:false}).click();await expect(stageGroup.getByRole('button',{name:next,exact:false})).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(stageGroup.getByRole('button',{name:original,exact:false})).toHaveAttribute('aria-pressed','true');const undoAt=Date.now()-start;
 if(undoAt>9000){await context.unrouteAll({behavior:'ignoreErrors'});await context.close();if(attempt===2)throw Error('Flow exceeds capture window: '+undoAt);console.log(width,motion,'recorder startup exceeded window; retrying warmed page');continue;}await page.waitForTimeout(Math.max(0,10300-(Date.now()-start)));
 const frameTiming=await page.evaluate(()=>{const frames=window.__r3Frames.slice().sort((a,b)=>a-b);return {frames:frames.length,medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)],averageFps:1000/(frames.reduce((n,d)=>n+d,0)/frames.length)};});
 await context.unrouteAll({behavior:'ignoreErrors'});await page.close();const raw=await video.path();await context.close();
 const output=root+'/'+width+'-'+motion+'.mp4',ff=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',raw,'-vf','tpad=stop_mode=clone:stop_duration=10','-t','10','-r','60','-c:v','libx264','-crf','20','-pix_fmt','yuv420p',output],{encoding:'utf8'});if(ff.status)throw Error('Video encode failed');
 const duration=Number(spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',output],{encoding:'utf8'}).stdout);if(Math.abs(duration-10)>.04)throw Error('Capture duration '+duration);results.push({width,motion,path:output,duration,undoAt,frameTiming,stageRestored:true,records:'Real preview reads; browser-local reversible writes',encoding:'60fps delivery; final settled frame held if recorder drops idle frames'});await fs.writeFile(root+'/index.json',JSON.stringify({preview:origin,recordings:results},null,2));console.log(width,motion,duration+'s');break;
}await fs.writeFile(root+'/index.json',JSON.stringify({preview:origin,recordings:results},null,2));}
finally{await browser.close();await fetch(origin+'/api/auth',{method:'DELETE',headers:{...headers,Origin:origin,Cookie:cookie}});}
