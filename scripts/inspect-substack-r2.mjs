import fs from 'node:fs/promises';
const d=JSON.parse(await fs.readFile('data/creator-research-r2.json','utf8'));
const profiles=[];
for(const r of d.filter(x=>x.url.includes('substack')&&x.status===200&&!x.url.endsWith('.'))){
 const h=await fs.readFile(r.file,'utf8');const m=h.match(/window\._preloads\s*=\s*JSON\.parse\(("(?:\\.|[^"\\])*")\)/);
 if(!m){console.log('no preload',r.url);continue;}
 const p=JSON.parse(JSON.parse(m[1]));
 const authors=p.publication?.author_name?[]:[];
 const find=(v)=>{if(v&&typeof v==='object'){if(v.owner===true&&v.handle&&v.user_id)authors.push({name:v.name,handle:v.handle,id:v.user_id});for(const x of Object.values(v))find(x)}};find(p);
 const a=authors[0];
 console.log(JSON.stringify({url:r.url,authors:authors.slice(0,2),chat:r.links?.includes('/chat'),size:p.publication?.subscriber_count,body:r.text?.match(/.{0,50}earnings.{0,90}/gi)?.slice(0,2)}));
 if(a)profiles.push(`https://substack.com/@${a.handle}`);
}
await fs.writeFile('data/creator-r2-profile-urls.json',JSON.stringify([...new Set(profiles)],null,2));
