import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
// Session-local temporary tables disappear at commit; no application records change.
const results = await sql.transaction([
  sql`CREATE TEMP TABLE gg_clicks_migration_check (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, clicked_at timestamptz NOT NULL DEFAULT now(), slug text NOT NULL, lead_group text NOT NULL, referrer text NOT NULL, platform_guess text NOT NULL, is_example boolean NOT NULL DEFAULT false) ON COMMIT DROP`,
  sql`INSERT INTO gg_clicks_migration_check (slug,lead_group,referrer,platform_guess,is_example) VALUES ('schema-check','X','','desktop',false), ('example-check','X','','phone',true)`,
  sql`SELECT count(*)::int AS clicks FROM gg_clicks_migration_check WHERE NOT is_example`,
  sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, count(c.id)::int AS clicks FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, interval '1 day') day LEFT JOIN gg_clicks_migration_check c ON (c.clicked_at AT TIME ZONE 'UTC')::date=day::date AND NOT c.is_example GROUP BY day ORDER BY day`,
  sql`SELECT 'EXAMPLE QA' ~* '\\mEXAMPLE\\M' AS example`,
]);
assert.equal(results[2][0].clicks, 1);
assert.equal(results[3].length, 30);
assert.equal(results[3].at(-1).clicks, 1);
assert.equal(results[4][0].example, true);
console.log('PASS: isolated temporary schema, example exclusion and zero-filled 30-day trend.');
console.log('Existing lead count:', (await sql`SELECT count(*)::int AS n FROM gg_leads`)[0].n);
