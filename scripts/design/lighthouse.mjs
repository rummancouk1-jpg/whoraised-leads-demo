// Lighthouse (mobile + desktop) for the three signed-in pages. usage: node lighthouse.mjs [origin]
import fs from 'node:fs/promises';import lighthouse from 'lighthouse';import {launch} from 'chrome-launcher';import puppeteer from 'puppeteer-core';import {root,login,logout,protectionHeaders,cookieParts} from './lib.mjs';
const origin=process.argv[2]||'http://localhost:3101';const dir=root+'/lighthouse';await fs.mkdir(dir,{recursive:true});
const cookie=await login(origin);const results=[];
const chrome=await launch({...(process.platform==='win32'?{chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),chromeFlags:['--headless=new','--no-sandbox']});
const secretValues=new Set([cookie,cookieParts(cookie).value,process.env.VERCEL_AUTOMATION_BYPASS_SECRET,process.env.GG_ACCESS_PASSWORD].filter(Boolean));
const redact=text=>[...secretValues].reduce((s,key)=>s.replaceAll(key,'[redacted]'),text);
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
await browser.setCookie({...cookieParts(cookie),url:origin,httpOnly:true,secure:true,sameSite:'Lax'});
const preflight=await browser.newPage();await preflight.setExtraHTTPHeaders({...protectionHeaders(),'x-vercel-set-bypass-cookie':'true'});
const check=await preflight.goto(origin+'/api/leads');if(check.status()!==200)throw new Error('Authenticated Lighthouse preflight failed.');
await preflight.close();
for(const c of await browser.cookies())if(c.value.length>8)secretValues.add(c.value);
try{for(const formFactor of ['mobile','desktop'])for(const path of ['/','/pipeline','/email']){
  const key=`${formFactor}-${path==='/'?'home':path.slice(1)}`;
  const settings={port:chrome.port,disableStorageReset:true,output:['json','html'],onlyCategories:['performance','accessibility','best-practices','seo'],extraHeaders:protectionHeaders(),formFactor,...(formFactor==='desktop'?{screenEmulation:{mobile:false,width:1440,height:960,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})};
  const result=await lighthouse(origin+path,settings);const lhr=result.lhr;
  const scores=Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)]));
  const metrics=Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(id=>[id,lhr.audits[id].displayValue]));
  const row={key,at:new Date().toISOString(),url:origin+path,scores,metrics,status:Object.values(scores).every(s=>s>=90)?'PASS':'FAIL',failedAudits:Object.entries(lhr.audits).filter(([,v])=>v.score!==null&&v.score<1&&v.scoreDisplayMode!=='informative'&&v.scoreDisplayMode!=='notApplicable').map(([id,v])=>({id,title:v.title,score:v.score,display:v.displayValue,savingsMs:v.details?.overallSavingsMs??v.metricSavings?.LCP??0}))};results.push(row);
  for(let i=0;i<result.report.length;i++)await fs.writeFile(`${dir}/lighthouse-${key}.${i===0?'json':'html'}`,redact(result.report[i]));
  await fs.writeFile(root+'/lighthouse.json',redact(JSON.stringify(results,null,2)));console.log(key,JSON.stringify(scores),row.status,JSON.stringify(metrics));
}}finally{await browser.disconnect();await chrome.kill();await logout(origin,cookie);}
