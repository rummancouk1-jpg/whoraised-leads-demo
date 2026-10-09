import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const envFile = '.env.local';
let content = fs.readFileSync(envFile, 'utf8');
const names = ['GG_ACCESS_PASSWORD','GG_SESSION_SECRET','CRON_SECRET'];
for (const name of names) {
  if (!new RegExp(`^${name}=`, 'm').test(content)) content += `\n${name}="${crypto.randomBytes(32).toString('base64url')}"\n`;
}
fs.writeFileSync(envFile, content);
for (const name of names) {
  const value = content.match(new RegExp(`^${name}="?([^"\\r\\n]+)`, 'm'))[1];
  const cli = process.env.VERCEL_CLI_PATH || path.join(process.env.APPDATA || '', 'npm/node_modules/vercel/dist/index.js');
  const result = spawnSync(process.execPath, [cli,'env','add',name,'production,preview','--sensitive','--yes'], { input: value, encoding: 'utf8' });
  console.log(`${name}: ${result.status === 0 ? 'configured in Vercel' : 'failed'}`);
  if (result.status !== 0) { console.error(result.stderr.replaceAll(value,'[REDACTED]')); process.exit(1); }
}
