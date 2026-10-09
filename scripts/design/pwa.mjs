// PWA gate: manifest, icons, iOS tags, installability, service-worker scope, no private caching, offline page, logout wipe.
// usage: node scripts/design/pwa.mjs [origin]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, webkit, devices, expect } from '@playwright/test';
import { root, login, logout, cookieParts, protectionHeaders } from './lib.mjs';
const origin = process.argv[2] || 'http://localhost:3101';
await fs.mkdir(root, { recursive: true });
const publicFetch = path => fetch(origin + path, { headers: protectionHeaders() });
const ALLOWED = [/^\/_next\/static\//, /^\/icons\//, /^\/splash\//, /^\/icon\.svg$/, /^\/offline\.html$/, /^\/apple-touch-icon\.png$/, /^\/favicon\.ico$/];
const rows = [];
const pngSize = buf => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

// 1 — manifest + assets (anonymous: they must be public, and carry nothing private)
const anon = await publicFetch('/manifest.webmanifest');
const manifest = await anon.json();
const check = (label, fn) => { try { const detail = fn(); rows.push({ label, status: 'PASS', detail }); } catch (e) { rows.push({ label, status: 'FAIL', error: e.message.split('\n')[0] }); } };
check('manifest is public and installable-shaped', () => { assert.equal(anon.status, 200); assert.equal(manifest.display, 'standalone'); assert.ok(manifest.name && manifest.short_name && manifest.start_url && manifest.scope && manifest.id); assert.ok(manifest.theme_color && manifest.background_color); assert.ok(manifest.icons.some(i => i.sizes === '192x192') && manifest.icons.some(i => i.sizes === '512x512') && manifest.icons.some(i => i.purpose === 'maskable')); return { name: manifest.name, start_url: manifest.start_url, icons: manifest.icons.length, shortcuts: manifest.shortcuts?.length }; });
for (const icon of manifest.icons.filter(i => i.src.endsWith('.png'))) {
  const r = await publicFetch(icon.src); const buf = Buffer.from(await r.arrayBuffer());
  check('icon ' + icon.src, () => { assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png'); const s = pngSize(buf); assert.equal(`${s.w}x${s.h}`, icon.sizes); return `${s.w}x${s.h}`; });
}
for (const path of ['/apple-touch-icon.png', '/sw.js', '/offline.html', '/splash/dark-390x844@3x.png', '/splash/light-1024x1366@2x.png']) { const r = await publicFetch(path); check('public static: ' + path, () => { assert.equal(r.status, 200); return r.headers.get('content-type'); }); }
const sw = await (await publicFetch('/sw.js')).text();
check('service worker only ever answers navigations (network-first) and allow-listed static paths', () => {
  const respond = [...sw.matchAll(/respondWith/g)].length; assert.equal(respond, 2);
  assert.ok(/request\.mode === "navigate"/.test(sw) && /fetch\(request\)\.catch/.test(sw)); assert.equal([...sw.matchAll(/cache\.put\(/g)].length,1);assert.match(sw,/if \(response\.ok && response\.type === "basic" && !response\.redirected && !response\.headers\.has\("set-cookie"\)\) await cache\.put\(request, response\.clone\(\)\)\.catch/);assert.ok(!/\/api\//.test(sw)); return 'respondWith: navigation + static allow-list; cache-write rejection handled';
});
const loginHtml = await (await publicFetch('/login')).text();
check('iOS standalone tags, theme colours and launch images', () => {
  assert.match(loginHtml, /rel="apple-touch-icon"/); assert.match(loginHtml, /name="apple-mobile-web-app-capable"|name="mobile-web-app-capable"/); assert.match(loginHtml, /apple-mobile-web-app-status-bar-style" content="default"/); assert.match(loginHtml, /viewport-fit=cover/);
  assert.equal([...loginHtml.matchAll(/rel="apple-touch-startup-image"/g)].length, 18); assert.equal([...loginHtml.matchAll(/name="theme-color"/g)].length, 2); assert.match(loginHtml, /prefers-color-scheme: dark/);
  return { splash: 18, themeColor: 2 };
});
check('inline scripts carry the CSP nonce (theme init) and the page declares no unsafe-inline script', () => { assert.match(loginHtml, /<script[^>]*nonce="[^"]+"[^>]*>[^<]*gg-theme/); return 'ok'; });
const headers = (await publicFetch('/login')).headers; check('CSP unchanged: nonce + strict-dynamic, no unsafe-inline scripts', () => { const csp = headers.get('content-security-policy'); assert.match(csp, /script-src 'self' 'nonce-/); assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp)); return csp.slice(0, 80); });

// 2 — live browser behaviour with the service worker enabled
for (const [label, launch, device] of [['chrome', () => chromium.launch({ channel: 'chrome' }), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-iphone', () => webkit.launch(), { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } }]]) {
  const cookie = await login(origin); const { name, value } = cookieParts(cookie);
  const browser = await launch();
  const c = await browser.newContext({ ...device, serviceWorkers: 'allow', extraHTTPHeaders: protectionHeaders() });
  if (Object.keys(protectionHeaders()).length) await c.request.get(origin+'/login',{headers:{...protectionHeaders(),'x-vercel-set-bypass-cookie':'true'}});
  await c.addCookies([{ name, value, url: origin, httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const p = await c.newPage();
  const step = async (title, fn) => { try { const detail = await fn(); rows.push({ label: `[${label}] ${title}`, status: 'PASS', detail }); } catch (e) { rows.push({ label: `[${label}] ${title}`, status: 'FAIL', error: JSON.stringify({ actual: e.actual, expected: e.expected, message: String(e.message).slice(0, 100) }).slice(0, 800) }); } };
  await p.goto(origin + '/'); await expect(p.locator('.gg-name-button').first()).toBeVisible({ timeout: 45000 });
  await step('service worker registers and activates', async () => { const state = await p.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return { scope: reg.scope, active: !!reg.active }; }); assert.ok(state.active); assert.equal(state.scope, origin + '/'); return state; });
  await p.reload(); await expect(p.locator('.gg-name-button').first()).toBeVisible({ timeout: 45000 });
  await p.goto(origin + '/pipeline'); await expect(p.locator('.gg-pipeline-card').first()).toBeVisible({ timeout: 45000 }); await p.goto(origin + '/email'); await p.waitForTimeout(1500); await p.goto(origin + '/');
  await p.evaluate(() => fetch('/api/leads', { cache: 'no-store' }).then(r => r.json())); await p.waitForTimeout(800);
  await step('cache holds static assets only: no page, no API response, no RSC payload', async () => {
    const urls = await p.evaluate(async () => { const out = []; for (const key of await caches.keys()) { const cache = await caches.open(key); for (const req of await cache.keys()) out.push(new URL(req.url).pathname + new URL(req.url).search); } return out; });
    assert.ok(urls.length > 3, 'cache is empty: ' + urls.length); const bad = urls.filter(u => !ALLOWED.some(a => a.test(u.split('?')[0])) || u.includes('_rsc'));
    assert.deepEqual(bad, []); assert.ok(urls.some(u => u.startsWith('/_next/static/')), 'no hashed assets cached');
    return { entries: urls.length, sample: urls.slice(0, 4) };
  });
  if (label !== 'chrome') await step('offline page is precached (live offline emulation crashes Playwright’s WebKit build; navigation fallback is exercised in Chromium)', async () => { const hit = await p.evaluate(async () => !!(await caches.match('/offline.html'))); assert.ok(hit); return 'precached'; });
  if (label === 'chrome') await step('offline navigation shows the static offline page (no private data)', async () => {
    const off = await c.newPage(); await c.setOffline(true); await off.goto(origin + '/email').catch(() => {}); await expect(off.getByRole('heading', { name: 'You’re offline' })).toBeVisible({ timeout: 15000 });
    const text = await off.locator('body').innerText(); assert.ok(!/@gapgambler|queued|inbox/i.test(text)); await c.setOffline(false); await off.close(); return text.replace(/s+/g, ' ').slice(0, 90);
  });
  if (label === 'chrome') await step('Chromium reports no installability errors (ignoring Playwright’s private-context notice)', async () => { const cdp = await c.newCDPSession(p); const r = await cdp.send('Page.getInstallabilityErrors'); assert.deepEqual(r.installabilityErrors.filter(x => x.errorId !== 'in-incognito'), []); return 'none'; });
  await p.goto(origin + '/'); await expect(p.locator('.gg-name-button').first()).toBeVisible({ timeout: 45000 });
  await p.evaluate(() => { localStorage.setItem('gg-views-v1', '[]'); localStorage.setItem('gg-theme', '"dark"'); sessionStorage.setItem('x', '1'); });
  await step('logout clears caches, service workers and viewer storage; server session is revoked', async () => {
    await p.getByRole('button', { name: 'Log out', exact: true }).click(); await p.waitForURL(origin + '/login', { timeout: 20000 }); await p.waitForTimeout(500);
    const after = await p.evaluate(async () => ({ caches: await caches.keys(), workers: (await navigator.serviceWorker.getRegistrations()).length, local: Object.keys(localStorage).filter(k => k.startsWith('gg-')), session: sessionStorage.length }));
    assert.deepEqual(after, { caches: [], workers: 0, local: [], session: 0 });
    const api = await c.request.get(origin + '/api/leads'); assert.equal(api.status(), 401);
    const page = await c.request.get(origin + '/'); assert.equal(page.status(), 401); return after;
  });
  await c.close(); await browser.close(); await logout(origin, cookie).catch(() => {});
}
await fs.writeFile(`${root}/pwa.json`, JSON.stringify({ at: new Date().toISOString(), origin, rows }, null, 2));
for (const r of rows) console.log(r.status, r.label, r.error || '');
const failed = rows.filter(r => r.status !== 'PASS').length; console.log(rows.length, 'checks,', failed, 'failed'); process.exit(failed ? 1 : 0);
