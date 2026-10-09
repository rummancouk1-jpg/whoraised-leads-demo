// Infrastructure preparation only by default. --apply requires an authenticated Neon profile.
// Secrets remain in memory or ignored .env files, never command arguments or evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';

const project = JSON.parse(await fs.readFile('.vercel/project.json', 'utf8'));
const globalRoot = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
const vc = path.join(globalRoot, 'vercel/dist/vc.js');
const nc = path.join(globalRoot, 'neon/dist/cli.js');
const evidence = 'evidence/r2-fix';
const branchName = 'gg-outreach-r2-preview-dev';
await fs.mkdir(evidence, { recursive: true });

function cli(entry, args, input) {
  try {
    return execFileSync(process.execPath, [entry, ...args], { encoding: 'utf8', input, timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    // CLI errors can contain decrypted values. Do not forward their stdout/stderr.
    throw new Error(`Infrastructure command failed: ${entry === vc ? 'Vercel' : 'Neon'} ${args[0]}. No credentials were logged.`);
  }
}
function vercelApi(endpoint, method = 'GET', body) {
  return JSON.parse(cli(vc, ['api', `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${project.orgId}`, '--raw', ...(body ? ['-X', method, '--input', '-'] : [])], body ? JSON.stringify(body) : undefined));
}
function neonApi(endpoint, method = 'GET', body) {
  return JSON.parse(cli(nc, ['api', endpoint, '-o', 'json', '--no-color', '--no-analytics', ...(body ? ['-X', method, '--data', '-'] : [])], body ? JSON.stringify(body) : undefined));
}
const envs = vercelApi(`/v9/projects/${project.projectId}/env`).envs;
const value = entry => vercelApi(`/v1/projects/${project.projectId}/env/${entry.id}`).value;
const prodEntry = envs.find(e => e.key === 'DATABASE_URL' && e.target.includes('production'));
if (!prodEntry) throw new Error('No production DATABASE_URL entry was found. Stop before changes.');
const productionUrl = value(prodEntry);
const production = new URL(productionUrl);
const projectIdEntry = envs.find(e => e.key === 'NEON_PROJECT_ID' && e.target.includes('production'));
if (!projectIdEntry) throw new Error('No existing NEON_PROJECT_ID was found. Stop before provisioning.');
const neonProjectId = value(projectIdEntry);
const sql = neon(productionUrl, { fetchOptions: { signal: AbortSignal.timeout(30000) } });
const names = await sql.transaction([sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'gg_%' ORDER BY tablename`], { readOnly: true });
const tables = names[0].map(r => r.tablename);
if (tables.some(t => !/^gg_[a-z_]+$/.test(t))) throw new Error('Unexpected table name.');
const counts = await sql.transaction(tables.map(t => sql.query(`SELECT count(*)::int AS n, md5(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text)) AS hash FROM ${t} t`, [])), { readOnly: true });
const baseline = { at: new Date().toISOString(), readOnly: true, tables: tables.map((table, i) => ({ table, ...counts[i][0] })) };
// Preserve the first fix-round baseline, rather than overwriting it on a later rerun.
try { await fs.writeFile(`${evidence}/production-before.json`, JSON.stringify(baseline, null, 2), { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
const databaseKeys = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NO_SSL', 'PGHOST', 'PGHOST_UNPOOLED', 'POSTGRES_HOST', 'PGPASSWORD', 'POSTGRES_PASSWORD', 'PGUSER', 'POSTGRES_USER', 'PGDATABASE', 'POSTGRES_DATABASE'];
const profiles = JSON.parse(cli(nc, ['profile', 'list', '-o', 'json', '--no-analytics']));
const signedIn = !!process.env.NEON_API_KEY || profiles.some(p => p.account && p.account !== '-');
const preparation = { at: baseline.at, projectId: neonProjectId, proposedBranch: branchName, signedIn, databaseAliases: envs.filter(e => databaseKeys.includes(e.key)).map(e => ({ key: e.key, target: e.target })), productionCounts: baseline.tables.map(({ table, n }) => ({ table, n })), applied: false };
await fs.writeFile(`${evidence}/isolation-preflight.json`, JSON.stringify(preparation, null, 2));
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(preparation, null, 2));
  process.exit(0);
}
if (!signedIn) throw new Error('Neon sign-in is required: run neon login, then rerun with --apply. No environment values changed.');

const { endpoints } = neonApi(`/projects/${neonProjectId}/endpoints`);
const endpointId = production.hostname.split('.')[0].replace(/-pooler$/, '');
const parent = endpoints.find(e => e.id === endpointId);
if (!parent) throw new Error('Production endpoint did not match the existing Neon project.');
let { branches } = neonApi(`/projects/${neonProjectId}/branches`);
let branch = branches.find(b => b.name === branchName);
if (branch && branch.parent_id !== parent.branch_id) throw new Error('Existing preview branch has a different parent.');
if (!branch) {
  const result = JSON.parse(cli(nc, ['api', `/projects/${neonProjectId}/branches`, '-X', 'POST', '-F', `branch.name=${branchName}`, '-F', `branch.parent_id=${parent.branch_id}`, '-F', 'endpoints=[{"type":"read_write"}]', '-o', 'json', '--no-analytics']));
  branch = result.branch;
}
const roleName = decodeURIComponent(production.username);
// Reset only the child branch's inherited password, preserving the parent's credential.
if (!(await fs.stat(`${evidence}/preview-credential-rotated.json`).catch(() => null))) {
  JSON.parse(cli(nc, ['api', `/projects/${neonProjectId}/branches/${branch.id}/roles/${roleName}/reset_password`, '-X', 'POST', '-o', 'json', '--no-analytics']));
  await fs.writeFile(`${evidence}/preview-credential-rotated.json`, JSON.stringify({branchId:branch.id,roleName,at:new Date().toISOString(),productionCredentialChanged:false}));
}
const connection = cli(nc, ['connection-string', branch.id, '--project-id', neonProjectId, '--database-name', decodeURIComponent(production.pathname.slice(1)), '--role-name', roleName, '--pooled', '--no-analytics']);
const preview = new URL(connection);
if (preview.hostname.replace('-pooler', '') === production.hostname.replace('-pooler', '')) throw new Error('Preview resolved to production endpoint. Stop.');
const direct = new URL(preview); direct.hostname = direct.hostname.replace('-pooler', '');
const values = {
  DATABASE_URL: preview.toString(), DATABASE_URL_UNPOOLED: direct.toString(), POSTGRES_URL: preview.toString(), POSTGRES_URL_NON_POOLING: direct.toString(), POSTGRES_PRISMA_URL: preview.toString(), POSTGRES_URL_NO_SSL: preview.toString(),
  PGHOST: preview.hostname, PGHOST_UNPOOLED: direct.hostname, POSTGRES_HOST: preview.hostname,
  PGPASSWORD: decodeURIComponent(preview.password), POSTGRES_PASSWORD: decodeURIComponent(preview.password),
  PGUSER: decodeURIComponent(preview.username), POSTGRES_USER: decodeURIComponent(preview.username), PGDATABASE: decodeURIComponent(preview.pathname.slice(1)), POSTGRES_DATABASE: decodeURIComponent(preview.pathname.slice(1)),
};
await fs.writeFile('.env.r2-production-readonly.local', `DATABASE_URL=${JSON.stringify(productionUrl)}\n`, { mode: 0o600 });
for (const key of databaseKeys) {
  const previewEntries = envs.filter(e => e.key === key && !e.target.includes('production') && e.target.some(t => ['preview', 'development'].includes(t)));
  for (const entry of envs.filter(e => e.key === key && e.target.includes('production') && e.target.some(t => ['preview', 'development'].includes(t)))) {
    if (entry.target.includes('production')) {
      // Only narrow the existing entry's targets. Its production value is never replaced.
      vercelApi(`/v9/projects/${project.projectId}/env/${entry.id}`, 'PATCH', { target: ['production'] });
    }
  }
  for (const entry of previewEntries) vercelApi(`/v9/projects/${project.projectId}/env/${entry.id}`, 'PATCH', { value: values[key] });
  // Also recover a previous run interrupted between narrowing and creating an entry.
  const covered = new Set(previewEntries.filter(e => !e.gitBranch).flatMap(e => e.target));
  const missingTargets = ['preview', 'development'].filter(t => !covered.has(t));
  if (missingTargets.length) vercelApi(`/v10/projects/${project.projectId}/env`, 'POST', { key, type: 'encrypted', target: missingTargets, value: values[key] });
}
for (const file of ['.env.local', '.env.preclient.local']) {
  let text = await fs.readFile(file, 'utf8');
  for (const [key, replacement] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(replacement)}`;
    text = new RegExp(`^${key}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${key}=.*$`, 'm'), () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  await fs.writeFile(file, text, { mode: 0o600 });
}
const changed = vercelApi(`/v9/projects/${project.projectId}/env`).envs;
if (value(changed.find(e => e.key === 'DATABASE_URL' && e.target.includes('production'))) !== productionUrl) throw new Error('Production connection verification failed.');
for (const e of changed.filter(e => databaseKeys.includes(e.key) && e.target.some(t => ['preview', 'development'].includes(t)))) {
  if (e.target.includes('production') || value(e) !== values[e.key]) throw new Error('Preview isolation verification failed.');
}
for (const key of databaseKeys) for (const target of ['preview', 'development']) {
  if (!changed.some(e => e.key === key && !e.gitBranch && e.target.includes(target))) throw new Error('A required preview/dev database alias is absent.');
}
const result = { ...preparation, applied: true, branchId: branch.id, parentId: parent.branch_id, previewRole: roleName, distinctEndpoint: true, productionConnectionUnchanged: true, aliasValuesVerified: true, previewWriteProof: 'pending actual preview deployment' };
await fs.writeFile(`${evidence}/isolation.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
