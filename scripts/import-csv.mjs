// One-time migration through the authenticated production API; never writes to Instantly.
import nextEnv from '@next/env';
import { validateAuditedCsv } from './audited-csv-gate.mjs';
nextEnv.loadEnvConfig(process.cwd());
const [url, filename] = process.argv.slice(2);
if (!url || !filename || !process.env.GG_ACCESS_PASSWORD) throw new Error('Usage: node scripts/import-csv.mjs https://your-site.vercel.app path/to/export.csv (password in .env.local)');
const origin = new URL(url).origin;
// All real lists require saved contact evidence, including base/legacy CSV schemas.
const { csv }=await validateAuditedCsv(filename);
const login = await fetch(`${origin}/api/auth`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.GG_ACCESS_PASSWORD }) });
if (!login.ok) throw new Error(`Login failed (HTTP ${login.status}).`);
const cookie = login.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw new Error('Login did not issue a session.');
const response = await fetch(`${origin}/api/leads`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, replace: false, oneTime: true }) });
const result = await response.json();
if (!response.ok) throw new Error(result.error || `Import failed (HTTP ${response.status}).`);
console.log(`Migration saved. Shared workspace now contains ${result.leads.length} leads.`);
