import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const root='evidence/client-readiness',origin=process.env.AUDIT_ORIGIN||'https://gg-tourney-hub.vercel.app';
const scripts=process.env.AUDIT_SCRIPTS?process.env.AUDIT_SCRIPTS.split(','):['preclient-access','preclient-auth','preclient-robots','preclient-secrets','preclient-numbers','preclient-flows','preclient-crawl','preclient-scroll','preclient-data-final','preclient-contacts-final'];const prior=process.env.AUDIT_SCRIPTS?JSON.parse(await fs.readFile(root+'/regression-runs.json','utf8')).scripts:[];const results=prior.filter(r=>!scripts.includes(r.name));
for(const name of scripts){
 let code=await fs.readFile('scripts/'+name+'.mjs','utf8');
 code=code.replaceAll("root='evidence/preclient'",`root='${root}'`).replaceAll("origin='https://gg-tourney-hub.vercel.app'",`origin='${origin}'`).replaceAll("'evidence/preclient/",`'${root}/`).replaceAll("sameSite:'Strict'","sameSite:'Lax'");
 // Source checks reuse saved publisher contact provenance; new source captures are fresh.
 if(name==='preclient-data-final'||name==='preclient-contacts-final')code=code.replaceAll(root+'/sources/',root+'/sources/');
 code=code.replaceAll(".gg-board-scroll",".gg-board").replaceAll("'evidence/preclient'",`'${root}'`).replaceAll(".sameSite==='Strict'",".sameSite==='Lax'");
 const file='scripts/.client-readiness-'+name+'.mjs';await fs.writeFile(file,code);
 try{const output=execFileSync(process.execPath,[file],{encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024,env:process.env});await fs.writeFile(root+'/'+name+'.log',output);results.push({name,exit:0});}
 catch(e){await fs.writeFile(root+'/'+name+'.log',String(e.stdout||'')+String(e.stderr||'')+e.message);results.push({name,exit:e.status,error:e.message.slice(0,300)});}
 await fs.unlink(file);await fs.writeFile(root+'/regression-runs.json',JSON.stringify({at:new Date().toISOString(),origin,scripts:results},null,2));console.log(name,results.at(-1).exit);
}
