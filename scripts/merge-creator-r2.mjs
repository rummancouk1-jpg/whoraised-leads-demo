import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import { neon } from '@neondatabase/serverless';
import { checkAllContacts } from './contact-evidence-gate.mjs';
import { contract } from './outreach-contract.mjs';
env.loadEnvConfig(process.cwd());
const audit=JSON.parse(await fs.readFile('data/creator-list-r2.json','utf8'));
const baseline=JSON.parse(await fs.readFile('data/creator-demo-audit.json','utf8'));
const sql=neon(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
await checkAllContacts(audit.accepted,audit.contact_manifest);
contract.parseLeadsCsv(contract.exportCsv(audit.accepted));
const preserve=['stage','signups','last_touch','notes'];
const accepted=new Set(audit.accepted.map(l=>l.tracked_slug));
const removalSlugs=baseline.accepted.map(l=>l.tracked_slug).filter(s=>!accepted.has(s));
const before=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const removalReasons=Object.fromEntries(removalSlugs.map(slug=>[slug,audit.decisions.find(d=>d.slug===slug)?.reason||'Unresolved evidence under R2 rules']));
const paid=audit.paid_media.map(l=>l.slug);
const plan={run_id:audit.run_id,accepted:audit.count,groups:audit.groups,removals:before.filter(r=>removalSlugs.includes(r.slug)).map(r=>({name:r.data.name,slug:r.slug,reason:removalReasons[r.slug]}))};
if(!process.argv.includes('--apply')) {console.log(JSON.stringify(plan,null,2));process.exit(0);}
assert.equal((await sql`SELECT count(*)::int n FROM gg_creator_audit_archive WHERE run_id=${audit.run_id}`)[0].n,0,'R2 already applied; use its rollback before reapplying.');
await fs.writeFile('evidence/creator-audit-r2/merge-before.json',JSON.stringify(before,null,2),{flag:'wx'});
const queries=[
 sql`SELECT slug FROM gg_leads FOR UPDATE`,
 // Capture old archived rows too; replace with current DB state where the row is live.
 sql`INSERT INTO gg_creator_audit_archive(run_id,slug,data)
 SELECT ${audit.run_id},slug,data || jsonb_build_object('_r2_was_live',false,'archive_reason',CASE WHEN slug=ANY(${paid}::text[]) THEN 'paid-media only' ELSE 'Not qualified in R2; original archive preserved' END)
 FROM gg_creator_audit_archive WHERE run_id='demo-creator-audit-2026-10-07' ON CONFLICT DO NOTHING`,
 sql`INSERT INTO gg_creator_audit_archive(run_id,slug,data)
 SELECT ${audit.run_id},slug,data || jsonb_build_object('_r2_was_live',true,'archive_reason',CASE WHEN slug=ANY(${paid}::text[]) THEN 'paid-media only' WHEN slug=ANY(${removalSlugs}::text[]) THEN ${JSON.stringify(removalReasons)}::jsonb->>slug ELSE 'R2 rollback backup; retained' END)
 FROM gg_leads ON CONFLICT(run_id,slug) DO UPDATE SET data=EXCLUDED.data`,
 sql`DELETE FROM gg_leads WHERE slug=ANY(${removalSlugs}::text[])`,
];
for(const lead of audit.accepted){
 const research=Object.fromEntries(Object.entries(lead).filter(([key])=>!preserve.includes(key)));
 queries.push(sql`INSERT INTO gg_leads(slug,data) VALUES (${lead.tracked_slug},${JSON.stringify(lead)}::jsonb) ON CONFLICT(slug) DO UPDATE SET data=gg_leads.data || ${JSON.stringify(research)}::jsonb,updated_at=now()`);
}
await sql.transaction(queries);
const after=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
const archive=await sql`SELECT slug,data FROM gg_creator_audit_archive WHERE run_id=${audit.run_id} ORDER BY slug`;
const live=new Map(after.map(r=>[r.slug,r.data]));
for(const row of archive.filter(r=>r.data._r2_was_live)){
 const target=live.get(row.slug)||row.data;
 for(const field of preserve)assert.deepEqual(target[field],row.data[field],`${row.slug}: ${field} changed`);
}
for(const lead of audit.accepted){assert(live.has(lead.tracked_slug));for(const field of Object.keys(lead).filter(k=>!preserve.includes(k)))assert.deepEqual(live.get(lead.tracked_slug)[field],lead[field]);}
for(const row of archive.filter(r=>!r.data._r2_was_live&&accepted.has(r.slug)))for(const field of preserve)assert.deepEqual(live.get(row.slug)[field],row.data[field],`Restored state changed: ${row.slug}`);
const proof={...plan,checked_at:new Date().toISOString(),before:before.length,after:after.length,archived:archive.length,preserved_fields:preserve,all_existing_state_preserved:true,all_research_matches:true};
await fs.writeFile('evidence/creator-audit-r2/merge-after.json',JSON.stringify(after,null,2));
await fs.writeFile('evidence/creator-audit-r2/merge-proof.json',JSON.stringify(proof,null,2));
await fs.writeFile('evidence/creator-audit-r2/r2-archive.json',JSON.stringify(archive,null,2));
await fs.writeFile('data/creator-list-r2.csv',contract.exportCsv(audit.accepted));
console.log(JSON.stringify(proof,null,2));
