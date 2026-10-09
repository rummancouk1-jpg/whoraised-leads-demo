// Actual preview HTTP write; production connection is used only in read-only transactions.
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {envList,envValue,bypass,parseEnv} from './infra.mjs';
const origin=process.argv[2];
if(!origin||!/^https:\/\/whoraised-leads-demo-[a-z0-9]+-.*\.vercel\.app$/.test(origin))throw new Error('Supply an immutable preview deployment URL.');
const envs=envList();
const p=envValue(envs.find(e=>e.key==='DATABASE_URL'&&e.target.includes('production')));
const d=envValue(envs.find(e=>e.key==='DATABASE_URL'&&e.target.includes('preview')&&!e.gitBranch));
if(new URL(p).hostname.replace('-pooler','')===new URL(d).hostname.replace('-pooler',''))throw new Error('Preview is not isolated.');
const baseline=JSON.parse(await fs.readFile('evidence/r2-fix/production-before.json','utf8'));
async function measure(url){const sql=neon(url);return sql.transaction(baseline.tables.map(({table})=>{if(!/^gg_[a-z_]+$/.test(table))throw new Error('Unexpected table');return sql.query(`SELECT count(*)::int AS n, md5(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text)) AS hash FROM ${table} t`,[]);}),{readOnly:true});}
const before=await measure(p);
const passwordEntry=envs.find(e=>e.key==='GG_ACCESS_PASSWORD'&&e.target.includes('preview')&&!e.gitBranch);
const password=passwordEntry?envValue(passwordEntry):parseEnv('.env.preclient.local').GG_ACCESS_PASSWORD;
const headers={'x-vercel-protection-bypass':bypass(),Origin:origin,'Content-Type':'application/json'};
let cookie='';let original;let slug;let restored=false;
const call=(route,options={})=>fetch(origin+route,{...options,headers:{...headers,...(cookie?{Cookie:cookie}:{}),...options.headers},signal:AbortSignal.timeout(30000)});
try{
 const login=await call('/api/auth',{method:'POST',body:JSON.stringify({password})});if(!login.ok)throw new Error(`Preview login: ${login.status}`);cookie=login.headers.get('set-cookie').split(';')[0];
 const read=await call('/api/leads');if(!read.ok)throw new Error(`Preview read: ${read.status}`);const {leads}=await read.json();const lead=leads[0];slug=lead.tracked_slug;original=lead.notes;
 const marker=`isolation-proof:${randomUUID()}`;
 const patch=await call(`/api/leads/${slug}`,{method:'PATCH',body:JSON.stringify({notes:marker,...(lead.version?{expectedVersion:lead.version}:{})})});if(!patch.ok)throw new Error(`Preview write: ${patch.status}`);
 const updated=(await patch.json()).lead;
 const sql=neon(d);const observed=await sql.transaction([sql`SELECT data->>'notes' AS notes FROM gg_leads WHERE slug=${slug}`],{readOnly:true});
 if(observed[0][0]?.notes!==marker)throw new Error('HTTP write did not reach isolated preview branch.');
 const restore=await call(`/api/leads/${slug}`,{method:'PATCH',body:JSON.stringify({notes:original,...(updated.version?{expectedVersion:updated.version}:{})})});if(!restore.ok)throw new Error('Preview proof cleanup failed.');restored=true;
 const after=await measure(p);
 const comparisons=baseline.tables.map((b,i)=>({table:b.table,preflightCount:b.n,before:before[i][0].n,after:after[i][0].n,countUnchanged:b.n===before[i][0].n&&b.n===after[i][0].n,hashUnchanged:b.hash===before[i][0].hash&&b.hash===after[i][0].hash}));
 const result={at:new Date().toISOString(),preview:origin,distinctEndpoint:true,httpWriteObservedInPreview:true,previewNotesRestored:restored,productionReadOnly:true,tables:comparisons,allUnchanged:comparisons.every(t=>t.countUnchanged&&t.hashUnchanged)};
 await fs.writeFile('evidence/r2-fix/isolation-proof.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.allUnchanged)process.exitCode=1;
}finally{
 if(cookie){if(original!==undefined&&!restored&&slug)console.error('Isolated preview proof notes require cleanup.');await call('/api/auth',{method:'DELETE'}).catch(()=>{});}
}
