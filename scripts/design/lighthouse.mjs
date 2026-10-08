// Lighthouse (mobile + desktop) for the three signed-in pages. usage: node lighthouse.mjs [origin]
import fs from 'node:fs/promises';import lighthouse from 'lighthouse';import {launch} from 'chrome-launcher';import {root,login,logout} from './lib.mjs';
const origin=process.argv[2]||'http://localhost:3101';const dir=root+'/lighthouse';await fs.mkdir(dir,{recursive:true});
const cookie=await login(origin);const results=[];
const chrome=await launch({chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless=new','--no-sandbox']});
try{for(const formFactor of ['mobile','desktop'])for(const path of ['/','/pipeline','/email']){
  const key=`${formFactor}-${path==='/'?'home':path.slice(1)}`;
  const settings={port:chrome.port,output:['json','html'],onlyCategories:['performance','accessibility','best-practices'],extraHeaders:{Cookie:cookie},formFactor,...(formFactor==='desktop'?{screenEmulation:{mobile:false,width:1440,height:960,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})};
  const result=await lighthouse(origin+path,settings);const lhr=result.lhr;
  const scores=Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)]));
  const metrics=Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(id=>[id,lhr.audits[id].displayValue]));
  const row={key,at:new Date().toISOString(),url:origin+path,scores,metrics,status:scores.performance>=90&&scores.accessibility===100&&scores['best-practices']===100?'PASS':'FAIL',failedAudits:Object.entries(lhr.audits).filter(([,v])=>v.score!==null&&v.score<1&&v.scoreDisplayMode!=='informative'&&v.scoreDisplayMode!=='notApplicable').map(([id,v])=>({id,title:v.title,score:v.score,display:v.displayValue}))};results.push(row);
  for(let i=0;i<result.report.length;i++)await fs.writeFile(`${dir}/lighthouse-${key}.${i===0?'json':'html'}`,result.report[i].replaceAll(cookie,'[redacted-session]'));
  await fs.writeFile(root+'/lighthouse.json',JSON.stringify(results,null,2).replaceAll(cookie,'[redacted-session]'));console.log(key,JSON.stringify(scores),row.status,JSON.stringify(metrics));
}}finally{await chrome.kill();await logout(origin,cookie);}
