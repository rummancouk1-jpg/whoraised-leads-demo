import fs from 'node:fs/promises';
const original=JSON.parse(await fs.readFile('data/creator-list-r1-audit.json','utf8')).evidence;
const root='evidence/creator-audit';await fs.mkdir(root,{recursive:true});
function walk(x,key,out=[]){if(!x||typeof x!=='object')return out;if(x[key])out.push(x[key]);for(const v of Object.values(x))if(v&&typeof v==='object')walk(v,key,out);return out;}
const results=[];
for(let i=0;i<original.length;i+=4){
 await Promise.all(original.slice(i,i+4).map(async r=>{
  const item={slug:r.slug,source_url:r.profile,verified_at:new Date().toISOString()};
  try{
   const response=await fetch(r.profile,{signal:AbortSignal.timeout(25000)});const html=await response.text();
   item.http_status=response.status;item.final_url=response.url;
   await fs.writeFile(`${root}/${r.slug}.html`,html);
   let content=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
   item.links=[...html.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1]).filter(v=>/contact|about|sponsor|business|advert|partner/i.test(v)).slice(0,40);
   if(r.profile.includes('youtube.com')){
    const match=html.match(/var ytInitialData = (.*?);<\/script>/);
    if(!match)throw Error('Public channel data unavailable');
    const data=JSON.parse(match[1]);
    const description=data.metadata?.channelMetadataRenderer?.description||'';
    content=description+' '+walk(data.contents,'title').map(x=>typeof x==='string'?x:x.content||x.runs?.map(r=>r.text).join('')||'').filter(Boolean).slice(0,30).join(' | ');
    item.title=data.metadata?.channelMetadataRenderer?.title;
    item.links.push(...[...description.matchAll(/https?:\/\/[^\s<>]+/g)].map(m=>m[0]));
    item.audience_labels=walk(data.header,'metadataRows');
   }
   item.content=content.slice(0,14000);
   item.emails=[...new Set(content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])];
   item.source_url_live=response.ok&&!/page not found|this page is unavailable|invite invalid|invite expired|something went wrong/i.test(content)?'y':'n';
  }catch(e){item.source_url_live='n';item.error=e.message;}
  results.push(item);
 }));
 await fs.writeFile('data/creator-audit-source-loads.json',JSON.stringify(results,null,2));
 console.log(`Fresh source loads ${Math.min(i+4,original.length)}/${original.length}`);
}
