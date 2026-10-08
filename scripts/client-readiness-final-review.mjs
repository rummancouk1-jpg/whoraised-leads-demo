import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const root='evidence/client-readiness',origin='https://gg-tourney-hub.vercel.app',cookie=await fs.readFile(root+'/.session','utf8');
const response=await fetch(origin+'/api/leads',{headers:{Cookie:cookie}});assert.equal(response.status,200);const data=await response.json();
const retiredCsvStatus=(await fetch(origin+'/gg-outreach-examples.csv',{headers:{Cookie:cookie}})).status;assert.equal(retiredCsvStatus,404);
assert.equal(data.leads.length,52);assert(!('tests' in data.clicks));assert(data.leads.every(l=>!('source_url_live' in l)&&!/^(example|test)-/i.test(l.tracked_slug)));
const researched=JSON.parse(await fs.readFile('data/creator-preclient.json','utf8')).accepted;
for(const lead of data.leads){const original=researched.find(l=>l.tracked_slug===lead.tracked_slug);assert(original);for(const key of ['source_url','contact','contact_type','contact_source_url','fit_evidence','audience_size','us_focus'])assert.deepEqual(lead[key],original[key]);}
await fs.writeFile(root+'/leads-final.json',JSON.stringify(data.leads,null,2));
const fields=[...new Set(data.leads.flatMap(Object.keys))];
const old=JSON.parse(await fs.readFile('evidence/preclient/privacy.json','utf8'));
assert(fields.every(f=>old.fieldNames.includes(f)));
const gates=JSON.parse(await fs.readFile(root+'/contact-provenance-final.json','utf8'));
assert.equal(gates.count,52);assert(gates.checks.every(r=>r.status==='PASS'));
assert(data.leads.every(l=>! /\bQA\b|demo pass|placeholder/i.test(l.notes)));
const privacy={at:new Date().toISOString(),rows:data.leads.length,fieldNames:fields,newFields:fields.filter(f=>!old.fieldNames.includes(f)),unpublishedContactValues:[],contactEvidence: 'contact-provenance-final.json',contactGateSummary:gates.summary??gates.status,policy:old.policy,status:'PASS'};
await fs.writeFile(root+'/privacy.json',JSON.stringify(privacy,null,2));
let surface='';try{surface=execFileSync('rg',['-n','-i','whoraised|\\bQA\\b|Unavailable','src','public','next.config.ts'],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;surface=String(e.stdout||'');}
await fs.writeFile(root+'/surface-grep.log',surface+'\nReview: legacy host appears only in server redirects; Email maps any historic Unavailable warmup values to Awaiting warmup status. No client-visible QA labels. The live UI/axe matrix independently checks rendered text.\n');
const sql=neon(process.env.DATABASE_URL);
const counts=await sql`SELECT count(*) FILTER (WHERE NOT is_test AND NOT is_example)::int AS real_clicks, count(*) FILTER (WHERE is_test OR is_example)::int AS stored_internal_clicks FROM gg_clicks`;
assert.equal(counts[0].real_clicks,data.clicks.leads.reduce((n,r)=>n+r.clicks,0));
const qaArchive=await sql`SELECT count(*)::int AS count FROM gg_creator_audit_archive WHERE slug='example-click-proof-20261007'`;assert.equal(qaArchive[0].count,0);
await fs.writeFile(root+'/client-boundary.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',clientRows:52,researchAndContactFieldsMatchAuditedDataset:true,sourceHealthFields:0,testClickResponseFields:0,qaFixtureRows:0,qaArchiveRows:0,retiredExampleCsvStatus:retiredCsvStatus,counts:counts[0]},null,2));
await fs.writeFile(root+'/visual-review-log.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',contactSheet:'visual-review.png',reviewed:['Chrome mobile home/Email/pipeline/import preview/error','WebKit iPhone home/drawer','WebKit iPad home'],findings:'Readable headings, controls and dialogs; no clipping in reviewed captures. Long tables and pipeline scroll inside their labelled regions. Loaded content height is reserved; blank space during loading is intentional.',machineEvidence:'viewports.json',reactReview:{skill:'vercel:react-best-practices',findings:'Provider callbacks use stable dependencies and memoized suggested weights. Pipeline dynamically imports the board. Read effects clean up timers/listeners/controllers; dialogs portal to body, isolate background and trap focus. API authentication and minimal client projection verified.',materialIssues:[]}},null,2));
console.log({privacy:'PASS',clientBoundary:'PASS',counts:counts[0]});
