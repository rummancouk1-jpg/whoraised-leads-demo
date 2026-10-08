import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const origin=process.env.AUDIT_ORIGIN||'http://localhost:3100',root='evidence/client-readiness',sql=neon(process.env.DATABASE_URL),results={at:new Date().toISOString(),origin};
const ip='192.0.2.187';let identity=createHash('sha256').update(`${process.env.GG_SESSION_SECRET}:${ip}`).digest('hex');
const login=password=>fetch(origin+'/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify({password})});
await sql`DELETE FROM gg_login_attempts WHERE identity=${identity}`;
try {
  results.failures=[];for(let i=0;i<5;i++){const r=await login('deliberately-invalid-audit-password');results.failures.push(r.status);assert.equal(r.status,401);}
  results.lockedCorrectPassword=(await login(process.env.GG_ACCESS_PASSWORD)).status;assert.equal(results.lockedCorrectPassword,429);
  // Hosting may replace X-Forwarded-For with its trusted client address.
  const actual=await sql`SELECT identity FROM gg_login_attempts WHERE attempts=5 AND window_start>now()-interval '1 minute'`;
  if(!actual.some(r=>r.identity===identity)){assert.equal(actual.length,1);identity=actual[0].identity;}
  const stored=await sql`SELECT attempts,extract(epoch FROM (window_start+interval '15 minutes'-now()))::int AS seconds_remaining FROM gg_login_attempts WHERE identity=${identity}`;
  assert.equal(stored[0].attempts,5);assert(stored[0].seconds_remaining>850);results.lock=stored[0];
  // Advance only this isolated test identity's window; do not wait 15 minutes or change other identities.
  await sql`UPDATE gg_login_attempts SET window_start=now()-interval '16 minutes' WHERE identity=${identity}`;
  const r=await login(process.env.GG_ACCESS_PASSWORD);assert.equal(r.status,200);const header=r.headers.get('set-cookie');
  assert(/HttpOnly/i.test(header)&&/Secure/i.test(header)&&/SameSite=Lax/i.test(header)&&/Max-Age=1209600/i.test(header)&&/Expires=/i.test(header));
  results.cookie={httpOnly:true,secure:true,sameSite:'Lax',maxAge:1209600,definedExpiry:true};
  const cookie=header.split(';')[0];
  const tokenHash=createHash('sha256').update(cookie.slice(cookie.indexOf('=')+1)).digest('hex');
  const expiry=await sql`SELECT extract(epoch FROM (expires_at-now()))::int AS seconds_remaining FROM gg_sessions WHERE token_hash=${tokenHash}`;
  assert.equal(expiry.length,1);assert(expiry[0].seconds_remaining>1209500&&expiry[0].seconds_remaining<=1209600);results.serverSessionExpiry=expiry[0];
  assert.equal((await fetch(origin+'/api/leads',{headers:{Cookie:cookie}})).status,200);
  const logout=await fetch(origin+'/api/auth',{method:'DELETE',headers:{Origin:origin,Cookie:cookie}});assert.equal(logout.status,200);
  results.replayedAfterLogout=(await fetch(origin+'/api/leads',{headers:{Cookie:cookie}})).status;assert.equal(results.replayedAfterLogout,401);
  const valid=await login(process.env.GG_ACCESS_PASSWORD);assert.equal(valid.status,200);
  await fs.writeFile(root+'/.session',valid.headers.get('set-cookie').split(';')[0]);
  results.headers=[];for(const path of ['/login','/','/api/leads','/go/audit-claytrader']){const response=await fetch(origin+path,{method:path.startsWith('/go/')?'HEAD':'GET',redirect:'manual'});const h=Object.fromEntries(['content-security-policy','strict-transport-security','x-frame-options','referrer-policy','x-content-type-options'].map(k=>[k,response.headers.get(k)]));assert(h['content-security-policy']?.includes("frame-ancestors 'none'")&&h['content-security-policy']?.includes('nonce-'));assert.equal(h['x-frame-options'],'DENY');assert(h['strict-transport-security']?.includes('max-age=31536000'));assert(['strict-origin-when-cross-origin','no-referrer'].includes(h['referrer-policy']));results.headers.push({path,status:response.status,headers:h});}
  results.status='PASS';
}catch(e){results.status='FAIL';results.error=e.stack;process.exitCode=1;}finally{await sql`DELETE FROM gg_login_attempts WHERE identity=${identity}`;await fs.writeFile(root+'/security.json',JSON.stringify(results,null,2));console.log(results);}


