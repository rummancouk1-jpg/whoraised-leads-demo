import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const root='evidence/client-readiness/reddit-alternatives';
const record=JSON.parse(await fs.readFile(root+'/verification.json','utf8'));
const row=record.rows.find(r=>r.subreddit==='stocks');
await fs.writeFile(root+'/verification-before-parser-correction.json',JSON.stringify(record,null,2));
row.members=null;row.primaryStatus='FAIL';row.status='verified_manual_pending';
row.correction={at:new Date().toISOString(),reason:'The broad body-text parser matched a related community count. The current-community sidebar shows activity counts, not a labelled membership count.',renderedActivity:['946K Investors/Traders','6.5K online, analyzing figures']};
const browser=await chromium.launch({channel:'chrome',headless:false});
const context=await browser.newContext({locale:'en-US',viewport:{width:1440,height:960}});
const page=await context.newPage();row.secondary=[];
for(const url of ['https://subredditstats.com/r/stocks','https://www.google.com/search?q=site%3Areddit.com%2Fr%2Fstocks%2F+stocks+members']){
 const entry={url,label:'secondary source',at:new Date().toISOString()};
 try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.getByText(/subscribers|members/i).first().waitFor({timeout:15000}).catch(()=>{});entry.http=response.status();entry.text=await page.locator('body').innerText();entry.file='stocks-secondary-'+row.secondary.length;await page.screenshot({path:root+'/'+entry.file+'.png',fullPage:true});await fs.writeFile(root+'/'+entry.file+'.html',await page.content());entry.verified=entry.http===200&&!/unusual traffic|verify you are human|just a moment|blocked by|access denied/i.test(entry.text)&&/r\/stocks stats/i.test(entry.text)&&/subscribers/i.test(entry.text);}catch(e){entry.verified=false;entry.error=e.message;}
 row.secondary.push(entry);if(entry.verified){row.status='PASS_SECONDARY';row.verification='secondary source';break;}
}
record.at=new Date().toISOString();await fs.writeFile(root+'/verification.json',JSON.stringify(record,null,2));await browser.close();console.log({subreddit:row.subreddit,status:row.status,members:row.members});
