// SELECT-only shared-state comparison. No initialization/migration/application imports.
import fs from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import {loadEnv} from '../design/lib.mjs';
const dir='evidence/r2-independent';
const baseline=JSON.parse(await fs.readFile(dir+'/shared-baseline.json','utf8'));
const sql=neon(loadEnv().DATABASE_URL);
const variants=[];
for(const expression of ['to_jsonb(t)::text','row_to_json(t)::text','t::text'])for(const separator of ["''","'|'","E'\\n'"]){
 variants.push({expression,separator,alias:'hash'+variants.length});
}
const queries=baseline.tables.map(row=>{
 if(!/^gg_[a-z_]+$/.test(row.table_name))throw new Error('Unexpected table');
 return `SELECT count(*)::int AS n, ${variants.map(v=>`md5(string_agg(${v.expression},${v.separator} ORDER BY ${v.expression})) AS ${v.alias}`).join(',')} FROM ${row.table_name} t`;
});
const rows=await sql.transaction(queries.map(q=>sql.query(q,[])),{readOnly:true});
const tables=baseline.tables.map((b,i)=>{const r=rows[i][0];const match=variants.find(v=>r[v.alias]===b.hash);return {table:b.table_name,before:b.n,after:r.n,countEqual:b.n===r.n,hashEqual:!!match,matchingVariant:match??null,observed:r};});
const out={at:new Date().toISOString(),readOnly:true,queries,tables,allUnchanged:tables.every(t=>t.countEqual&&t.hashEqual)};
await fs.writeFile(dir+'/shared-after.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({at:out.at,allUnchanged:out.allUnchanged,tables:tables.map(({table,before,after,countEqual,hashEqual,matchingVariant})=>({table,before,after,countEqual,hashEqual,matchingVariant}))},null,2));
