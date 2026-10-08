// Builds one before/after contact sheet per view: columns = 390 / 820 / 1440, rows = before · after dark · after light.
import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from '@playwright/test';
const root='evidence/design-elevation',out=`${root}/contact-sheets`;await fs.mkdir(out,{recursive:true});
const widths=[390,820,1440];const views=['login','home','home-loading','drawer','import','export','pipeline','pipeline-loading','email','email-loading','404','palette','palette-results','filters-views','shortcuts','toast','home-full','pipeline-full','email-full'];
const exists=async f=>fs.access(f).then(()=>true,()=>false);
const rows=[['before','Before'],['after-dark','After · dark'],['after-light','After · light']];
const H=560,FULL={390:210,820:320,1440:560};
const b=await chromium.launch({channel:'chrome'});const written=[];
for(const view of views){
  const full=view.endsWith('-full');let any=false,html='';
  for(const [dir,title] of rows){let cells='';for(const w of widths){const f=`${root}/${dir}/${view}-${w}.png`;const ok=await exists(f);if(ok)any=true;
    const size=full?`width:${FULL[w]}px`:`height:${H}px`;
    cells+=ok?`<td><img src="data:image/png;base64,${(await fs.readFile(f)).toString('base64')}" style="${size};display:block;border-radius:6px;border:1px solid #cbd5e1"></td>`:`<td><div style="${full?'width:'+FULL[w]+'px;height:200px':'height:'+H+'px;width:'+Math.round(H*w/(w===1440?900:w===820?1180:844))+'px'};border:1px dashed #94a3b8;border-radius:6px;display:grid;place-items:center;color:#64748b;font:13px system-ui">${dir==='before'?'new in this round':'—'}</div></td>`;}
    html+=`<tr><th>${title}</th>${cells}</tr>`;}
  if(!any)continue;
  const page=`<!doctype html><body style="margin:0;padding:24px;background:#f1f5f9;font:14px system-ui;color:#0f172a"><h1 style="font:600 20px system-ui;margin:0 0 4px">${view}</h1><p style="margin:0 0 16px;color:#475569">Columns: phone 390 · tablet 820 · desktop 1440 (Chrome, reduced motion). “Before” is the pre-design build (tag pre-design-elevation).</p><table style="border-collapse:separate;border-spacing:12px"><tr><th></th>${widths.map(w=>`<th style="text-align:left;color:#475569">${w}</th>`).join('')}</tr>${html}</table></body>`;
  const c=await b.newContext({viewport:{width:1700,height:800}});const p=await c.newPage();await p.setContent(page);await p.waitForLoadState('load');await p.waitForTimeout(300);
  await p.screenshot({path:`${out}/${view}.png`,fullPage:true});await c.close();written.push(view);}
await b.close();
await fs.writeFile(`${out}/index.md`,`# Before / after contact sheets\n\n${written.map(v=>`- [${v}](${v}.png)`).join('\n')}\n`);console.log('sheets',written.length);
