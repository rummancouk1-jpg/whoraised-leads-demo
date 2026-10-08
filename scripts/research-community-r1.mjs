import fs from 'node:fs/promises';
const records=[];
for (const [code,owner] of [['Dd8njgQwEQ','https://tanukitrade.substack.com/about'],['unusualwhales','https://unusualwhales.com/contacts'],['gVyVJWqt9m','https://www.reddit.com/r/Daytrading/']]) {
 const source=`https://discord.com/api/v10/invites/${code}?with_counts=true`;
 const r=await fetch(source,{signal:AbortSignal.timeout(20000)}); if(!r.ok)throw Error(`${code}: ${r.status}`);
 const d=await r.json();records.push({code,owner,source,checkedAt:new Date().toISOString(),name:d.guild.name,members:d.approximate_member_count,online:d.approximate_presence_count});
}
const h=await(await fetch('https://dailygram.me/x/unusual_whales')).text();
const xLinks=[...new Set(h.match(/https:\/\/x\.com\/unusual_whales\/status\/\d+/g)||[])];
records.push({platform:'X',source:'https://dailygram.me/x/unusual_whales',checkedAt:new Date().toISOString(),links:xLinks});
await fs.writeFile('data/creator-community-research-r1.json',JSON.stringify(records,null,2));console.log(records);
