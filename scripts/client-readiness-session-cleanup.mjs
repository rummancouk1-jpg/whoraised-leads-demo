import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');const sql=neon(process.env.DATABASE_URL),rows=[];
for(const file of ['evidence/client-readiness/.session','evidence/preclient/.session']){
 try{const cookie=await fs.readFile(file,'utf8'),token=cookie.slice(cookie.indexOf('=')+1).trim(),hash=createHash('sha256').update(token).digest('hex');await sql`DELETE FROM gg_sessions WHERE token_hash=${hash}`;await fs.unlink(file);rows.push({file,removed:true,serverTokenRevoked:true});}catch(e){if(e.code==='ENOENT')rows.push({file,alreadyAbsent:true});else throw e;}
}
await fs.writeFile('evidence/client-readiness/session-cleanup.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',rows,ownerEnvironmentFilesPreserved:true},null,2));console.log('Audit session files removed; their server token hashes revoked.');
