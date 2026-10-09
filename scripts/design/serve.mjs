// Starts `next start` with only the server-side variables the app needs (from the git-ignored preclient env file).
import fs from 'node:fs';import {spawn} from 'node:child_process';
const port=process.argv[2]||'3101';
const env={...process.env};
for(const line of fs.readFileSync('.env.preclient.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)continue;if(/^(DATABASE_URL|GG_ACCESS_PASSWORD|GG_SESSION_SECRET|INSTANTLY_API_KEY|INSTANTLY_CAMPAIGN_ID|CRON_SECRET|PREREG_URL)$/.test(m[1]))env[m[1]]=m[2].replace(/^"|"$/g,'');}
if(process.env.INSTANTLY_STUB==='1'){const cwd=process.cwd().split(String.fromCharCode(92)).join('/');env.INSTANTLY_API_KEY='stub-key-local-harness';env.INSTANTLY_STUB_FILE=cwd+'/evidence/client-readiness/instantly-source.json';env.NODE_OPTIONS=(env.NODE_OPTIONS||'')+' --require="'+cwd+'/scripts/design/instantly-stub.cjs"';}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env,stdio:'inherit'});
child.on('exit',c=>process.exit(c??0));
