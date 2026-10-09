import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseEnv } from './infra.mjs';
const values={...parseEnv('.env.local'),...parseEnv('.env.r2-production-readonly.local')};
const keys=Object.keys(values).filter(k=>/PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL/.test(k)&&values[k]?.length>=8);
const files=[],matches=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(js|map)$/.test(file))files.push(file);}}
walk('.next/static');for(const file of files){const text=fs.readFileSync(file,'utf8');for(const key of keys)if(text.includes(values[key]))matches.push({file,key});}
const result={at:new Date().toISOString(),files:files.length,configuredSecrets:keys.length,matches};
fs.writeFileSync('evidence/r2-fix/client-secret-scan.json',JSON.stringify(result,null,2));assert.equal(matches.length,0);console.log(`${files.length} client files; ${keys.length} configured secrets; zero matches.`);
