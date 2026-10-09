// Unauthenticated HTTP-level check of the Vercel PREVIEW (behind Vercel SSO) through `vercel curl`.
// It never signs in: signed-in behaviour is verified locally against the same build, and the preview is left for a person to open.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.mjs';
const url = fs.readFileSync(root + '/preview-url.txt', 'utf8').trim();
const env = { ...process.env, MSYS_NO_PATHCONV: '1' };
const VC = path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'vercel', 'dist', 'vc.js');
const vc = (p, args = []) => execFileSync(process.execPath, [VC, 'curl', p, '--deployment', url, '--', ...args], { encoding: 'utf8', env, maxBuffer: 32 * 1024 * 1024 });
const head = p => { const raw = vc(p, ['-s', '-D', '-', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null']); const first = raw.split(/\r?\n\r?\n/)[0]; const lines = first.split(/\r?\n/); return { status: Number(lines[0].split(' ')[1]), headers: Object.fromEntries(lines.slice(1).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).toLowerCase(), l.slice(i + 1).trim()]; })) }; };
const out = { url, at: new Date().toISOString(), checks: [] };
const add = (label, ok, detail) => { out.checks.push({ label, status: ok ? 'PASS' : 'FAIL', detail }); console.log(ok ? 'PASS' : 'FAIL', label, detail ?? ''); };

const login = head('/login');
add('/login renders (200) with nonce CSP, HSTS, DENY framing and noindex', login.status === 200 && /script-src 'self' 'nonce-/.test(login.headers['content-security-policy']) && !/script-src[^;]*'unsafe-inline'/.test(login.headers['content-security-policy']) && /max-age=31536000/.test(login.headers['strict-transport-security']) && login.headers['x-frame-options'] === 'DENY' && /noindex/.test(login.headers['x-robots-tag']), login.headers['cache-control']);
for (const p of ['/api/leads', '/api/email', '/api/email/source']) { const r = head(p); add(`${p} without a session is denied`, r.status === 401, r.status); }
for (const p of ['/', '/pipeline', '/email']) { const r = head(p); add(`${p} without a session shows the login page (401), not data`, r.status === 401, r.status); }
const sw = head('/sw.js'); add('/sw.js is public, never cached by the CDN or browser', sw.status === 200 && /no-cache/.test(sw.headers['cache-control']) && sw.headers['service-worker-allowed'] === '/', `${sw.headers['cache-control']} | allowed ${sw.headers['service-worker-allowed']}`);
for (const p of ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/apple-touch-icon.png', '/splash/dark-390x844@3x.png', '/icon.svg']) { const r = head(p); add(`${p} is public`, r.status === 200, r.headers['content-type']); }
const manifest = JSON.parse(vc('/manifest.webmanifest', ['-s']));
add('manifest: standalone, scoped, icons incl. maskable, shortcuts', manifest.display === 'standalone' && manifest.scope === '/' && manifest.icons.some(i => i.purpose === 'maskable') && manifest.shortcuts?.length === 2, manifest.start_url);
const swBody = vc('/sw.js', ['-s']); add('deployed worker is the static-only worker (no /api/ paths, two respondWith sites)', /Caches ONLY immutable/.test(swBody) && !/\/api\//.test(swBody) && (swBody.match(/respondWith/g) || []).length === 2);
const loginHtml = vc('/login', ['-s']);
add('login HTML carries the nonce on the theme script, 18 launch images, 2 theme colours, viewport-fit=cover', /<script[^>]*nonce="[^"]+"[^>]*>[^<]*gg-theme/.test(loginHtml) && (loginHtml.match(/rel="apple-touch-startup-image"/g) || []).length === 18 && (loginHtml.match(/name="theme-color"/g) || []).length === 2 && /viewport-fit=cover/.test(loginHtml));
add('login HTML has no creator names before sign-in', !/ClayTrader|MarketChameleon|Option Alpha|TradingWarz|Unusual Whales/i.test(loginHtml));
fs.writeFileSync(root + '/preview-check.json', JSON.stringify(out, null, 2));
process.exit(out.checks.some(c => c.status !== 'PASS') ? 1 : 0);
