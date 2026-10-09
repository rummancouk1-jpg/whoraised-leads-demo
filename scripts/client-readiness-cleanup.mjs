import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const sql=neon(process.env.DATABASE_URL),root='evidence/client-readiness';
await fs.mkdir(root,{recursive:true});
const tables=await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
const clicks=await sql`SELECT * FROM gg_clicks ORDER BY id`;
const leads=await sql`SELECT * FROM gg_leads ORDER BY slug`;
await fs.writeFile(root+'/before-cleanup.json',JSON.stringify({at:new Date().toISOString(),tables,clicks,leads},null,2),{flag:'wx'});
const proof=JSON.parse(await fs.readFile('evidence/preclient/click-proof.json','utf8'));
const ids=proof.db.map(r=>String(r.id));
assert.deepEqual(ids.sort(),['11','12']);
const affected=clicks.filter(r=>ids.includes(String(r.id)));
assert.equal(affected.length,2);
assert(affected.every(r=>r.slug===proof.slug&&!r.is_test&&!r.is_example&&r.platform_guess==='phone'));
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS gg_internal_audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, recorded_at timestamptz NOT NULL DEFAULT now(), kind text NOT NULL, data jsonb NOT NULL)`,
  sql`INSERT INTO gg_internal_audit(kind,data) SELECT 'removed-preclient-audit-click',to_jsonb(c) FROM gg_clicks c WHERE id IN (11,12)`,
  sql`DELETE FROM gg_clicks WHERE id IN (11,12) AND slug=${proof.slug}`,
]);
const qa=JSON.parse(await fs.readFile('evidence/preclient/data-mutation-backup.json','utf8')).filter(l=>l.tracked_slug==='example-click-proof-20261007');
for(const lead of qa) await sql`INSERT INTO gg_internal_audit(kind,data) VALUES ('archived-test-lead',${JSON.stringify(lead)}::jsonb)`;
const after=await sql`SELECT count(*)::int AS total,count(*) FILTER (WHERE NOT is_test AND NOT is_example)::int AS real,count(*) FILTER (WHERE is_test OR is_example)::int AS tests FROM gg_clicks`;
await fs.writeFile(root+'/cleanup.json',JSON.stringify({at:new Date().toISOString(),removedIds:ids,backup:'before-cleanup.json',archivedQA:qa.map(l=>l.tracked_slug),after,tables},null,2));
console.log({removedIds:ids,after,tables});
