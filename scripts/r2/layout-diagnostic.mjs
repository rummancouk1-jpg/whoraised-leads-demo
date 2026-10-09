import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { login, logout, cookieParts, protectionHeaders } from '../design/lib.mjs';
import { bypass } from './infra.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass();
const origin=process.argv[2],cookie=await login(origin),browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:412,height:823},extraHTTPHeaders:protectionHeaders(),serviceWorkers:'block'});
await context.addCookies([{...cookieParts(cookie),url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
await context.addInitScript(()=>{
 window.ggLayout=[];window.ggShifts=[];let previous='';
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.ggShifts.push({at:e.startTime,value:e.value,input:e.hadRecentInput,sources:e.sources.map(s=>({name:s.node?.className,previous:s.previousRect,current:s.currentRect}))});}).observe({type:'layout-shift',buffered:true});
 const sample=()=>{const selectors=['.gg-sync-banner','.gg-hero','.gg-needs','.gg-hero-kicker','.gg-hero-line'];const value=selectors.map(selector=>{const el=document.querySelector(selector),r=el?.getBoundingClientRect();return {selector,top:r?.top,height:r?.height,text:el?.innerText}});const key=JSON.stringify(value);if(key!==previous){window.ggLayout.push({at:performance.now(),value});previous=key;}};
 const observe=new MutationObserver(()=>requestAnimationFrame(sample));observe.observe(document,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>{sample();setInterval(sample,100);});
});
const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(15000);
const values=await page.evaluate(()=>({layout:window.ggLayout,shifts:window.ggShifts}));await fs.writeFile('evidence/r2-fix/layout-diagnostic-throttled.json',JSON.stringify(values,null,2));console.log(JSON.stringify(values.shifts));
await context.close();await browser.close();await logout(origin,cookie);
