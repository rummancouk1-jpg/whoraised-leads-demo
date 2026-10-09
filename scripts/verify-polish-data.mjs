import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';import {neon} from '@neondatabase/serverless';
env.loadEnvConfig(process.cwd());const sql=neon(process.env.DATABASE_URL),before=JSON.parse(await fs.readFile('evidence/polish-r1/db-before.json','utf8')),after=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
assert.deepEqual(after,before);const sentence=['A free earnings challenge','can be offered to this audience.'].join(' ');assert(after.every(r=>!String(r.data.fit_evidence).includes(sentence)));
const files=(await fs.readdir('data')).filter(n=>n.endsWith('.csv'));for(const file of files){const raw=await fs.readFile('data/'+file,'utf8');assert(!raw.includes(sentence));}
await fs.writeFile('evidence/polish-r1/final-data-proof.json',JSON.stringify({records:after.length,workflowAndAllDbFieldsUnchanged:true,boilerplateAbsent:true,csvFilesChecked:files,checkedAt:new Date().toISOString()},null,2));console.log('PASS: DB unchanged, all CSV fit lines clean');
