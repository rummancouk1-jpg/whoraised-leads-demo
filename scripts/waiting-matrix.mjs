// Focused waiting-state acceptance: Chrome/WebKit x 390/820/1440 x light/dark.
// Local mode uses an isolated database and provider preload. --live reads production.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { parseEnv } from './r2/infra.mjs';
const origin = process.argv[2] || 'http://localhost:3110';
const expect = baseExpect.configure({ timeout: 30000 });
const live = process.argv.includes('--live');
const dir = `evidence/waiting/${live ? 'production' : 'local'}`;
await fs.mkdir(dir, { recursive: true });
const env = parseEnv(live ? '.env.preclient.local' : '.env.local');
const auth = await fetch(origin + '/api/auth', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: env.GG_ACCESS_PASSWORD }) });
assert.equal(auth.status, 200, 'authenticated login');
const cookie = auth.headers.get('set-cookie').split(';')[0];
const [name, ...value] = cookie.split('=');
const headers = { Cookie: cookie };
if (!live) {
  const sync = await fetch(origin + '/api/cron/instantly-sync', { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  assert.equal(sync.status, 200);
  assert.equal((await sync.json()).counts.state, 'WAITING');
}
const activity = await (await fetch(origin + '/api/activity', { headers })).json();
const email = await (await fetch(origin + '/api/email', { headers })).json();
assert.equal(activity.sync.state, 'waiting');
assert.equal(activity.sync.consecutiveFailures, 0);
assert.equal(email.error, '');
assert.equal(email.live.campaign, null);
assert(email.live.inboxes.length > 0, 'warmup inboxes still load');
const results = [];
try {
  for (const engine of ['chrome', 'webkit']) {
    const browser = await (engine === 'chrome' ? chromium.launch({ channel: 'chrome' }) : webkit.launch());
    try {
      for (const width of [390, 820, 1440]) for (const theme of ['light', 'dark']) {
        const key = `${engine}-${width}-${theme}`;
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: theme, hasTouch: width < 900, serviceWorkers: 'block' });
        await context.addCookies([{ name, value: value.join('='), url: origin, httpOnly: true, secure: true, sameSite: 'Lax' }]);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.setDefaultTimeout(30000);
        try {
          for (const [screen, path] of [['home', '/'], ['pipeline', '/pipeline'], ['email', '/email']]) {
            await page.goto(origin + path);
            if (screen !== 'email') {
              await expect(page.locator('.gg-sync-pill')).toHaveText('Waiting for first campaign');
              await expect(page.locator('.gg-sync-pill .gg-dot-ok')).toHaveCount(1);
              await expect(page.locator('.gg-hero-line')).toContainText('Waiting for first campaign');
            }
            await expect(page.locator('.gg-sync-banner')).toHaveCount(0);
            await expect(page.locator('body')).not.toContainText('Needs attention');
            if (screen === 'home') await expect(page.locator('.gg-status-strip')).toContainText('Waiting for first campaign');
            if (screen === 'email') {
              await expect(page.getByRole('region', { name: 'Sending inbox metrics' }).locator('tbody tr')).toHaveCount(email.live.inboxes.length);
              await expect(page.locator('.gg-sync-facts')).toContainText('Waiting for first campaign');
            }
            await page.evaluate(() => document.fonts.ready);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
            assert(overflow <= 1, `${key}/${screen} horizontal overflow: ${overflow}`);
            const clipped = screen === 'email' ? false : await page.locator('.gg-sync-pill').evaluate(el => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1; });
            assert.equal(clipped, false, `${key}/${screen} clipped pill`);
            const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
            assert.equal(axe.violations.length, 0, JSON.stringify(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))));
            await page.screenshot({ path: `${dir}/${key}-${screen}.png`, fullPage: true });
            results.push({ key, screen, state: 'waiting', pass: true, overflow, axeViolations: 0 });
          }
          if (!live) for (const state of ['ok', 'failing']) {
            const body = structuredClone(activity);
            body.sync.state = state;
            body.sync.lastError = state === 'failing' ? 'Instantly read failed (HTTP 500). Check connection and availability.' : null;
            body.sync.counts = { campaign: 'found', matched: 1 };
            await context.route('**/api/activity', route => route.fulfill({ json: body }));
            await page.goto(origin + '/');
            await expect(page.locator('.gg-sync-pill')).toContainText(state === 'ok' ? 'Synced' : 'Sync failing');
            await expect(page.locator('.gg-sync-banner')).toHaveCount(state === 'ok' ? 0 : 1);
            await context.unroute('**/api/activity');
            results.push({ key, screen: 'home', state, pass: true });
          }
          assert.deepEqual(errors, [], 'no browser runtime errors');
          console.log('PASS', key);
        } finally { await context.close(); }
      }
    } finally { await browser.close(); }
  }
} finally {
  await fs.writeFile(`${dir}/matrix.json`, JSON.stringify({ origin, live, inboxes: email.live.inboxes.length, results }, null, 2));
  await fetch(origin + '/api/auth', { method: 'DELETE', headers: { ...headers, Origin: origin } });
}
console.log(`PASS: ${results.length} screen/state checks, 12 configurations`);
