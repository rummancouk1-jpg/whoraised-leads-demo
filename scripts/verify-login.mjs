import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const origin = process.argv[2] || 'http://localhost:3000';
const phase = process.argv[3] || 'local';
const root = `evidence/login/${phase}`;
await fs.mkdir(root, { recursive: true });
const forbidden = /\b(?:david|ian)\b/i;
let hits = '';
try { hits = execFileSync('rg', ['-n', '-i', '\\b(david|ian)\\b', 'src', 'public'], { encoding: 'utf8' }); }
catch (error) { if (error.status !== 1) throw error; }
assert.equal(hits, '', 'Personal names in application/public source');
const browser = await chromium.launch();
const rows = [];
const pageErrors = [];
try {
  for (const width of [390, 820, 1440, 1920]) {
    for (const dpr of [1, 2]) {
      for (const motion of ['no-preference', 'reduce']) {
        const height = width === 390 ? 844 : width === 820 ? 1180 : width === 1440 ? 960 : 1080;
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: motion });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.goto(`${origin}/login`);
        await page.evaluate(() => document.fonts.ready);
        const input = page.getByLabel('Workspace password', { exact: true });
        await input.waitFor();
        assert.equal(await input.evaluate(el => document.activeElement === el), true, 'Password autofocus');
        assert.equal(await page.title(), 'GG Outreach');
        assert.equal(await page.locator('.gg-login-subtitle').innerText(), 'Private workspace for the GG team only.');
        assert.equal(forbidden.test(await page.content()), false, 'Names in rendered HTML/metadata');
        const measurements = await page.evaluate(() => {
          const selectors = ['.gg-login-card', '.gg-login-eyebrow', 'h1', '.gg-login-subtitle', '.gg-login-form > label', '#workspace-password', '.gg-login-submit', '.gg-login-help'];
          return selectors.map(selector => {
            const el = document.querySelector(selector), r = el.getBoundingClientRect(), s = getComputedStyle(el);
            const ancestors = [];
            for (let a = el; a; a = a.parentElement) {
              const c = getComputedStyle(a);
              if (c.transform !== 'none' || c.filter !== 'none' || c.backdropFilter !== 'none' || c.willChange !== 'auto' || c.zoom !== '1') ancestors.push(a.tagName);
            }
            return { selector, x: r.x, y: r.y, width: r.width, height: r.height, fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, ancestors };
          });
        });
        for (const m of measurements) {
          for (const prop of ['x', 'y', 'width', 'height']) assert.equal(Number.isInteger(m[prop]), true, `${width}/${dpr}: fractional ${m.selector} ${prop} ${m[prop]}`);
          assert.deepEqual(m.ancestors, [], 'No composited/filtered/scaled text ancestors');
          if (!['.gg-login-card', '.gg-login-eyebrow'].includes(m.selector)) assert.ok(parseFloat(m.fontSize) >= 15, 'Minimum text size');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
        if (width >= 1440) {
          assert.equal(measurements[0].width, 500);
          assert.equal(measurements[2].fontSize, '42px');
        }
        if (motion === 'reduce') assert.equal(await page.locator('.gg-login-submit').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
        const stem = `${width}-${dpr}x-${motion === 'reduce' ? 'reduce' : 'normal'}`;
        await page.screenshot({ path: `${root}/login-${stem}.png`, fullPage: true });
        // Synthetic text is used only to expose the input's glyph rendering; no real password is captured.
        await input.fill('Crisp text 123');
        await page.getByRole('button', { name: 'Show password' }).click();
        assert.equal(await input.getAttribute('type'), 'text');
        if (width === 1440 && dpr === 1 && motion === 'no-preference') {
          await page.screenshot({ path: `${root}/text-proof-1440-1x.png`, fullPage: true });
          const title = await page.locator('h1').boundingBox();
          const field = await input.boundingBox();
          for (const [name, box] of [['title', title], ['input', field]]) {
            await sharp(`${root}/text-proof-1440-1x.png`).extract({ left: box.x - 4, top: box.y - 4, width: box.width + 8, height: box.height + 8 }).png().toFile(`${root}/crop-${name}-1440-1x.png`);
          }
        }
        await page.getByRole('button', { name: 'Hide password' }).click();
        assert.equal(await input.getAttribute('type'), 'password');
        const before = await page.locator('.gg-login-card').boundingBox();
        const buttonBefore = await page.locator('.gg-login-submit').boundingBox();
        let release;
        let requests = 0;
        const held = new Promise(resolve => { release = resolve; });
        await page.route('**/api/auth', async route => {
          requests++;
          await held;
          await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Incorrect password.' }) });
        });
        await input.press('Enter');
        await page.getByRole('button', { name: 'Signing in…' }).waitFor();
        assert.equal(await page.locator('.gg-login-submit').isDisabled(), true);
        assert.equal(await page.locator('form').getAttribute('aria-busy'), 'true');
        if (width === 1440 && dpr === 1 && motion === 'no-preference') await page.screenshot({ path: `${root}/loading-1440-1x.png` });
        await input.press('Enter');
        release();
        await page.getByText('Incorrect password. Please try again.', { exact: true }).waitFor();
        assert.equal(requests, 1, 'Prevent duplicate submissions');
        assert.equal(await input.getAttribute('aria-invalid'), 'true');
        assert.deepEqual(await page.locator('.gg-login-card').boundingBox(), before, 'No card jump on error');
        assert.deepEqual(await page.locator('.gg-login-submit').boundingBox(), buttonBefore, 'No button jump on error');
        await page.screenshot({ path: `${root}/error-${stem}.png`, fullPage: true });
        await input.fill('Retry');
        assert.equal(await page.locator('#login-error').innerText(), '');
        rows.push({ width, height, dpr, motion, status: 'PASS', measurements, screenshot: `login-${stem}.png`, errorScreenshot: `error-${stem}.png` });
        await context.close();
      }
    }
  }
  // Real API checks are separate from held/mock interaction tests above.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/login`);
  await page.getByLabel('Workspace password', { exact: true }).fill(`invalid-login-check-${Date.now()}`);
  const responsePromise = page.waitForResponse(r => r.url() === `${origin}/api/auth` && r.request().method() === 'POST');
  await page.getByLabel('Workspace password', { exact: true }).press('Enter');
  const response = await responsePromise;
  assert.equal(response.status(), 401, 'Real wrong-password API response');
  await page.getByText('Incorrect password. Please try again.', { exact: true }).waitFor();
  const publicChecks = [];
  for (const path of ['/', '/pipeline', '/email', '/login', '/robots.txt', '/manifest.webmanifest', '/does-not-exist']) {
    const r = await context.request.get(`${origin}${path}`);
    const text = await r.text();
    assert.equal(forbidden.test(text), false, `Names on public ${path}`);
    if (['/', '/pipeline', '/email'].includes(path)) assert.equal(new URL(r.url()).pathname, '/login', `Private ${path} redirected`);
    if (path === '/robots.txt') assert.match(text, /Disallow: \/\s/);
    if (path === '/manifest.webmanifest') assert.equal(JSON.parse(text).description, 'Private workspace for the GG team only.');
    publicChecks.push({ path, status: r.status(), finalPath: new URL(r.url()).pathname, nameHits: 0 });
  }
  const privateApi = await context.request.get(`${origin}/api/leads`);
  assert.equal(privateApi.status(), 401, 'Private data protected');
  await context.close();
  assert.deepEqual(pageErrors, []);
  const result = { origin, phase, capturedAt: new Date().toISOString(), status: 'PASS', sourceNameHits: 0, publicChecks, realWrongPasswordStatus: response.status(), privateDataStatus: privateApi.status(), pageErrors, rows };
  await fs.writeFile(`${root}/results.json`, JSON.stringify(result, null, 2));
  const md = `# Login parity — ${phase}\n\nOrigin: ${origin}\n\n16 viewport/DPR/motion combinations passed. Each has default and wrong-password screenshots. Geometry, text sizing, ancestor effects, autofocus, Enter, visibility toggle, duplicate-submit prevention, loading and stable error placement were asserted. Wrong-password interaction matrix uses held responses; one separate real API check returned 401. Public route/metadata/robots/manifest/404 name audit: zero hits.\n\n| Width | DPR | Motion | Login | Error | Gate |\n|---|---|---|---|---|---|\n` + rows.map(r => `| ${r.width} | ${r.dpr}x | ${r.motion} | [Screenshot](${r.screenshot}) | [Screenshot](${r.errorScreenshot}) | PASS |`).join('\n') + `\n\nNative 100% crops, no resizing: [Title](crop-title-1440-1x.png) · [Input](crop-input-1440-1x.png). [Loading state](loading-1440-1x.png). [Measurements and public audit](results.json).\n`;
  await fs.writeFile(`${root}/PARITY.md`, md);
  await fs.writeFile(`${root}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login parity ${phase}</title><style>body{background:#0b0f14;color:#e2e8f0;font:16px system-ui;padding:24px}a{color:#b8c3ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}img{max-width:100%;height:auto}figure{margin:0} .grid img{height:360px;object-fit:contain} .crop{display:block;width:auto;max-width:none}</style><h1>Login parity: ${phase}</h1><p>${origin} · All 16 gates pass · zero name hits</p><h2>1440 / 1x — native 100% crops</h2><img class="crop" src="crop-title-1440-1x.png" alt="Native title crop"><img class="crop" src="crop-input-1440-1x.png" alt="Native input crop"><h2>Viewport matrix</h2><div class="grid">${rows.map(r => `<figure><a href="${r.screenshot}"><img src="${r.screenshot}" alt="${r.width} ${r.dpr}x ${r.motion}"></a><figcaption>${r.width}px · ${r.dpr}x · ${r.motion} · PASS · <a href="${r.errorScreenshot}">Error state</a></figcaption></figure>`).join('')}</div></html>`);
  console.log(JSON.stringify({ status: 'PASS', origin, combinations: rows.length, sourceNameHits: 0, realWrongPasswordStatus: response.status(), evidence: `${root}/PARITY.md` }));
} finally { await browser.close(); }
