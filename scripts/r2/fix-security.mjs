import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {login,logout,protectionHeaders} from '../design/lib.mjs';import {bypass} from './infra.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass();const origin=process.argv[2],rows=[];
const paths=['/api/activity','/api/leads','/api/leads/claytrader/activity','/api/leads/claytrader','/api/email','/api/email/source','/api/digest','/api/sync','/api/errors','/api/cron/instantly-sync','/api/cron/digest','/api/cron/email-snapshot','/api/ohq/health','/api/ohq/watch','/api/ohq/reconcile','/api/ohq/canary','/api/attribution/signup'];
for(const path of paths){
 await Promise.all(['GET','POST','PATCH','DELETE','HEAD','OPTIONS'].map(async method=>{
  const response=await fetch(origin+path,{method,headers:{...protectionHeaders(),Authorization:'Bearer wrong'},redirect:'manual'});
  assert([401,403,405].includes(response.status)||(method==='OPTIONS'&&response.status===204),`${method} ${path}: ${response.status}`);rows.push({scope:'anonymous',path,method,status:response.status});
 }));
}
const cookie=await login(origin);
try{
 for(const [path,method]of [['/api/sync','POST'],['/api/errors','POST'],['/api/leads','POST'],['/api/leads/claytrader','PATCH'],['/api/auth','DELETE']]){
  const r=await fetch(origin+path,{method,headers:{...protectionHeaders(),Cookie:cookie,Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);rows.push({scope:'csrf',path,method,status:r.status});
 }
 const r=await fetch(origin+'/login',{headers:protectionHeaders()}),html=await r.text();assert(!/\bDavid\b|\bIan\b/.test(html));
 const leads=JSON.parse(await fs.readFile('evidence/r2-independent/leads.json','utf8'));assert(!leads.some(l=>html.includes(l.name)||html.includes(l.handle)));
 rows.push({scope:'preauth',names:0,csp:!!r.headers.get('content-security-policy'),noindex:r.headers.get('x-robots-tag'),cache:r.headers.get('cache-control')});
 const revoked=await fetch(origin+'/api/auth',{method:'DELETE',headers:{...protectionHeaders(),Cookie:cookie,Origin:origin}});assert.equal(revoked.status,200);
 const after=await fetch(origin+'/api/leads',{headers:{...protectionHeaders(),Cookie:cookie}});assert.equal(after.status,401);rows.push({scope:'revocation',status:after.status});
}finally{await logout(origin,cookie);}
await fs.writeFile('evidence/r2-fix/security.json',JSON.stringify({at:new Date().toISOString(),origin,checks:rows.length,rows},null,2));console.log(rows.length+' security contracts passed');
