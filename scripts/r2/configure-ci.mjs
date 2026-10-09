import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bypass,parseEnv,command,api} from './infra.mjs';
const origin=process.argv[2];if(!origin)throw new Error('Supply immutable preview URL');
const d=api('/v13/deployments/'+new URL(origin).hostname);
if(d.target==='production'||d.readyState!=='READY')throw new Error('Preview is not ready.');
const env=parseEnv('.env.r2-preview.local'),token=bypass();
for(const [key,value] of Object.entries({GG_PREVIEW_URL:origin,GG_PREVIEW_ACCESS_PASSWORD:env.GG_ACCESS_PASSWORD,VERCEL_AUTOMATION_BYPASS_SECRET:token})){
 execFileSync('gh',['secret','set',key,'--repo','rummancouk1-jpg/whoraised-leads-demo'],{input:value,stdio:['pipe','pipe','pipe']});
}
const args=['functions','deploy','r2scheduler','--project-id','billowing-unit-25273213','--branch','br-raspy-fog-b7rr7e4r','--src','functions/r2scheduler.mjs','--env',`GG_PREVIEW_URL=${origin}`,'--env',`CRON_SECRET=${env.CRON_SECRET}`,'--env',`VERCEL_AUTOMATION_BYPASS_SECRET=${token}`,'-o','json'];
const fn=JSON.parse(command('neon',args));
let triggers=JSON.parse(command('neon',['triggers','list','--project-id','billowing-unit-25273213','--branch','br-raspy-fog-b7rr7e4r','-o','json']));
for(const [name,cron,path] of [['r2-preview-15-min','*/15 * * * *','/sync'],['r2-preview-digest','5 13,14,15 * * 1','/digest']]){
 if(!triggers.some(t=>t.name===name))command('neon',['triggers','create','--project-id','billowing-unit-25273213','--branch','br-raspy-fog-b7rr7e4r','--function-slug','r2scheduler','--name',name,'--cron',cron,'--function-path',path,'-o','json']);
}
triggers=JSON.parse(command('neon',['triggers','list','--project-id','billowing-unit-25273213','--branch','br-raspy-fog-b7rr7e4r','-o','json']));
fs.writeFileSync('evidence/r2-fix/scheduler.json',JSON.stringify({at:new Date().toISOString(),preview:origin,branch:'br-raspy-fog-b7rr7e4r',functionDeployed:!!fn,triggers:triggers.map(t=>({id:t.id,name:t.name,type:t.type,enabled:t.enabled,schedule:t.schedule,nextRunAt:t.next_run_at,functionPath:t.function_path}))},null,2));
console.log('Preview-only CI secrets configured; isolated Neon scheduler installed.');
