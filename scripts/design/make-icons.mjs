// Renders the PWA icons and iOS launch images from the GG monogram. Output is committed under public/.
import fs from 'node:fs/promises';import {chromium} from '@playwright/test';
const NAVY='#0c1426',GOLD='#f4d38c';
const tile=(size,{radius=0,glyph=.42}={})=>`<div style="width:${size}px;height:${size}px;background:${NAVY};border-radius:${radius}px;display:grid;place-items:center;color:${GOLD};font:700 ${Math.round(size*glyph)}px/1 Arial,Helvetica,sans-serif;letter-spacing:-.02em">GG</div>`;
const page=(w,h,inner,bg='transparent')=>`<!doctype html><body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:grid;place-items:center;overflow:hidden">${inner}</body>`;
const SPLASH=[[375,667,2],[390,844,3],[393,852,3],[414,896,2],[414,896,3],[430,932,3],[820,1180,2],[834,1194,2],[1024,1366,2]];
await fs.mkdir('public/icons',{recursive:true});await fs.mkdir('public/splash',{recursive:true});
const b=await chromium.launch({channel:'chrome'});
async function render(w,h,html,file,transparent=false){const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const p=await c.newPage();await p.setContent(html);await p.screenshot({path:file,omitBackground:transparent});await c.close();}
await render(192,192,page(192,192,tile(192,{radius:42})),'public/icons/icon-192.png',true);
await render(512,512,page(512,512,tile(512,{radius:112})),'public/icons/icon-512.png',true);
await render(512,512,page(512,512,tile(512,{glyph:.3})),'public/icons/maskable-512.png');
await render(180,180,page(180,180,tile(180)),'public/apple-touch-icon.png');
for(const [w,h,r] of SPLASH)for(const scheme of ['light','dark']){
  const bg=scheme==='light'?'#f6f7f9':'#0a0d12',fg=scheme==='light'?'#0f172a':'#f1f5f9',size=Math.round(Math.min(w,h)*.26);
  const html=page(w,h,`<div style="display:grid;gap:${Math.round(size*.16)}px;justify-items:center">${tile(size,{radius:Math.round(size*.22)})}<div style="color:${fg};font:600 ${Math.round(size*.16)}px/1 Arial,Helvetica,sans-serif;letter-spacing:-.01em">GG Outreach</div></div>`,bg);
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:r});const p=await c.newPage();await p.setContent(html);await p.screenshot({path:`public/splash/${scheme}-${w}x${h}@${r}x.png`});await c.close();
}
await b.close();console.log('icons ok');
