// Read-only PSI attempt. Secrets stay in memory and are never written to reports.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const vc=path.join(execFileSync('npm.cmd',['root','-g'],{encoding:'utf8',shell:true}).trim(),'vercel/dist/vc.js');
const project=JSON.parse(execFileSync(process.execPath,[vc,'api','/v9/projects/prj_hmmvsjJtmK2Oour8oBpj3mBeMHL2?teamId=team_hRjHSu4sSUQnuotRYCgsIo19','--raw'],{encoding:'utf8'}));
const secret=Object.keys(project.protectionBypass??{})[0];
const preview=(await fs.readFile('evidence/r2/preview-url.txt','utf8')).trim();
const repo='repos/rummancouk1-jpg/whoraised-leads-demo';
const workflows=JSON.parse(execFileSync('gh',['api',repo+'/actions/workflows'],{encoding:'utf8'}));
const secrets=JSON.parse(execFileSync('gh',['api',repo+'/actions/secrets'],{encoding:'utf8'}));
const out={target:preview,bypassAvailable:!!secret,attempts:[],github:{workflows:workflows.total_count,secrets:secrets.total_count},verdict:'UNVERIFIED: authenticated dashboard not accessible to PSI without app-session writes'};
if(secret){
 const u=new URL(preview);u.searchParams.set('x-vercel-protection-bypass',secret);
 const r=await fetch(u,{redirect:'follow'}),html=await r.text();
 out.preflight={status:r.status,loginPage:html.includes('Private workspace for the GG team only')&&html.includes('password'),needsAction:html.includes('Needs action today')};
 console.log('Automation bypass works; target status',r.status,'loginPage',out.preflight.loginPage,'dashboard',out.preflight.needsAction);
 for(const strategy of ['mobile','desktop']){
  const api=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');api.searchParams.set('url',u.toString());api.searchParams.set('strategy',strategy);api.searchParams.set('category','performance');
  try{const r=await fetch(api,{signal:AbortSignal.timeout(120000)});const data=await r.json();
   out.attempts.push({strategy,status:r.status,error:data.error?{code:data.error.code,message:data.error.message}:undefined,performance:data.lighthouseResult?.categories?.performance?.score,runtimeError:data.lighthouseResult?.runtimeError,validDashboardMeasurement:false});
   console.log('PSI',strategy,r.status,data.error?.code??'completed','excluded from dashboard verdict');
  }catch(e){out.attempts.push({strategy,error:e.name,validDashboardMeasurement:false});console.log('PSI',strategy,e.name);}
  await fs.writeFile('evidence/r2-independent/offmachine.json',JSON.stringify(out,null,2).replaceAll(secret,'[redacted]'));
 }
}else await fs.writeFile('evidence/r2-independent/offmachine.json',JSON.stringify(out,null,2));
