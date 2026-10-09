import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');const sql=neon(process.env.DATABASE_URL),root='evidence/client-readiness';
const rows=await sql`SELECT slug,data FROM gg_leads WHERE data->>'notes' LIKE '%Independently loaded and audited for the demo pass.%' ORDER BY slug`;
assert.equal(rows.length,6);
await fs.writeFile(root+'/qa-notes-before.json',JSON.stringify({at:new Date().toISOString(),rows},null,2),{flag:'wx'});
await sql.transaction(rows.flatMap(row=>[sql`INSERT INTO gg_internal_audit(kind,data) VALUES ('removed-client-qa-note',${JSON.stringify(row)}::jsonb)`,sql`UPDATE gg_leads SET data=jsonb_set(data,'{notes}',to_jsonb(replace(data->>'notes','Independently loaded and audited for the demo pass. ','')::text)),updated_at=now() WHERE slug=${row.slug} AND data=${JSON.stringify(row.data)}::jsonb`]));
const after=await sql`SELECT slug,data FROM gg_leads WHERE slug=ANY(${rows.map(r=>r.slug)}) ORDER BY slug`;
for(let i=0;i<rows.length;i++){const expected={...rows[i].data,notes:rows[i].data.notes.replace('Independently loaded and audited for the demo pass. ','')};assert.deepEqual(after[i].data,expected);}
await fs.writeFile(root+'/qa-notes-cleanup.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',changed:rows.map(r=>r.slug),otherFieldsPreserved:true,internalLog:'gg_internal_audit / removed-client-qa-note'},null,2));console.log('Removed audit wording from six notes; all other fields preserved.');
