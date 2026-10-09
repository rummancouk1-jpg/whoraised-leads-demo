import fs from 'node:fs/promises';
const records=JSON.parse(await fs.readFile('data/creator-youtube-research-r1.json','utf8'));
const results=[];
for(let i=0;i<records.length;i+=4) {await Promise.all(records.slice(i,i+4).map(async r=>{
 const size=r.metadata?.find(v=>v.includes('subscribers')); const m=size?.match(/([\d.]+)([KM]?)/);const n=m?Number(m[1])*(m[2]==='K'?1000:m[2]==='M'?1e6:1):0;
 if(n<5000||n>500000||!r.videos?.[0])return;
 const v=r.videos[0];if(!v.labels.some(l=>/^([1-9]|[12]\d)d ago$|^[1-3]w ago$|^\d+h ago$/.test(l)))return;
 try {const source=`https://www.youtube.com/watch?v=${v.id}`;const html=await(await fetch(source,{signal:AbortSignal.timeout(20000)})).text();const m=html.match(/var ytInitialPlayerResponse = (.*?);/);const d=null;const micro=d?.microformat?.playerMicroformatRenderer;results.push({...r,audienceSize:n,activity:{source,date:micro?.publishDate||html.match(/itemprop="datePublished" content="([^"]+)"/)?.[1],title:v.title,relative:v.labels.at(-1)},description:d?.videoDetails?.shortDescription?.slice(0,1200)});}catch(e){results.push({...r,audienceSize:n,error:e.message});}
 }));}
await fs.writeFile('data/creator-youtube-verified-r1.json',JSON.stringify(results,null,2));console.log(results.map(r=>`${r.name} ${r.audienceSize} ${r.activity?.date||r.error}`).join('\n'));

