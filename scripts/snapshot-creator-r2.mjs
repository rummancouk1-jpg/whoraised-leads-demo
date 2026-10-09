import fs from 'node:fs/promises';
import env from '@next/env';
import {neon} from '@neondatabase/serverless';
env.loadEnvConfig(process.cwd());
const sql=neon(process.env.DATABASE_URL);
const archive=await sql`SELECT * FROM gg_creator_audit_archive WHERE run_id='demo-creator-audit-2026-10-07' ORDER BY slug`;
const live=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
await fs.mkdir('evidence/creator-audit-r2',{recursive:true});
for(const [name,data] of [['original-archive',archive],['before',live]]) {
 try {await fs.writeFile(`evidence/creator-audit-r2/${name}.json`,JSON.stringify(data,null,2),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
}
console.log(JSON.stringify({live:live.map(x=>({slug:x.slug,name:x.data.name,kind:x.data.kind})),archive:archive.map(x=>({slug:x.slug,name:x.data.name,contact:x.data.contact}))}));
