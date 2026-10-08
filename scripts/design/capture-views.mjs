// Captures the comparable views for the before/after contact sheets.
// usage: node capture-views.mjs <label> <origin> [scheme]      (label "before" = the tagged pre-design build)
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { root, login, logout, cookieParts, mockEmail, mockWrites } from './lib.mjs';
const [label, origin, scheme = 'dark'] = process.argv.slice(2);
const isBefore = label.startsWith('before');
const out = `${root}/${label}`; await fs.mkdir(out, { recursive: true });
const sizes = [{ w: 390, h: 844 }, { w: 820, h: 1180 }, { w: 1440, h: 900 }];
const cookie = await login(origin); const { name, value } = cookieParts(cookie);
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const { w, h } of sizes) {
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, timezoneId: 'Asia/Karachi', locale: 'en-US' });
    const anon = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
    const lp = await anon.newPage(); await lp.goto(origin + '/login'); await lp.waitForTimeout(500); await lp.screenshot({ path: `${out}/login-${w}.png` }); await anon.close();
    await c.addCookies([{ name, value, url: origin }]); await mockEmail(c, origin, cookie); await mockWrites(c);
    const p = await c.newPage();
    const shot = async (n, full = false) => { await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(350); await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: full, animations: 'disabled' }); };
    const loaded = async () => { await p.locator('.gg-name-button').first().waitFor({ timeout: 45000 }); await p.waitForFunction(() => !document.querySelector('.gg-status-strip')?.textContent.includes('Loading…'), null, { timeout: 45000 }); };
    // loading states first: hold the shared reads open
    for (const [view, api] of [['home', '**/api/leads'], ['pipeline', '**/api/leads'], ['email', '**/api/email']]) {
      const lp2 = await c.newPage(); let release; const gate = new Promise(r => { release = r; }); const held = [];
      await lp2.route(api, route => { const work = (async () => { await gate; await route.fallback(); })(); held.push(work); return work; });
      await lp2.goto(origin + (view === 'home' ? '/' : '/' + view)); await lp2.waitForTimeout(900); await lp2.screenshot({ path: `${out}/${view}-loading-${w}.png`, animations: 'disabled' }); release(); await Promise.all(held).catch(() => {}); await lp2.close();
    }
    await p.goto(origin + '/'); await loaded(); await shot('home'); await shot('home-full', true);
    await p.getByLabel('Search leads', { exact: true }).fill('claytrader'); await p.locator('.gg-name-button').first().click(); await p.getByRole('dialog').waitFor(); await shot('drawer'); await p.getByRole('button', { name: 'Close dialog', exact: true }).click(); await p.getByLabel('Search leads', { exact: true }).fill('');
    await p.getByRole('button', { name: 'Import CSV', exact: true }).click(); await shot('import'); await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await p.getByRole('button', { name: 'Export CSV', exact: true }).click(); await shot('export'); await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
    if (!isBefore) {
      await p.getByRole('button', { name: 'Search or run a command' }).locator('visible=true').first().click(); await p.getByRole('dialog', { name: 'Command palette' }).waitFor(); await shot('palette');
      await p.getByRole('combobox').fill('clay'); await p.waitForTimeout(250); await shot('palette-results'); await p.keyboard.press('Escape');
      await p.getByRole('button', { name: /^Filters/ }).click(); await p.locator('#filter-panel select').first().selectOption('YouTube'); await p.waitForTimeout(200); await shot('filters-views');
      await p.getByRole('button', { name: 'Clear all' }).click();
      await p.keyboard.press('?'); if (!(await p.getByRole('dialog').count())) { await p.getByRole('button', { name: 'Search or run a command' }).locator('visible=true').first().click(); await p.getByRole('combobox').fill('shortcuts'); await p.keyboard.press('Enter'); } await p.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor(); await shot('shortcuts'); await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
    await p.goto(origin + '/pipeline'); await p.locator('.gg-pipeline-card').first().waitFor({ timeout: 45000 }); await p.waitForTimeout(300); await shot('pipeline'); await shot('pipeline-full', true);
    if (!isBefore) {
      const card = p.locator('.gg-pipeline-card').first(); await card.locator('.gg-card-stage').selectOption('Replied'); await p.getByRole('status').filter({ hasText: 'Moved' }).getByRole('button', { name: 'Undo' }).focus(); await shot('toast');
    }
    await p.goto(origin + '/email'); await p.getByRole('region', { name: 'Sending inbox metrics' }).locator('tbody tr').first().waitFor({ timeout: 45000 }); await shot('email'); await shot('email-full', true);
    await p.goto(origin + '/not-a-real-page'); await p.getByRole('heading', { name: 'Page not found' }).waitFor(); await shot('404');
    await c.close(); console.log(label, w, 'ok');
  }
} finally { await b.close(); await logout(origin, cookie); }
