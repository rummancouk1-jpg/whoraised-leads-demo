// Helpers for talking to the SSO-protected Vercel preview through `vercel curl` (which handles protection bypass).
import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
export const previewUrl = (fs.existsSync('evidence/r2/preview-url.txt') ? fs.readFileSync('evidence/r2/preview-url.txt', 'utf8').trim() : '');
const VC = path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'vercel', 'dist', 'vc.js');
const env = { ...process.env, MSYS_NO_PATHCONV: '1' };
/** One request. Returns { status, headers, body }. */
export function req(p, { method = 'GET', headers = {}, body } = {}) {
  const args = ['-s', '-i', '-X', method];
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  if (body !== undefined) args.push('--data-binary', typeof body === 'string' ? body : JSON.stringify(body));
  const raw = execFileSync(process.execPath, [VC, 'curl', p, '--deployment', previewUrl, '--', ...args], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  // curl -i prints header blocks (possibly several, e.g. 100-continue); the last block precedes the body.
  const parts = raw.split(/\r?\n\r?\n/); let i = 0; while (i < parts.length - 1 && /^HTTP\/[\d.]+ 1\d\d/.test(parts[i + 1] ?? '')) i++;
  const head = parts[i].split(/\r?\n/); const status = Number(head[0].split(' ')[1]);
  const h = {}; const setCookie = []; for (const l of head.slice(1)) { const j = l.indexOf(':'); if (j < 0) continue; const k = l.slice(0, j).toLowerCase(), v = l.slice(j + 1).trim(); if (k === 'set-cookie') setCookie.push(v); else h[k] = v; }
  const text = parts.slice(i + 1).join('\n\n'); let json; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status, headers: h, setCookie, text, json };
}
/** Bearer-authenticated request (OHQ machine endpoints). The token is supplied by the caller and never printed. */
export const bearer = (token, p, opts = {}) => req(p, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
/** Server-side time to last byte in ms (curl's own clock, excluding the CLI start-up), for a bearer GET. */
export function timed(token, p) {
  const raw = execFileSync(process.execPath, [VC, 'curl', p, '--deployment', previewUrl, '--', '-s', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null', '-w', '%{http_code} %{time_total}', '-H', `Authorization: Bearer ${token}`], { encoding: 'utf8', env, maxBuffer: 1 << 20 });
  const [code, t] = raw.trim().split(/\s+/).slice(-2); return { status: Number(code), ms: Math.round(Number(t) * 1000) };
}
