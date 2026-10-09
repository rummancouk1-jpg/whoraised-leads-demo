import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const root='evidence/client-readiness/reddit-alternatives';await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false});
const context=await browser.newContext({locale:'en-US',viewport:{width:1440,height:960},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'});const page=await context.newPage();const results=[];
for(const sub of ['Daytrading','options','StockMarket','stocks','thetagang']) {
  const row={subreddit:sub,at:new Date().toISOString(),url:`https://www.reddit.com/r/${sub}/`,method:'Fresh headed Chrome, desktop UA, en-US; no reused profile',authenticated:false};
  try {
    const response=await page.goto(row.url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.getByText(/members|weekly visitors|readers/i).first().waitFor({timeout:15000}).catch(()=>{});
    row.http=response.status();row.finalUrl=page.url();row.title=await page.title();
    row.text=await page.locator('body').innerText();
    await page.screenshot({path:root+'/'+sub+'.png',fullPage:true});
    await fs.writeFile(root+'/'+sub+'.html',await page.content());
    row.evidence=[sub+'.html',sub+'.png'];
    row.blocked=/blocked|network security|whoa there|log in to continue|Too Many Requests/i.test(row.text);
    // Only the current community's sidebar qualifies; related-community cards have their own counts.
    const sidebar=page.locator('shreddit-subreddit-header');
    const sidebarText=await sidebar.innerText().catch(()=>'');
    row.members=sidebarText.match(/[\d.,]+\s*[kKmM]?\s*(members|readers)/i)?.[0]??null;
    row.renderedActivity=await sidebar.locator('[slot="weekly-active-users-count"], [slot="weekly-contributions-count"]').allTextContents();
    row.status=row.http===200&&!row.blocked&&row.members&&new RegExp(sub,'i').test(row.text)?'PASS':'FAIL';
  } catch(e) {row.status='FAIL';row.error=e.message;}
  if(row.status!=='PASS') {
    row.primaryStatus=row.status;row.secondary=[];
    for(const url of [`https://subredditstats.com/r/${sub}`,`https://www.google.com/search?q=site%3Areddit.com%2Fr%2F${sub}%2F+${sub}+members`]){
      const entry={url,label:'secondary source',at:new Date().toISOString()};
      try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.getByText(/subscribers|members/i).first().waitFor({timeout:15000}).catch(()=>{});entry.http=r.status();entry.text=await page.locator('body').innerText();entry.file=sub+'-secondary-'+row.secondary.length;
      await page.screenshot({path:root+'/'+entry.file+'.png',fullPage:true});await fs.writeFile(root+'/'+entry.file+'.html',await page.content());
      entry.verified=entry.http===200&&!/unusual traffic|verify you are human|just a moment|blocked by|access denied/i.test(entry.text)&&new RegExp(sub,'i').test(entry.text)&&(/subscribers|members/i.test(entry.text)||new RegExp('reddit.com/r/'+sub,'i').test(entry.text));
      }catch(e){entry.error=e.message;entry.verified=false;}
      row.secondary.push(entry);if(entry.verified){row.status='PASS_SECONDARY';row.verification='secondary source';break;}
    }
    if(row.status!=='PASS_SECONDARY')row.status='verified_manual_pending';
  }
  results.push(row);console.log(sub,row.status,row.http);
  await fs.writeFile(root+'/verification.json',JSON.stringify({at:new Date().toISOString(),oauthCredentialsAvailable:false,rows:results},null,2));
}
await browser.close();
