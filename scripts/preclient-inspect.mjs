import fs from 'node:fs/promises';
const a=JSON.parse(await fs.readFile('data/creator-list-r2.json','utf8')); console.log('keys',Object.keys(a)); console.log(JSON.stringify(a.archived||a.rejected||[],null,2));
const b=JSON.parse(await fs.readFile('evidence/preclient/data-before.json','utf8'));console.log(b.leads.map(l=>({name:l.name,slug:l.slug,tier:l.tier,fit:l.fit,contact:l.contact,source:l.source}))); 
