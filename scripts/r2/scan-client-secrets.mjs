import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseEnv } from './infra.mjs';
const secrets=['.env.local','.env.r2-preview.local','.env.r2-production-readonly.local'].flatMap(scope=>Object.entries(parseEnv(scope)).filter(([key,value])=>/PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL/.test(key)&&value?.length>=8).map(([key,value])=>({scope,key,value})));
const files=[],matches=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(js|map)$/.test(file))files.push(file);}}
walk('.next/static');for(const file of files){const text=fs.readFileSync(file,'utf8');for(const {scope,key,value} of secrets)if(text.includes(value))matches.push({file,scope,key});}
const result={at:new Date().toISOString(),files:files.length,configuredSecrets:secrets.length,matches};
fs.writeFileSync('evidence/r2-fix/client-secret-scan.json',JSON.stringify(result,null,2));assert.equal(matches.length,0);console.log(`${files.length} client files; ${secrets.length} configured secrets; zero matches.`);
