import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='evidence/deployed';
const rows=JSON.parse(await fs.readFile(`${root}/parity.json`,'utf8'));
const dimensions=[390,820,1440].flatMap(width=>['normal','reduce'].map(motion=>({width,motion})));
let md='# Deployed parity evidence\n\nLive URL: https://whoraised-leads-demo.vercel.app. Chromium, 960px viewport height. All captures use the deployed origin; no localhost or mocked API data. EXAMPLE gate records were imported into the hosted DB for verification, then removed. Email shows the actual server response (including configuration errors when no key exists).\n\n';
md+='| View | 390 normal | 390 reduced | 820 normal | 820 reduced | 1440 normal | 1440 reduced |\n|---|---|---|---|---|---|---|\n';
for(const view of [...new Set(rows.map(r=>r.view))])md+=`| ${view} | `+dimensions.map(d=>{const r=rows.find(r=>r.view===view&&r.width===d.width&&r.motion===d.motion);return r?`[${r.status}](${r.screenshot})`:'—';}).join(' | ')+' |\n';
md+=`\n${rows.length} screenshots; ${rows.filter(r=>r.status==='FAIL').length} measured layout failures. Checks: page overflow, dialog bounds, clipped controls, reduced-motion animations/transitions. Pipeline horizontal scroll tested at 390px. Screenshots require visual review as well. [Readiness results](ready.json).\n`;
await fs.writeFile(`${root}/PARITY.md`,md);
for(const view of ['dashboard','pipeline','email','drawer','login','import','export','drawer-bottom','import-bottom']){
  const composite=[];
  for(const [i,d]of dimensions.entries()){
    const r=rows.find(r=>r.view===view&&r.width===d.width&&r.motion===d.motion);if(!r)continue;
    const input=await sharp(`${root}/${r.screenshot}`).resize({width:480,height:1000,fit:'inside'}).toBuffer();
    const m=await sharp(input).metadata();const left=(i%3)*500;const top=Math.floor(i/3)*1050;
    composite.push({input:Buffer.from(`<svg width="500" height="35"><text x="10" y="25" fill="white" font-size="18">${view} ${d.width} ${d.motion} ${r.status}</text></svg>`),left,top});
    composite.push({input,left:left+Math.floor((500-m.width)/2),top:top+40});
  }
  await sharp({create:{width:1500,height:2100,channels:3,background:'#1e293b'}}).composite(composite).png().toFile(`${root}/review-${view}.png`);
}
await fs.writeFile(`${root}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deployed GG Outreach evidence</title><style>body{margin:24px;background:#0b0f14;color:#eee;font:14px system-ui}a{color:#a5b4fc}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}img{width:100%;height:320px;object-fit:contain}figure{margin:0;border:1px solid #334155;padding:12px}</style><h1>Deployed GG Outreach parity</h1><p>https://whoraised-leads-demo.vercel.app · ${rows.length} captures</p><p><a href="PARITY.md">Matrix</a> · <a href="ready.json">Ready gate</a></p><div class="grid">${rows.map(r=>`<figure><a href="${r.screenshot}"><img src="${r.screenshot}" alt="${r.view} ${r.width} ${r.motion}" loading="lazy"></a><figcaption>${r.view} ${r.width}px ${r.motion}: ${r.status}</figcaption></figure>`).join('')}</div></html>`);
console.log(`${rows.length} screenshots indexed.`);
