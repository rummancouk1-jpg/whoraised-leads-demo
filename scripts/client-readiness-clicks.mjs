import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {neon} from '@neondatabase/serverless';process.loadEnvFile('.env.local');
const root='evidence/client-readiness',origin=process.env.AUDIT_ORIGIN||'http://localhost:3100',cookie=await fs.readFile(root+'/.session','utf8'),sql=neon(process.env.DATABASE_URL);
const read=async()=>await(await fetch(origin+'/api/leads',{headers:{Cookie:cookie}})).json();const before=await read();
const dbBefore=await sql`SELECT coalesce(max(id),0)::text AS id FROM gg_clicks`;
const requests=[];
for(const headers of [{'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari','X-GG-Test-Click':'1'},{'User-Agent':'GG-Outreach-Audit/1.0'},{'User-Agent':'Mozilla/5.0','X-GG-Test-Click':'audit'},{'User-Agent':'Twitterbot/1.0'}]){
 const response=await fetch(origin+'/go/audit-claytrader?utm_source=partner&utm_campaign=launch&utm_medium=email',{headers,redirect:'manual'});assert.equal(response.status,302);const url=new URL(response.headers.get('location'));for(const [key,value]of Object.entries({utm_source:'partner',utm_campaign:'launch',utm_medium:'email',utm_content:'audit-claytrader'}))assert.equal(url.searchParams.get(key),value);requests.push({headers,status:response.status,location:url.href});
}
const after=await read();assert.deepEqual(after.clicks,before.clicks);assert(!('tests'in after.clicks));
const events=await sql`SELECT id,slug,is_test,is_example,platform_guess FROM gg_clicks WHERE id>${dbBefore[0].id} ORDER BY id`;
assert.equal(events.length,3);assert(events.every(e=>e.is_test));
await fs.writeFile(root+'/clicks.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',before:before.clicks,after:after.clicks,requests,storedTestEvents:events,realCount:after.clicks.groups.reduce((n,g)=>n+g.clicks,0)},null,2));console.log('PASS: 3 marked requests stored, bot excluded, real metrics unchanged');
