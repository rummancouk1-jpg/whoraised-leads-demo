/* eslint-disable @typescript-eslint/no-require-imports -- Actual TypeScript server modules loaded in a Node contract runner. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const ROOT=process.cwd(),results=[],cache=new Map();
for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m){try{process.env[m[1]]=JSON.parse(m[2]);}catch{process.env[m[1]]=m[2];}}}
assert.equal(process.env.GG_DB_ENVIRONMENT,'preview');
assert.notEqual(new URL(process.env.DATABASE_URL).hostname.replace('-pooler',''),process.env.GG_PRODUCTION_DB_HOST.replace('-pooler',''));
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const req=id=>{if(id==='server-only')return {};if(id.startsWith('@/')||id.startsWith('.')){let target=id.startsWith('@/')?path.join(ROOT,'src',id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(target))target+='.ts';return load(target);}return require(id);};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:file})(req,mod,mod.exports);return mod.exports;
}
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
(async()=>{
 const db=load('src/lib/server/db.ts'),lease=load('src/lib/server/lease.ts'),limits=load('src/lib/server/limits.ts'),leads=load('src/lib/server/leads.ts');
 await db.initializeDatabase();const sql=db.database(),prefix='test-r2-contract-'+require('node:crypto').randomUUID();
 try{
 await check('actual lead and click read models load on the migrated branch',async()=>{
  assert((await leads.getLeads()).length>0); const clicks=await load('src/lib/server/clicks.ts').getClickAnalytics();assert(Array.isArray(clicks.leads));
 });
 await check('20 simultaneous lease requests have exactly one owner; stale owners cannot release it',async()=>{
  const owners=await Promise.all(Array.from({length:20},()=>lease.acquireLease(prefix)));assert.equal(owners.filter(Boolean).length,1);
  await lease.releaseLease(prefix,'wrong-owner');assert.equal(await lease.acquireLease(prefix),null);await lease.releaseLease(prefix,owners.find(Boolean));assert(await lease.acquireLease(prefix));
 });
 await check('distributed budget atomically allows only five of twenty requests',async()=>{
  const permitted=await Promise.all(Array.from({length:20},()=>limits.takeBudget(prefix,5,60)));assert.equal(permitted.filter(Boolean).length,5);
 });
 await check('failed stats/event transaction rolls back every preceding write',async()=>{
  await assert.rejects(sql.transaction([sql`INSERT INTO gg_lead_events(ref,slug,kind,at) VALUES (${prefix},${prefix},'sent',now())`,sql`SELECT 1/0`]));
  assert.equal((await sql`SELECT ref FROM gg_lead_events WHERE ref=${prefix}`).length,0);
 });
 await check('compare-and-swap edit rejects another tab and stale undo without overwriting',async()=>{
  const lead={name:'Example contract',handle:'@contract',platform:'YouTube',kind:'creator',audience_size:2000,niche:'earnings',us_focus:'yes',contact:'contract@example.invalid',tracked_slug:prefix,stage:'New',signups:0,last_touch:'',notes:''};
  const inserted=await sql`INSERT INTO gg_leads(slug,data) VALUES (${prefix},${JSON.stringify(lead)}::jsonb) RETURNING updated_at::text AS version`;
  const v=inserted[0].version;
  const first=await leads.patchLead(prefix,{stage:'Contacted',expectedVersion:v});
  await assert.rejects(leads.patchLead(prefix,{notes:'stale overwrite',expectedVersion:v}),leads.EditConflict);
  const second=await leads.patchLead(prefix,{stage:'Joined',expectedVersion:first.version});
  await assert.rejects(leads.patchLead(prefix,{stage:'New',expectedStage:'Contacted',expectedVersion:second.version}),leads.EditConflict);
  assert.equal((await sql`SELECT data->>'stage' AS stage FROM gg_leads WHERE slug=${prefix}`)[0].stage,'Joined');
 });
 await check('a reused DB client receives a fresh query timeout after five seconds',async()=>{
  await new Promise(resolve=>setTimeout(resolve,5100));assert.equal((await sql`SELECT 1 AS n`)[0].n,1);
 });
 }finally{
  await sql.transaction([sql`DELETE FROM gg_job_leases WHERE key=${prefix}`,sql`DELETE FROM gg_request_limits WHERE key=${prefix}`,sql`DELETE FROM gg_leads WHERE slug=${prefix}`,sql`DELETE FROM gg_lead_events WHERE ref=${prefix}`]);
 }
 fs.mkdirSync('evidence/r2-fix',{recursive:true});fs.writeFileSync('evidence/r2-fix/postgres-contracts.json',JSON.stringify({at:new Date().toISOString(),database:'isolated preview branch; real Postgres',results},null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(()=>{console.error('Postgres contract runner failed; credential-bearing transport errors withheld.');process.exitCode=1;});
