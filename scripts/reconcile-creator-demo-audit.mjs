import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const audit=JSON.parse(await fs.readFile('data/creator-demo-audit.json','utf8'));
assert.equal(audit.accepted.length,50);
const sql=neon(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
const runId='demo-creator-audit-2026-10-07';
const before=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
await fs.mkdir('evidence/demo-readiness',{recursive:true});
const beforePath='evidence/demo-readiness/pipeline-before-audit.json';
try{await fs.writeFile(beforePath,JSON.stringify(before,null,2),{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}
const removals=[...audit.records.filter(r=>r.decision==='remove').map(r=>r.lead.tracked_slug),'audit-zacksinvestmentresearch','audit-investorsbusinessdaily'];
const queries=[
sql`CREATE TABLE IF NOT EXISTS gg_creator_audit_archive (run_id text NOT NULL, slug text NOT NULL, data jsonb NOT NULL, archived_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(run_id,slug))`,
sql`INSERT INTO gg_creator_audit_archive(run_id,slug,data) SELECT ${runId},slug,data FROM gg_leads WHERE slug=ANY(${removals}::text[]) ON CONFLICT DO NOTHING`,
sql`DELETE FROM gg_leads WHERE slug=ANY(${removals}::text[])`,
];
for(const lead of audit.accepted){
 const research=Object.fromEntries(Object.entries(lead).filter(([key])=>!['stage','signups','last_touch','notes'].includes(key)));
 // Merge research into current JSON at execution time: concurrent CRM edits survive.
 queries.push(sql`INSERT INTO gg_leads(slug,data) VALUES (${lead.tracked_slug},${JSON.stringify(lead)}::jsonb) ON CONFLICT(slug) DO UPDATE SET data=gg_leads.data || ${JSON.stringify(research)}::jsonb, updated_at=now()`);
}
await sql.transaction(queries);
const after=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const archived=await sql`SELECT slug,data FROM gg_creator_audit_archive WHERE run_id=${runId} ORDER BY slug`;
const bySlug=new Map(after.map(r=>[r.slug,r.data]));const archives=new Map(archived.map(r=>[r.slug,r.data]));
for(const row of before){
 const data=bySlug.get(row.slug)||archives.get(row.slug);assert(data,'State lost: '+row.slug);
 for(const key of ['stage','signups','last_touch','notes'])assert.deepEqual(data[key],row.data[key],`${row.slug}: ${key} changed`);
}
assert.equal(audit.accepted.filter(l=>bySlug.has(l.tracked_slug)).length,50);
const proof={checkedAt:new Date().toISOString(),runId,before:before.length,after:after.length,realAccepted:50,removedArchived:archived.length,preservedFields:['stage','signups','last_touch','notes'],allExistingStatePreserved:true,retained:audit.retained,removed:audit.removed,backfilled:audit.backfilled};
await fs.writeFile('evidence/demo-readiness/pipeline-audit-preservation.json',JSON.stringify(proof,null,2));
await fs.writeFile('evidence/demo-readiness/pipeline-after-audit.json',JSON.stringify(after,null,2));
console.log(JSON.stringify(proof));
