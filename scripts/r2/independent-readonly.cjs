/* eslint-disable @typescript-eslint/no-require-imports -- Node --require preload safety boundary. */
/* Local audit safety boundary. Every Neon read is a READ ONLY transaction.
 * Runtime DDL/backfill and login bookkeeping are suppressed locally; sessions
 * exist only in this process. All other mutations fail closed. No product edits.
 * node --require ./scripts/r2/independent-readonly.cjs node_modules/next/dist/bin/next start -p 3103
 */
const fs = require('node:fs');
const path = require('node:path');
const realFetch = globalThis.fetch;
const dir = path.resolve('evidence/r2-independent');
fs.mkdirSync(dir, {recursive:true});
for(const line of fs.readFileSync('.env.preclient.local','utf8').split(/\r?\n/)) {
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/);
  if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^"|"$/g,'');
}
process.env.DIGEST_SEND_ENABLED='false';
process.env.GG_MONITOR_LOCAL='0';
const sessions = new Set();
const result=(rows=[])=>({fields:rows.length?Object.keys(rows[0]).map(name=>({name,dataTypeID:25})):[],rows:rows.map(row=>Object.values(row).map(v=>v===null?null:String(v))),rowCount:rows.length});
function suppressed(q) {
  const sql=q.query.trim();const p=q.params;
  if(/^CREATE (TABLE|INDEX) IF NOT EXISTS |^ALTER TABLE gg_clicks ADD COLUMN IF NOT EXISTS |^UPDATE gg_clicks SET is_test=true WHERE NOT is_test AND /i.test(sql))return result();
  if(/^INSERT INTO gg_sessions/i.test(sql)){sessions.add(p[0]);return result();}
  if(/^DELETE FROM gg_sessions/i.test(sql)){sessions.delete(p[0]);return result();}
  if(/^SELECT 1 FROM gg_sessions/i.test(sql))return result(sessions.has(p[0])?[{'?column?':'1'}]:[]);
  if(/^SELECT 1 FROM gg_login_attempts/i.test(sql)||/^DELETE FROM gg_login_attempts/i.test(sql))return result();
  if(/^INSERT INTO gg_sync_runs/i.test(sql))return result([{id:-1}]);
  if(/^UPDATE gg_sync_runs/i.test(sql))return result();
  return null;
}
globalThis.fetch=async function(input,init={}) {
  const u=new URL(typeof input==='string'?input:input.url??String(input));
  const headers=new Headers(init.headers??(input instanceof Request?input.headers:undefined));
  if(headers.has('Neon-Connection-String')) {
    const payload=JSON.parse(init.body);const queries=payload.queries??[payload];
    const outputs=[];
    for(const q of queries) {
      const local=suppressed(q);
      if(local){fs.appendFileSync(path.join(dir,'readonly-guard.log'),'SUPPRESSED '+q.query.trim().split(/\s+/).slice(0,5).join(' ')+'\n');outputs.push(local);continue;}
      if(!/^SELECT\s/i.test(q.query.trim()))throw new Error('Audit guard blocked database mutation');
      headers.set('Neon-Batch-Read-Only','true');
      const response=await realFetch(input,{...init,headers,body:JSON.stringify({queries:[q]})});
      if(!response.ok)return response;const body=await response.json();outputs.push(body.results[0]);
      fs.appendFileSync(path.join(dir,'readonly-guard.log'),'READ_ONLY '+q.query.trim().split(/\s+/).slice(0,5).join(' ')+'\n');
    }
    return Response.json(payload.queries?{results:outputs}:outputs[0]);
  }
  const method=init.method??(input instanceof Request?input.method:'GET');
  if(!['GET','HEAD'].includes(method) && !['localhost','127.0.0.1'].includes(u.hostname) && !(u.origin==='https://api.instantly.ai'&&u.pathname==='/api/v2/leads/list'))throw new Error('Audit guard blocked external mutation');
  return realFetch(input,init);
};
console.log('Independent audit guard active: shared database READ ONLY; local memory sessions.');
