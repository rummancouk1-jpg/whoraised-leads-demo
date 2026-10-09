import fs from 'node:fs';
import {neon} from '@neondatabase/serverless';
import {parseEnv} from './infra.mjs';
try {
 const env=parseEnv('.env.local');
 if(env.GG_DB_ENVIRONMENT!=='preview'||new URL(env.DATABASE_URL).hostname.replace('-pooler','')===env.GG_PRODUCTION_DB_HOST.replace('-pooler',''))throw new Error('Preview isolation required.');
 const sql=neon(env.DATABASE_URL);
 const results=await sql.transaction([sql.query("SELECT trigger,started_at,finished_at,ok,error FROM gg_sync_runs WHERE trigger='cron' ORDER BY started_at DESC LIMIT 4",[])],{readOnly:true});
 const proof={at:new Date().toISOString(),database:'isolated preview only; SELECT read-only',runs:results[0]};
 fs.writeFileSync('evidence/r2-fix/scheduled-runs-final.json',JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof));
} catch { console.error('Scheduler proof failed; credential-bearing transport output withheld.');process.exitCode=1; }
