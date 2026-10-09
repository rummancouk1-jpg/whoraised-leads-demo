import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {api,envList,project,parseEnv} from './infra.mjs';
let saved;
try{saved=parseEnv('.env.r2-preview.local');}catch{saved={};}
const settings={GG_ACCESS_PASSWORD:saved.GG_ACCESS_PASSWORD||randomBytes(24).toString('hex'),GG_SESSION_SECRET:saved.GG_SESSION_SECRET||randomBytes(32).toString('hex'),CRON_SECRET:saved.CRON_SECRET||randomBytes(32).toString('hex'),SIGNUP_WEBHOOK_SECRET:saved.SIGNUP_WEBHOOK_SECRET||randomBytes(32).toString('hex'),ATTRIBUTION_SIGNING_SECRET:saved.ATTRIBUTION_SIGNING_SECRET||randomBytes(32).toString('hex'),GG_DB_ENVIRONMENT:'preview',GG_EXPECTED_DB_HOST:new URL(parseEnv('.env.local').DATABASE_URL).hostname,DIGEST_SEND_ENABLED:'false'};
settings.GG_PRODUCTION_DB_HOST=new URL(parseEnv('.env.r2-production-readonly.local').DATABASE_URL).hostname;
await fs.writeFile('.env.r2-preview.local',Object.entries(settings).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});
const envs=envList();
for(const [key,value] of Object.entries(settings)){
 const entries=envs.filter(e=>e.key===key&&e.target.some(t=>['preview','development'].includes(t)));
 for(const entry of entries){
  if(entry.target.includes('production')) api(`/v9/projects/${project.projectId}/env/${entry.id}`,'PATCH',{target:['production']});
  else api(`/v9/projects/${project.projectId}/env/${entry.id}`,'PATCH',{value});
 }
 const covered=new Set(entries.filter(e=>!e.target.includes('production')&&!e.gitBranch).flatMap(e=>e.target));
 const target=['preview','development'].filter(t=>!covered.has(t));
 if(target.length)api(`/v10/projects/${project.projectId}/env`,'POST',{key,value,target,type:'encrypted'});
}
for(const file of ['.env.local','.env.preclient.local']){
 let text=await fs.readFile(file,'utf8');for(const [key,value] of Object.entries(settings)){const line=`${key}=${JSON.stringify(value)}`;text=new RegExp(`^${key}=.*$`,'m').test(text)?text.replace(new RegExp(`^${key}=.*$`,'m'),()=>line):text.trimEnd()+'\n'+line+'\n';}await fs.writeFile(file,text,{mode:0o600});
}
console.log('Preview login, session, cron and attribution secrets separated; digest sending off; production settings preserved.');
