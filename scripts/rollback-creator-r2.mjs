// Dry-run by default. Restore the pre-R2 research/list while retaining later CRM edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import { neon } from '@neondatabase/serverless';
env.loadEnvConfig(process.cwd());
const sql=neon(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
const audit=JSON.parse(await fs.readFile('data/creator-list-r2.json','utf8'));
const archived=await sql`SELECT slug,data FROM gg_creator_audit_archive WHERE run_id=${audit.run_id}`;
assert(archived.length,'No R2 archive exists.');
const before=new Map(archived.filter(r=>r.data._r2_was_live).map(r=>[r.slug,r.data]));
const current=await sql`SELECT slug,data FROM gg_leads`;
const additions=current.filter(r=>audit.accepted.some(l=>l.tracked_slug===r.slug)&&!before.has(r.slug));
const preserve=['stage','signups','last_touch','notes'];
const queries=[];
for(const row of additions){
 const inserted=audit.accepted.find(l=>l.tracked_slug===row.slug);
 for(const field of preserve)assert.deepEqual(row.data[field],inserted[field],`Later CRM edits exist on ${row.slug}; retain this row and resolve manually before rollback.`);
 queries.push(sql`DELETE FROM gg_leads WHERE slug=${row.slug} AND data=${JSON.stringify(row.data)}::jsonb`);
}
for(const [slug,data] of before){
 if(!audit.accepted.some(l=>l.tracked_slug===slug)&&current.some(r=>r.slug===slug))continue;
 const original={...data};delete original._r2_was_live;delete original.archive_reason;
 queries.push(sql`INSERT INTO gg_leads(slug,data) VALUES (${slug},${JSON.stringify(original)}::jsonb) ON CONFLICT(slug) DO UPDATE SET data=${JSON.stringify(original)}::jsonb || jsonb_build_object('stage',gg_leads.data->'stage','signups',gg_leads.data->'signups','last_touch',gg_leads.data->'last_touch','notes',gg_leads.data->'notes'),updated_at=now()`);
}
const plan={run_id:audit.run_id,restore_before_rows:before.size,remove_untouched_additions:additions.map(r=>r.slug),preserve,mode:process.argv.includes('--apply')?'apply':'dry-run'};
if(process.argv.includes('--apply'))await sql.transaction(queries);
await fs.writeFile('evidence/creator-audit-r2/rollback-check.json',JSON.stringify(plan,null,2));
console.log(JSON.stringify(plan,null,2));
