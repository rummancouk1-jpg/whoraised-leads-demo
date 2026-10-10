import fs from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {parseEnv,bypass} from './r2/infra.mjs';
const origin=process.argv[2],headers={'x-vercel-protection-bypass':bypass()},env=parseEnv('.env.local');
const r=await fetch(origin+'/api/auth',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.GG_ACCESS_PASSWORD})});assert.equal(r.status,200);
const cookie=r.headers.get('set-cookie').split(';')[0],root='evidence/r3-release/final-matrix';fs.mkdirSync(root,{recursive:true});
const jobs=['chrome','edge','webkit'].flatMap(engine=>[390,820,1440].map(width=>({engine,width}))),results=[];
const worker=async()=>{while(jobs.length){const {engine,width}=jobs.shift();const code=await new Promise(resolve=>{const child=spawn(process.execPath,['scripts/r3-matrix.mjs',engine,String(width),origin],{env:{...process.env,R3_MATRIX_ROOT:root,R3_SESSION_COOKIE:cookie},stdio:['ignore','pipe','pipe']});let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{log+=d;process.stdout.write(d);});child.on('close',code=>{fs.writeFileSync(`${root}/${engine}-${width}.log`,log);resolve(code);});});results.push({engine,width,code});}};
try{await Promise.all(Array.from({length:6},()=>worker()));const rows=results.flatMap(({engine,width})=>JSON.parse(fs.readFileSync(`${root}/${engine}-${width}/results.json`)));const summary={origin,configurations:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length,checks:rows.reduce((n,r)=>n+r.checks.length,0),screenshots:rows.reduce((n,r)=>n+r.states.length,0),results};fs.writeFileSync(root+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));assert.equal(rows.length,36);assert(rows.every(r=>r.pass));assert(results.every(r=>r.code===0));}finally{await fetch(origin+'/api/auth',{method:'DELETE',headers:{...headers,Origin:origin,Cookie:cookie}});}
