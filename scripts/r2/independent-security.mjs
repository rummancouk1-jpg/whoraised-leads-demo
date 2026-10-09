import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {login,logout} from '../design/lib.mjs';
const dir='evidence/r2-independent',origin='http://localhost:3103',rows=[];
const routes=['/api/activity','/api/leads','/api/leads/claytrader/activity','/api/leads/claytrader','/api/email','/api/email/source','/api/digest','/api/sync','/api/errors','/api/cron/instantly-sync','/api/cron/digest','/api/cron/email-snapshot','/api/ohq/health','/api/ohq/watch','/api/ohq/reconcile','/api/ohq/canary','/api/attribution/signup'];
for(const p of routes)for(const method of ['GET','POST','PATCH','DELETE','HEAD','OPTIONS']){
 const r=await fetch(origin+p,{method,headers:{Authorization:'Bearer deliberately-invalid'},redirect:'manual'});
 rows.push({scope:'local-anonymous',path:p,method,status:r.status,cache:r.headers.get('cache-control'),csp:!!r.headers.get('content-security-policy')});
}
const cookie=await login(origin);
for(const [p,method]of [['/api/sync','POST'],['/api/errors','POST'],['/api/leads','POST'],['/api/leads/claytrader','PATCH'],['/api/auth','DELETE']]){
 const r=await fetch(origin+p,{method,headers:{Cookie:cookie,Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);rows.push({scope:'csrf',path:p,method,status:r.status});
}
const html=await(await fetch(origin+'/login')).text();const leads=JSON.parse(fs.readFileSync(dir+'/leads.json','utf8'));
const names=leads.filter(l=>html.includes(l.name)||html.includes(l.handle));rows.push({scope:'preauth',creatorNameMatches:names.map(l=>l.tracked_slug),hasDavidIan:/\bDavid\b|\bIan\b/.test(html),sentence:html.includes('Private workspace for the GG team only')});
await logout(origin,cookie);
fs.writeFileSync(dir+'/security.json',JSON.stringify(rows,null,2));
console.log('local anonymous method checks',routes.length*6,'CSRF checks',5,'preauth creator matches',names.length);
const vc=path.join(execFileSync('npm.cmd',['root','-g'],{encoding:'utf8',shell:true}).trim(),'vercel/dist/vc.js');
const deployment=fs.readFileSync('evidence/r2/preview-url.txt','utf8').trim();
for(const [p,method]of [['/','GET'],['/api/activity','GET'],['/api/leads','GET'],['/api/email','GET'],['/api/digest','GET'],['/api/sync','POST'],['/api/errors','POST'],['/api/cron/instantly-sync','GET'],['/api/cron/digest','GET'],['/api/ohq/health','GET'],['/api/ohq/watch','GET'],['/api/ohq/reconcile','GET'],['/api/ohq/canary','GET'],['/api/attribution/signup','POST']]){
 const raw=execFileSync(process.execPath,[vc,'curl',p,'--deployment',deployment,'--','-s','-i','-X',method,'-H','Authorization: Bearer deliberately-invalid'],{encoding:'utf8',timeout:30000});
 const statuses=[...raw.matchAll(/HTTP\/[\d.]+ (\d+)/g)];const status=Number(statuses.at(-1)?.[1]);rows.push({scope:'preview-anonymous',path:p,method,status,hasCsp:/content-security-policy:/i.test(raw),body:raw.split(/\r?\n\r?\n/).slice(1).join('\n').slice(0,120)});
 fs.writeFileSync(dir+'/security.json',JSON.stringify(rows,null,2));console.log('preview',method,p,status);
}
