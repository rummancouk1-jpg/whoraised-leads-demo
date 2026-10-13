// Read-only provider proof using the actual brake rules. Never calls a campaign mutation.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
const key = fs.readFileSync('.env.gg-campaign-work/instantly.env','utf8').match(/^\s*(?:export\s+)?INSTANTLY_API_KEY\s*=\s*(.*?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g,'');
assert(key,'Private provider credentials unavailable');
const compiled = {exports:{}};
const source = ts.transpileModule(fs.readFileSync('src/lib/bounce-brake.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext('(function(exports){'+source+'})')(compiled.exports);
const {GG_CAMPAIGN_ID,hardBounceCounts} = compiled.exports;
async function get(endpoint, query = '') {
  const response = await fetch('https://api.instantly.ai/api/v2/'+endpoint+query,{method:'GET',headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,endpoint);
  return response.json();
}
const [campaign,analytics,bounces] = await Promise.all([
  get('campaigns/'+GG_CAMPAIGN_ID),get('campaigns/analytics','?id='+GG_CAMPAIGN_ID),get('campaigns/analytics/bounces','?campaign_id='+GG_CAMPAIGN_ID),
]);
const row = analytics.find(row=>row.campaign_id===GG_CAMPAIGN_ID);
assert(row,'Campaign analytics');
const counts = hardBounceCounts(row.emails_sent_count,bounces.summary);
const configKeys = ['name','sequences','campaign_schedule','email_list','daily_limit','text_only','open_tracking','link_tracking','stop_on_reply'];
const config = Object.fromEntries(configKeys.map(key=>[key,campaign[key]]));
const configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
const result = {at:new Date().toISOString(),campaignStatus:campaign.status,campaignConfigSha256:configHash,...counts,providerCombinedBounced:row.bounced_count,methods:['GET','GET','GET']};
const out='evidence/gg-bounce-brake-sample-aware';fs.mkdirSync(out,{recursive:true});
if(process.argv[2]==='baseline')fs.writeFileSync(out+'/source-before.json',JSON.stringify(result,null,2));
else {
  const before=JSON.parse(fs.readFileSync(out+'/source-before.json','utf8'));
  assert.equal(configHash,before.campaignConfigSha256,'Campaign configuration unchanged');
  assert.equal(campaign.status,before.campaignStatus,'Campaign status unchanged');
  result.campaignUnchanged=true;
  fs.writeFileSync(out+'/source-after.json',JSON.stringify(result,null,2));
}
assert.equal(campaign.status,2,'Campaign remains paused');
assert.equal(counts.breach,false,'Current sample must not trip');
console.log(JSON.stringify(result));
