import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export const project=JSON.parse(fs.readFileSync('.vercel/project.json','utf8'));
const globalRoot=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim();
export function command(tool,args,input){
 const entry=path.join(globalRoot,tool==='vercel'?'vercel/dist/vc.js':'neon/dist/cli.js');
 try{return execFileSync(process.execPath,[entry,...args],{encoding:'utf8',input,timeout:120000,stdio:['pipe','pipe','pipe']}).trim();}
 catch{throw new Error(`${tool} command failed; output withheld to protect credentials`);}
}
export function api(endpoint,method='GET',body){return JSON.parse(command('vercel',['api',`${endpoint}${endpoint.includes('?')?'&':'?'}teamId=${project.orgId}`,'--raw',...(body?['-X',method,'--input','-']:[])],body?JSON.stringify(body):undefined));}
export function envValue(entry){return api(`/v1/projects/${project.projectId}/env/${entry.id}`).value;}
export function envList(){return api(`/v9/projects/${project.projectId}/env`).envs;}
export function bypass(){return Object.keys(api(`/v9/projects/${project.projectId}`).protectionBypass??{})[0];}
export function parseEnv(file){return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).flatMap(line=>{const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)return [];let v=m[2];try{v=JSON.parse(v);}catch{v=v.replace(/^['"]|['"]$/g,'');}return [[m[1],v]];}));}
