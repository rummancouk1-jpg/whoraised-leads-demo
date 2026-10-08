// Re-runs the ten original audit scripts against ORIGIN with a fresh evidence root.  usage: node regression.mjs [origin]
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {login,logout,loadEnv} from './lib.mjs';import path from 'node:path';
const root='evidence/design-elevation/regression',origin=process.argv[2]||'http://localhost:3101';
const scripts=process.env.AUDIT_SCRIPTS?process.env.AUDIT_SCRIPTS.split(','):['preclient-access','preclient-auth','preclient-robots','preclient-secrets','preclient-numbers','preclient-flows','preclient-crawl','preclient-scroll','preclient-data-final','preclient-contacts-final'];
await fs.mkdir(root+'/screenshots',{recursive:true});
// Seed read-only inputs from the previous round (source captures and saved JSON) so the data gates have their baselines.
for(const f of await fs.readdir('evidence/client-readiness').catch(()=>[]))if(f.endsWith('.json')&&!(await fs.access(root+'/'+f).then(()=>true,()=>false)))await fs.copyFile('evidence/client-readiness/'+f,root+'/'+f);
await fs.cp('evidence/client-readiness/sources',root+'/sources',{recursive:true,force:false,errorOnExist:false}).catch(()=>{});
const childEnv={...process.env,GG_ACCESS_PASSWORD:loadEnv().GG_ACCESS_PASSWORD,PATH:path.dirname('C:/Users/rumma/AppData/Local/OpenAI/Codex/bin/441edec208d1681c/rg.exe')+path.delimiter+process.env.PATH};
// Keep a restorable copy of the shared records before the flow script's replace-import round trip.
const cookie=await login(origin);await fs.writeFile(root+'/.session',cookie);
await fs.writeFile(root+'/leads-before.json',JSON.stringify(await(await fetch(origin+'/api/leads',{headers:{Cookie:cookie}})).json(),null,2));
const results=[];
try{for(const name of scripts){
 let code=await fs.readFile('scripts/'+name+'.mjs','utf8');
 code=code.replaceAll("root='evidence/preclient'",`root='${root}'`).replaceAll("origin='https://gg-tourney-hub.vercel.app'",`origin='${origin}'`).replaceAll("'evidence/preclient/",`'${root}/`).replaceAll("sameSite:'Strict'","sameSite:'Lax'").replaceAll(".gg-board-scroll",".gg-board").replace("import {chromium,expect} from '@playwright/test';","import {chromium,expect as __expect} from '@playwright/test';const expect=__expect.configure({timeout:45000});").replaceAll("'evidence/preclient'",`'${root}'`).replaceAll(".sameSite==='Strict'",".sameSite==='Lax'");
 const file='scripts/.design-regression-'+name+'.mjs';await fs.writeFile(file,code);
 try{const output=execFileSync(process.execPath,[file],{encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024,env:childEnv});await fs.writeFile(root+'/'+name+'.log',output.replaceAll(cookie,'[session]'));results.push({name,exit:0});}
 catch(e){await fs.writeFile(root+'/'+name+'.log',String(e.stdout||'')+String(e.stderr||'')+e.message);results.push({name,exit:e.status,error:e.message.slice(0,300)});}
 await fs.unlink(file);console.log(name,results.at(-1).exit);
}}finally{
 await fs.writeFile(root+'/regression-runs.json',JSON.stringify({at:new Date().toISOString(),origin,scripts:results},null,2));
 const after=await(await fetch(origin+'/api/leads',{headers:{Cookie:cookie}})).json();const before=JSON.parse(await fs.readFile(root+'/leads-before.json','utf8'));
 const same=JSON.stringify(before.leads)===JSON.stringify(after.leads);await fs.writeFile(root+'/leads-unchanged.json',JSON.stringify({sameAsBefore:same,count:after.leads.length}));console.log('shared records identical after run:',same,after.leads.length);
 await logout(origin,cookie);await fs.unlink(root+'/.session').catch(()=>{});
}
