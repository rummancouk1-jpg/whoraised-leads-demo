/* eslint-disable @typescript-eslint/no-require-imports */
// Load only the existing isolated preview environment for the local acceptance server.
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const env = { ...process.env };
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) { try { env[m[1]] = JSON.parse(m[2]); } catch { env[m[1]] = m[2]; } }
}
assert.equal(env.GG_DB_ENVIRONMENT, 'preview');
assert.notEqual(new URL(env.DATABASE_URL).hostname.replace('-pooler', ''), env.GG_PRODUCTION_DB_HOST.replace('-pooler', ''));
env.INSTANTLY_API_KEY = 'local-fixture';
env.INSTANTLY_CAMPAIGN_ID = '';
env.INSTANTLY_STUB_FILE = require('node:path').resolve('evidence/client-readiness/instantly-source.json');
env.DIGEST_SEND_ENABLED = 'false';
const child = spawn(process.execPath, ['--require', './scripts/design/instantly-stub.cjs', 'node_modules/next/dist/bin/next', 'start', '-p', '3110'], { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
