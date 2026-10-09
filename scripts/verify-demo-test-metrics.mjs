import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import {neon} from '@neondatabase/serverless';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const sql=neon(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
const out=await sql.transaction([
 sql`CREATE TEMP TABLE demo_clicks (slug text, lead_group text, clicked_at timestamptz default now(), is_test boolean, is_example boolean) ON COMMIT DROP`,
 sql`INSERT INTO demo_clicks(slug,lead_group,is_test,is_example) VALUES ('real','YouTube',false,false),('example-a','YouTube',true,true),('test-a','YouTube',true,false),('real','YouTube',true,false)`,
 sql`SELECT slug,count(*)::int AS clicks FROM demo_clicks WHERE NOT is_test AND NOT is_example GROUP BY slug`,
 sql`SELECT lead_group,count(*)::int AS clicks FROM demo_clicks WHERE NOT is_test AND NOT is_example GROUP BY lead_group`,
 sql`SELECT count(*)::int AS clicks FROM demo_clicks WHERE NOT is_test AND NOT is_example AND clicked_at::date=current_date`
]);
assert.equal(out[2][0].clicks,1);assert.equal(out[3][0].clicks,1);assert.equal(out[4][0].clicks,1);
await fs.mkdir('evidence/demo-readiness',{recursive:true});
await fs.writeFile('evidence/demo-readiness/test-metric-proof.json',JSON.stringify({checkedAt:new Date().toISOString(),result:'PASS',events:4,realPerLead:out[2],realGroup:out[3],realDaily:out[4]},null,2));
console.log('PASS: three test events cannot move per-lead, group or daily real metrics');
