// CLI handles Vercel protection. Password and session cookie stay in process memory.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import env from '@next/env';
env.loadEnvConfig(process.cwd());
const origin=new URL(process.argv[2]).origin;
const project=JSON.parse(await fs.readFile('.vercel/project.json','utf8'));
assert.equal(project.projectId,'prj_hmmvsjJtmK2Oour8oBpj3mBeMHL2');
assert.equal(project.orgId,'team_hRjHSu4sSUQnuotRYCgsIo19');
const cli=path.join(process.env.APPDATA,'npm/node_modules/vercel/dist/index.js');
async function request(route,args=[],input=''){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[cli,'curl',route,'--deployment',origin,'--','--silent','--show-error',...args],{windowsHide:true});
  let stdout='';child.stdout.on('data',b=>stdout+=b);child.stderr.resume();child.on('error',reject);
  child.on('close',code=>code===0?resolve(stdout):reject(new Error(`Protected candidate request ${route} failed (${code}).`)));child.stdin.end(input);
 });
}
const login=await request('/api/auth',['--include','--request','POST','--header','Origin: '+origin,'--header','Content-Type: application/json','--data-binary','@-'],JSON.stringify({password:process.env.GG_ACCESS_PASSWORD}));
assert(/HTTP\/[^\s]+ 200\b/.test(login),'Candidate app login failed');
const cookie=login.match(/set-cookie:\s*(gg_session=[^;\r\n]+)/i)?.[1]||login.match(/set-cookie:\s*([^;\r\n]+)/i)?.[1];
assert(cookie,'Candidate app session missing');
const body=JSON.parse(await request('/api/leads',['--header','Cookie: '+cookie]));
const leads=body.leads||body;
const audit=JSON.parse(await fs.readFile('data/creator-list-r2.json','utf8'));
for(const l of audit.accepted){const deployed=leads.find(r=>r.tracked_slug===l.tracked_slug);assert(deployed,'Candidate DB row missing');assert.equal(deployed.contact_type,l.contact_type);assert.equal(deployed.kind,l.kind);}
const html=await request('/', ['--header','Cookie: '+cookie]);
assert(html.includes('Potential sponsors')&&html.includes('Highest outreach priority'),'Candidate dashboard does not contain the R2 UI');
const proof={checked_at:new Date().toISOString(),origin,login:'PASS',apiResearch:'PASS',qualified:audit.count,groups:audit.groups,renderedGroups:'PASS',deploymentProtection:'CLI authenticated access; no settings changed'};
await fs.writeFile('evidence/creator-audit-r2/candidate-proof.json',JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof));
