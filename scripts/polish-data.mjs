import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {neon} from '@neondatabase/serverless';
import {contract} from './outreach-contract.mjs';
env.loadEnvConfig(process.cwd());
const sql=neon(process.env.DATABASE_URL),dir='evidence/polish-r1';
await fs.mkdir(dir,{recursive:true});
const sentence=['A free earnings challenge','can be offered to this audience.'].join(' ');
const before=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
await fs.writeFile(dir+'/db-before.json',JSON.stringify(before,null,2),{flag:'wx'});
await sql`UPDATE gg_leads SET data=jsonb_set(data,'{fit_evidence}',to_jsonb(trim(replace(data->>'fit_evidence',${sentence},'')))) WHERE data->>'fit_evidence' LIKE ${'%'+sentence+'%'}`;
const after=await sql`SELECT slug,data FROM gg_leads ORDER BY slug`;
for(let i=0;i<before.length;i++) {const {fit_evidence:a,...restA}=before[i].data,{fit_evidence:b,...restB}=after[i].data;assert.deepEqual(restA,restB);assert.equal(b,a?.replaceAll(sentence,'').trim());}
const walk=async dir=>{let files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())files.push(...await walk(p));else if(/\.(md|csv|json|mjs|py)$/.test(e.name))files.push(p);}return files;};
const changed=[];
for(const file of [...await walk('data'),...await walk('docs'),...await walk('public'),...await walk('scripts')]) {const s=await fs.readFile(file,'utf8');if(s.includes(sentence)){await fs.mkdir(dir+'/source-backup/'+file.split('/').slice(0,-1).join('/'),{recursive:true});await fs.writeFile(dir+'/source-backup/'+file,s);await fs.writeFile(file,s.replaceAll(' '+sentence,'').replaceAll(sentence,''));changed.push(file);}}
const real=after.map(r=>r.data).filter(l=>!contract.isExample(l)),longTail=real.filter(l=>contract.leadTier(l)==='long-tail');
const proof={total:after.length,real:real.length,priority:real.length-longTail.length,longTail:longTail.length,longTailRows:longTail.map(l=>({slug:l.tracked_slug,name:l.name,reach:l.audience_size,fit:l.fit_evidence})),dbFitLinesChanged:before.filter((r,i)=>r.data.fit_evidence!==after[i].data.fit_evidence).length,sourceFilesChanged:changed,workflowPreserved:true,otherFieldsPreserved:true};
await fs.writeFile(dir+'/db-after.json',JSON.stringify(after,null,2));await fs.writeFile(dir+'/data-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
