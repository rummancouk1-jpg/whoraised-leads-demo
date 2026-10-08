// Public, read-only research. Never logs contacts or accesses the production database.
import fs from 'node:fs/promises';
const domains = `tanukitrade optionsmonitor dynalogic themultiplier theowave optionstrategist coffeegroundstrading halaltrader optionsoracle yougotthistrading tacticalallocationdesk lighthousemacro michaeljburry paretoinvestor tradeintelligent marlincapital jminvestments denisdoroshenko onlyfin theregimereport chartnotes dailystockpick tradingwarzcpa tradingthemarket traderferg thetradingresource thepatientinvestor alphatrends stockmarketnerd deepwaterassetmanagement thecompoundersclub thediff stockanalysiscompilation tombruni marktmelder capitalmind spotgamma tier1alpha netinterest paidtofade thedailychart chartingalpha adamancini adamgrimes peterlbrandt allstarcharts dailychartbook thetechnicaltrader investorplace rudyhavenstein thebearcave atadams macrocharts thechartreport thekobeissiletter unusualwhales quoththeraven research24 contrahedge lexantagonearnest overlevered vixologist cemkarsan deltaneutraltrading momentumtrader swingtradinglab wallstreetengineer tradertom`.split(' ');
await fs.mkdir('data', { recursive: true });
const result = [];
for (let offset=0; offset<domains.length; offset+=5) {
  await Promise.all(domains.slice(offset,offset+5).map(async domain => {
    const origin = `https://${domain}.substack.com`;
    try {
      const [ar,hr] = await Promise.all([fetch(`${origin}/api/v1/archive?sort=new&limit=3`, {signal:AbortSignal.timeout(20000)}),fetch(`${origin}/about`, {signal:AbortSignal.timeout(20000)})]);
      if (!ar.ok || !hr.ok) throw new Error(`HTTP ${ar.status}/${hr.status}`);
      const posts = await ar.json(); const html = await hr.text();
      const pre = html.match(/window\._preloads\s*=\s*JSON\.parse\(("(?:[^"\\]|\\.)*")\)/);
      const payload = pre ? JSON.parse(JSON.parse(pre[1])) : null;
      const publication = payload?.pub;
      const text = html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      result.push({domain,origin,name:publication?.name,title:html.match(/<title[^>]*>(.*?)<\/title>/)?.[1],description:publication?.hero_text,subscriberLabel:publication?.freeSubscriberCount,subscriberDetail:publication?.rankingDetailFreeSubscriberCount,aboutText:text.slice(0,9000),posts:posts.map(p=>({title:p.title,date:p.post_date,url:p.canonical_url,description:p.description,text:p.truncated_body_text?.slice(0,1500)}))});
    } catch(e) {result.push({domain,error:e.message});}
  }));
  console.log(`Read ${Math.min(offset+5,domains.length)}/${domains.length} public archives`);
}
result.sort((a,b)=>a.domain.localeCompare(b.domain));
await fs.writeFile('data/creator-research-r1.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.map(r=>({domain:r.domain,name:r.name,size:r.subscriberLabel,latest:r.posts?.[0]?.date,title:r.posts?.[0]?.title,error:r.error})),null,2));
