import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const origin=process.argv[2]||process.env.GG_PREVIEW_URL;
if(!origin||!new URL(origin).hostname.endsWith('.vercel.app'))throw new Error('Supply the immutable Vercel preview URL.');
const root='evidence/r2-fix/offmachine';
const rows=[];
for(let pass=1;pass<=3;pass++){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/design/lighthouse.mjs',origin],{env:{...process.env,EVIDENCE_ROOT:`${root}/run-${pass}`},stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`Lighthouse run ${pass} exited ${code}`)));
 });
 rows.push(...JSON.parse(await fs.readFile(`${root}/run-${pass}/lighthouse.json`,'utf8')).map(r=>({...r,pass})));
}
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
const medians=[...new Set(rows.map(r=>r.key))].map(key=>{
 const runs=rows.filter(r=>r.key===key),scores=Object.fromEntries(Object.keys(runs[0].scores).map(cat=>[cat,median(runs.map(r=>r.scores[cat]))]));
 return {key,scores,pass:Object.values(scores).every(s=>s>=90),contributors:runs.flatMap(r=>r.failedAudits).sort((a,b)=>b.savingsMs-a.savingsMs).slice(0,10)};
});
const result={at:new Date().toISOString(),machine:'GitHub Actions ubuntu-latest; off-machine deciding verdict',origin,runs:rows.length,medians,pass:medians.length===6&&medians.every(r=>r.pass)};
await fs.writeFile(`${root}/medians.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!result.pass)process.exitCode=1;
