// Five unchanged lighthouse.mjs passes (each covers all three pages, mobile + desktop).
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('evidence/r2-independent/performance');
await fs.mkdir(root,{recursive:true});
const cpu=spawn('powershell.exe',['-NoProfile','-File','scripts/r2/independent-cpu.ps1','-OutputPath',path.join(root,'cpu.jsonl')],{windowsHide:true,stdio:['ignore','ignore','pipe']});
cpu.stderr.on('data',d=>process.stderr.write(d));
const runs=[];
try{
 for(let i=1;i<=5;i++){
  const startedAt=new Date().toISOString();const dir=path.join(root,'run-'+i);await fs.mkdir(dir,{recursive:true});
  console.log('CONTENDED MACHINE pass',i,startedAt);
  const child=spawn(process.execPath,['scripts/design/lighthouse.mjs','http://localhost:3103'],{env:{...process.env,EVIDENCE_ROOT:dir},windowsHide:true,stdio:['ignore','pipe','pipe']});
  const output=[];child.stdout.on('data',d=>{output.push(d.toString());process.stdout.write(d);});child.stderr.on('data',d=>{output.push(d.toString());process.stderr.write(d);});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  await fs.writeFile(path.join(dir,'command.log'),output.join(''));
  runs.push({i,startedAt,finishedAt:new Date().toISOString(),exitCode:code});await fs.writeFile(path.join(root,'runs.json'),JSON.stringify(runs,null,2));
 }
}finally{cpu.kill();}
const samples=(await fs.readFile(path.join(root,'cpu.jsonl'),'utf8')).trim().split(/\r?\n/).map(l=>JSON.parse(l.replace(/^\uFEFF/,'')));
const median=a=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
const raw=[];
for(const run of runs){const reports=JSON.parse(await fs.readFile(path.join(root,'run-'+run.i,'lighthouse.json'),'utf8'));for(const row of reports){const lhr=JSON.parse(await fs.readFile(path.join(root,'run-'+run.i,'lighthouse','lighthouse-'+row.key+'.json'),'utf8'));const start=Date.parse(lhr.fetchTime),end=Date.parse(row.at);const load=samples.filter(s=>Date.parse(s.at)>=start&&Date.parse(s.at)<=end).map(s=>s.cpu);raw.push({...row,run:run.i,cpu:{samples:load.length,median:median(load),max:Math.max(...load)},numeric:Object.fromEntries(['server-response-time','first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(id=>[id,lhr.audits[id]?.numericValue])),contributors:Object.entries(lhr.audits).filter(([,v])=>v.score!==null&&v.score<1&&v.scoreDisplayMode!=='informative').map(([id,v])=>({id,title:v.title,score:v.score,numericValue:v.numericValue,display:v.displayValue,details:v.details})).sort((a,b)=>(b.numericValue??0)-(a.numericValue??0))});}}
const summary=[...new Set(raw.map(r=>r.key))].map(key=>{const values=raw.filter(r=>r.key===key);return {key,n:values.length,performance:median(values.map(r=>r.scores.performance)),accessibility:median(values.map(r=>r.scores.accessibility)),bestPractices:median(values.map(r=>r.scores['best-practices'])),scores:values.map(r=>r.scores.performance),cpuMedian:median(values.map(r=>r.cpu.median)),cpuMax:Math.max(...values.map(r=>r.cpu.max)),metrics:Object.fromEntries(Object.keys(values[0].numeric).map(id=>[id,median(values.map(r=>r.numeric[id]).filter(n=>n!=null))]))};});
await fs.writeFile(path.join(root,'summary.json'),JSON.stringify({label:'contended machine',origin:'http://localhost:3103',readOnlyBoundary:'database reads real; DDL and sessions suppressed locally; no shared writes',summary,raw},null,2));console.log(JSON.stringify(summary,null,2));
