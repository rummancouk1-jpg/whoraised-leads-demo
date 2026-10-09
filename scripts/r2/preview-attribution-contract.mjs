// Exercise real preview redirect and signed webhook, then remove only this test's isolated rows.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { bypass, parseEnv } from './infra.mjs';
import { login, logout, protectionHeaders } from '../design/lib.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass();
const origin=process.argv[2],env=parseEnv('.env.local'),credentials=parseEnv('.env.r2-preview.local');
assert.equal(env.GG_DB_ENVIRONMENT,'preview');assert.notEqual(new URL(env.DATABASE_URL).hostname.replace('-pooler',''),env.GG_PRODUCTION_DB_HOST.replace('-pooler',''));
const sql=neon(env.DATABASE_URL),cookie=await login(origin),id='test-r2-signup-'+randomUUID();let token;
const headers={...protectionHeaders(),Cookie:cookie,Origin:origin,'User-Agent':'Mozilla/5.0 Chrome/140.0.0.0'};
const result={at:new Date().toISOString(),origin,checks:[]};
try {
 const before=await (await fetch(origin+'/api/leads',{headers})).json(),slug=before.leads[0].tracked_slug;
 const count=async()=>Number((await sql`SELECT count(*)::int AS n FROM gg_clicks WHERE slug=${slug}`)[0].n);
 const clicksBefore=await count();const head=await fetch(origin+'/go/'+slug,{method:'HEAD',headers,redirect:'manual'});assert.equal(head.status,302);assert.equal(await count(),clicksBefore);result.checks.push({case:'HEAD never records a click',pass:true});
 const click=await fetch(origin+'/go/'+slug,{headers,redirect:'manual'});assert.equal(click.status,302);const destination=new URL(click.headers.get('location'));token=destination.searchParams.get('gg_click');assert(token);assert.equal(destination.searchParams.get('test'),'1');
 const stored=await sql`SELECT id,is_test FROM gg_clicks WHERE click_token=${token}`;assert.equal(stored.length,1);assert.equal(stored[0].is_test,true);result.checks.push({case:'ordinary preview click is signed, stored and marked test at redirect',pass:true});
 const body=JSON.stringify({id,slug,click_token:token,at:new Date().toISOString()}),nonce=randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac('sha256',credentials.SIGNUP_WEBHOOK_SECRET).update(`${timestamp}.${nonce}.${body}`).digest('hex');
 const webhookHeaders={...headers,Authorization:'Bearer '+credentials.SIGNUP_WEBHOOK_SECRET,'Content-Type':'application/json','x-gg-timestamp':timestamp,'x-gg-nonce':nonce,'x-gg-signature':signature};
 const send=extra=>fetch(origin+'/api/attribution/signup',{method:'POST',headers:{...webhookHeaders,...extra},body});
 const accepted=await send();assert.equal(accepted.status,200);assert.equal((await accepted.json()).recorded,true);
 const joined=await sql`SELECT click_id,is_test FROM gg_signups WHERE id=${id}`;assert.equal(joined[0].click_id,stored[0].id);assert.equal(joined[0].is_test,true);result.checks.push({case:'real signed webhook joins its stored click and preserves test exclusion',pass:true});
 assert.equal((await (await send()).json()).recorded,false);assert.equal((await send({'x-gg-signature':'0'.repeat(64)})).status,401);result.checks.push({case:'replay no-ops; tampered signature rejected',pass:true});
 const after=await (await fetch(origin+'/api/leads',{headers})).json();assert.deepEqual(after.clicks,before.clicks);result.checks.push({case:'test visit does not change client conversion analytics',pass:true});
} finally {
 await sql.transaction([sql`DELETE FROM gg_signups WHERE id=${id}`,sql`DELETE FROM gg_clicks WHERE click_token=${token??''}`]);
 await logout(origin,cookie);fs.writeFileSync('evidence/r2-fix/preview-attribution.json',JSON.stringify(result,null,2));
}
console.log(result.checks.length+' real HTTP/Neon attribution contracts passed; isolated test rows removed.');
