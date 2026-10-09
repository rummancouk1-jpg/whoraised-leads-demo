import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const dir='evidence/creator-audit-r2/html';
await fs.mkdir(dir,{recursive:true});
const audit=JSON.parse(await fs.readFile('data/creator-demo-audit.json','utf8'));
const seeds=JSON.parse(await fs.readFile('data/creator-contact-seeds.json','utf8'));
const loads=[];
for(const file of ['creator-contact-loads','creator-corrected-loads','creator-last-loads']) loads.push(...JSON.parse(await fs.readFile(`data/${file}.json`,'utf8')));
const targets=new Map();
function add(url,slug){if(!/^https?:/.test(url||''))return; if(!targets.has(url))targets.set(url,new Set()); targets.get(url).add(slug);}
for(const r of [...audit.records,...audit.accepted.map(lead=>({lead}))]) {
 const l=r.lead, key=l.tracked_slug.replace(/^(r1|audit)-/,'');
 if(l.platform==='YouTube') add((r.source_url||l.notes.match(/Source: (https:\/\/[^\s.]+[^\s]*)/)?.[1]||`https://www.youtube.com/${l.handle}/videos?hl=en`).replace('/videos','/about'),l.tracked_slug);
 if(l.platform==='Substack') add(r.source_url||l.notes.match(/Source: (https:\/\/[^\s]+)/)?.[1],l.tracked_slug);
 add(l.contact_source_url,l.tracked_slug);
 if(seeds[key]) add(seeds[key]+'/contact',l.tracked_slug);
 for(const p of loads.filter(p=>p.slug===key)) if(p.url && new URL(p.url).pathname!=='/') add(p.url,l.tracked_slug);
}
for(const sub of ['options','thetagang','Daytrading','stocks','StockMarket','Earnings','swingtrading']) {
 add(`https://old.reddit.com/r/${sub}/`, `r2-r-${sub.toLowerCase()}`);
 add(`https://www.reddit.com/r/${sub}/about.json`, `r2-r-${sub.toLowerCase()}`);
 add(`https://old.reddit.com/r/${sub}/about/rules.json`, `r2-r-${sub.toLowerCase()}`);
}
const saved=[];let index=0;
async function worker(){while(index<targets.size){const [url,slugs]=[...targets][index++]; const file=`${dir}/${crypto.createHash('sha256').update(url).digest('hex').slice(0,20)}.html`;let record={url,slugs:[...slugs],file,checked_at:new Date().toISOString()};try{const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0 (compatible; GGResearch/2.0)'}});const h=await r.text();await fs.writeFile(file,h);const text=h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');record={...record,status:r.status,final_url:r.url,emails:[...new Set(h.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[])].filter(x=>!x.match(/\.(png|jpg|webp|svg)$/i)),forms:(h.match(/<form\b[^>]*>/gi)||[]),text:text.slice(0,65000),links:[...new Set([...h.matchAll(/(?:href|url)=["']([^"']+)["']/gi)].map(m=>m[1]))].filter(u=>/contact|message|chat|sponsor|partner|mod|about/i.test(u))};}catch(e){record.error=e.message;}saved.push(record);}
}
await Promise.allSettled(Array.from({length:10},worker));
await fs.writeFile('data/creator-research-r2.json',JSON.stringify(saved,null,2));
console.log(JSON.stringify(saved.map(({url,status,emails,forms,error})=>({url,status,emails:emails?.slice(0,6),forms:forms?.length,error}))));
