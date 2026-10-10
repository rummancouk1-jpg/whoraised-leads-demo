import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import {parseEnv,bypass} from './r2/infra.mjs';
const origin=(await fs.readFile('evidence/r3/preview-url.txt','utf8')).trim(),root='evidence/r3/comparisons';
await fs.mkdir(root,{recursive:true});const headers={'x-vercel-protection-bypass':bypass()},env=parseEnv('.env.local');
const auth=await fetch(origin+'/api/auth',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.GG_ACCESS_PASSWORD})});
if(!auth.ok)throw Error('Auth '+auth.status);const cookie=auth.headers.get('set-cookie').split(';')[0],at=cookie.indexOf('=');
const browser=await chromium.launch({channel:'chrome'}),index=[];
try{for(const width of [390,820,1440])for(const theme of ['light','dark']){
 const height=width===390?844:width===820?1180:900,context=await browser.newContext({viewport:{width,height},colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route(origin+'/**',route=>route.continue({headers:{...route.request().headers(),...headers}}));
 await context.addCookies([{name:cookie.slice(0,at),value:cookie.slice(at+1),url:origin,httpOnly:true,secure:true}]);
 const app=await context.newPage(),ref=await context.newPage();
 await ref.goto(pathToFileURL(path.resolve('docs/design/r3-reference.html')).href);await ref.evaluate(t=>document.documentElement.dataset.theme=t,theme);await ref.evaluate(()=>document.fonts.ready);
 for(const state of ['home','pipeline','email','drawer']){
  const route=state==='home'?'/':state==='email'?'/email':'/pipeline';await app.goto(origin+route);
  await app.locator(state==='home'?'.leadrow':state==='email'?'.inbox h3':'.gg-card-name').first().waitFor();await app.waitForTimeout(900);await app.evaluate(()=>document.fonts.ready);
  await ref.evaluate(s=>document.querySelector('[data-view="'+(s==='drawer'?'pipeline':s)+'"]').click(),state);
  if(state==='drawer'){await app.locator('.gg-card-name').first().click();await app.locator('.gg-tl-body').first().waitFor();await ref.locator('.lc').first().click();}
  const base=width+'-'+theme+'-'+state,actual=root+'/'+base+'-app.png',reference=root+'/'+base+'-reference.png';
  await app.screenshot({path:actual,animations:'disabled',fullPage:state==='home'});await ref.screenshot({path:reference,animations:'disabled',fullPage:state==='home'});
  const pair=await browser.newPage({viewport:{width:width*2+24,height:height+44}});
  const data=async file=>'data:image/png;base64,'+(await fs.readFile(file)).toString('base64');
  await pair.setContent('<style>body{margin:0;background:#111;color:white;font:14px system-ui}main{display:flex;gap:24px}section{width:'+width+'px}h3{height:44px;margin:0;display:grid;place-items:center}img{display:block;width:100%}</style><main><section><h3>R3 design contract · '+width+'px · '+theme+'</h3><img src="'+await data(reference)+'"></section><section><h3>Isolated preview · live records</h3><img src="'+await data(actual)+'"></section></main>');
  await pair.screenshot({path:root+'/'+base+'-side-by-side.png',fullPage:true});await pair.close();index.push({width,theme,state,actual,reference,comparison:root+'/'+base+'-side-by-side.png'});console.log(base);
  if(state==='drawer')await ref.locator('#dw-close').click();
 }
 await context.close();
}await fs.writeFile(root+'/index.json',JSON.stringify({preview:origin,captures:index},null,2));}
finally{await browser.close();await fetch(origin+'/api/auth',{method:'DELETE',headers:{...headers,Origin:origin,Cookie:cookie}});}


