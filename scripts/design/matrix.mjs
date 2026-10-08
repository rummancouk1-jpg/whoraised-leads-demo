// Viewport parity gate. usage: node scripts/design/matrix.mjs <config> [origin]
process.on('unhandledRejection', e => console.error('unhandled rejection (ignored):', String(e && e.message).split(String.fromCharCode(10))[0]));
// One browser/device config × {normal, reduced motion} × {light, dark}: every view and state, with evidence.
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { chromium, webkit, devices, expect as baseExpect } from '@playwright/test';
import { root, login, logout, cookieParts, mockEmail, mockWrites } from './lib.mjs';
const expect = baseExpect.configure({ timeout: 45000 });
const CONFIGS = {
  'chrome-390': { engine: 'chromium', channel: 'chrome', width: 390, height: 844, touch: true, ctx: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  'webkit-iphone-390': { engine: 'webkit', width: 390, height: 844, touch: true, ctx: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
  'webkit-ipad-820': { engine: 'webkit', width: 820, height: 1180, touch: true, ctx: { ...devices['iPad (gen 7)'], viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 } },
  'chrome-1440': { engine: 'chromium', channel: 'chrome', width: 1440, height: 900 },
  'msedge-1440': { engine: 'chromium', channel: 'msedge', width: 1440, height: 900 },
  'webkit-1440': { engine: 'webkit', width: 1440, height: 900 },
};
const name = process.argv[2], origin = process.argv[3] || 'http://localhost:3101';
const cfg = CONFIGS[name]; if (!cfg) throw new Error('unknown config ' + name);
const out = `${root}/matrix/${name}`; await fs.mkdir(out, { recursive: true });
const cookie = await login(origin); const { name: cookieName, value: cookieValue } = cookieParts(cookie);
const real = await (await fetch(origin + '/api/leads', { headers: { Cookie: cookie } })).json();
const clay = real.leads.find(l => l.tracked_slug === 'audit-claytrader') ?? real.leads[0];
const browser = await (cfg.engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: cfg.channel }));
const COPY = /\bQA\b|Unavailable|\bnull\b|\bTODO\b|lorem|\btest\b|\bplaceholder\b|demo pass|WhoRaised|undefined|NaN\b/gi;
const results = [];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const scheme of ['light', 'dark']) for (const motion of ['normal', 'reduce']) {
  const prefix = `${scheme}-${motion}`;
  if (process.env.ONLY && process.env.ONLY !== prefix) continue;
  const c = await browser.newContext({ ...cfg.ctx, viewport: { width: cfg.width, height: cfg.height }, colorScheme: scheme, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', serviceWorkers: 'block', timezoneId: 'Asia/Karachi', locale: 'en-US' });
  await c.addCookies([{ name: cookieName, value: cookieValue, url: origin, httpOnly: true, secure: true, sameSite: 'Lax' }]);
  await mockEmail(c, origin, cookie);
  const writes = await mockWrites(c);
  let p = await c.newPage();
  const run = { config: name, scheme, motion, states: [], features: [], errors: [], status: 'PASS' };
  let expectedFault = false, faultUntil = 0;
  const attach = page => { page.on('pageerror', e => { if (!/access control|cancel|abort/i.test(e.message)) run.errors.push({ type: 'runtime', message: e.message }); }); page.on('console', m => { if (m.type() === 'error' && !expectedFault && !(Date.now() < faultUntil && /Failed to load resource.*(50[34]|404)/.test(m.text()))) run.errors.push({ type: 'console', message: m.text() }); }); };
  attach(p);
  const feature = async (label, fn) => { try { const detail = await fn(); run.features.push({ label, status: 'PASS', detail }); } catch (e) { run.status = 'FAIL'; run.features.push({ label, status: 'FAIL', error: String(e.message).split('\n')[0].slice(0, 300) }); await p.screenshot({ path: `${out}/${prefix}-FAIL-${label.replace(/\W+/g, '-')}.png` }).catch(() => {}); } };

  async function shot(state, { skipAxe = false } = {}) {
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(250);
    const file = `${prefix}-${state}.png`;
    await p.screenshot({ path: `${out}/${file}`, animations: 'disabled', scale: 'css' });
    const checks = await p.evaluate(({ touch, reduce, width }) => {
      const faults = [], targets = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) faults.push('document horizontal overflow');
      for (const e of document.querySelectorAll('nav a, nav button, .gg-topbar button, [role=dialog]')) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1)) faults.push('clipped: ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 50)); }
      if (reduce) { if (document.getAnimations().length) faults.push('running animations under reduced motion: ' + document.getAnimations().map(a => a.animationName || a.transitionProperty).join(',')); for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if (s.animationName !== 'none' || s.transitionDuration.split(',').some(v => parseFloat(v) > 0)) { faults.push('motion not reduced: ' + e.className); break; } } }
      if (touch || width <= 900) {
        const sel = 'button, a[href], select, textarea, input:not([type=hidden]), summary, [role=option], [role=tab]';
        const dialog = document.querySelector('[role=dialog][aria-modal=true]');
        for (const e of document.querySelectorAll(sel)) {
          if (dialog && !dialog.contains(e) && !e.closest('[data-modal-safe]')) continue;
          if (e.closest('[inert]') || e.closest('[hidden]') || e.classList.contains('gg-skip')) continue;
          let box = e; if (e.matches('input[type=checkbox]')) box = e.closest('label') || e;
          const r = box.getBoundingClientRect(), s = getComputedStyle(box);
          if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
          if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
          if (r.width < 43.5 || r.height < 43.5) targets.push(`${e.tagName.toLowerCase()}[${(e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 30)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return { faults: [...new Set(faults)], targets, text: document.body.innerText };
    }, { touch: !!cfg.touch, reduce: motion === 'reduce', width: cfg.width });
    const hits = checks.text.match(COPY) || [];
    let violations = [];
    if (!skipAxe) { const axe = await new AxeBuilder({ page: p }).withTags(AXE_TAGS).analyze(); violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) })); }
    const row = { state, file, overflow: checks.faults, copyHits: hits, touchTargets: checks.targets, axe: violations, status: 'PASS' };
    if (checks.faults.length || hits.length || violations.length || checks.targets.length) { row.status = 'FAIL'; run.status = 'FAIL'; }
    run.states.push(row);
    await fs.writeFile(`${out}/${name}.json`, JSON.stringify([...results, { ...run, inProgress: true }], null, 2));
  }
  async function home() { await p.goto(origin + '/'); await expect(p.locator('.gg-name-button').first()).toBeVisible(); await expect(p.locator('.gg-status-strip')).not.toContainText('Loading…'); await expect(p.locator('.gg-hero-line')).toContainText('queued'); }
  async function pipeline() { await p.goto(origin + '/pipeline'); await expect(p.locator('.gg-pipeline-card').first()).toBeVisible(); await expect(p.locator('.gg-hero-line')).toContainText('queued'); }
  async function email() { await p.goto(origin + '/email'); await expect(p.getByRole('region', { name: 'Sending inbox metrics' }).locator('tbody tr')).toHaveCount(8); }
  const closeDialog = async () => { await p.getByRole('button', { name: 'Close dialog', exact: true }).click(); await expect(p.getByRole('dialog')).toHaveCount(0); };
  const openPalette = async () => { await p.getByRole('button', { name: 'Search or run a command' }).locator('visible=true').first().click(); await expect(p.getByRole('dialog', { name: 'Command palette' })).toBeVisible(); };

  try {
    // ── login (own context state: no cookie needed, so a fresh page)
    const anon = await browser.newContext({ ...cfg.ctx, viewport: { width: cfg.width, height: cfg.height }, colorScheme: scheme, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
    const lp = await anon.newPage(); const keep = p; p = lp; attach(lp);
    await lp.goto(origin + '/login'); await expect(lp.locator('.gg-login-subtitle')).toHaveText('Private workspace for the GG team only'); await shot('login');
    p = keep; await anon.close();

    await home(); await shot('home');
    run.hero = await p.locator('.gg-hero-line').innerText(); run.strip = await p.locator('.gg-status-strip').innerText();
    await p.getByLabel('Show long tail').check(); await shot('long-tail'); await p.getByLabel('Show long tail').uncheck();
    // filters + chips + saved views
    await p.getByRole('button', { name: /^Filters/ }).click(); await p.locator('#filter-panel select').first().selectOption('YouTube'); await expect(p.getByRole('list', { name: 'Active filters' })).toBeVisible(); await shot('filters-open');
    await p.getByRole('button', { name: 'Save view' }).click(); await p.getByLabel('View name').fill('My YouTube list'); await shot('save-view-form');
    await p.getByRole('button', { name: 'Save', exact: true }).click(); await expect(p.getByRole('button', { name: 'My YouTube list', exact: true })).toBeVisible(); await shot('saved-view');
    await p.getByRole('button', { name: 'Clear all' }).click();
    await p.getByRole('button', { name: 'Delete view My YouTube list' }).click(); await expect(p.getByRole('button', { name: 'My YouTube list', exact: true })).toHaveCount(0);
    await p.getByRole('button', { name: 'Undo' }).click(); await expect(p.getByRole('button', { name: 'My YouTube list', exact: true })).toBeVisible();
    await p.getByRole('button', { name: 'Delete view My YouTube list' }).click(); await p.getByRole('button', { name: 'Dismiss notification' }).first().click();
    await p.getByLabel('Search leads', { exact: true }).fill(clay.tracked_slug);
    await p.getByRole('button', { name: clay.name + ' ' + clay.handle, exact: true }).click(); await expect(p.getByRole('dialog')).toBeVisible(); await shot('drawer');
    await p.locator('.gg-draft').scrollIntoViewIfNeeded(); await shot('draft'); await closeDialog(); await p.getByLabel('Search leads', { exact: true }).fill('');
    await p.getByRole('button', { name: 'Export CSV', exact: true }).click(); await shot('export'); const exported = await p.getByLabel('CSV preview').inputValue(); await closeDialog();
    await p.getByRole('button', { name: 'Import CSV', exact: true }).click(); await shot('import'); await p.getByLabel('Or paste CSV').fill(exported); await p.getByRole('button', { name: 'Validate CSV', exact: true }).click(); await expect(p.getByRole('region', { name: 'Import preview' })).toBeVisible(); await shot('import-preview'); await closeDialog();
    await p.locator('#click-title').scrollIntoViewIfNeeded(); await shot('analytics');
    await p.getByLabel('Search leads', { exact: true }).fill('no matching outreach record xyz'); await shot('no-matches'); await p.getByLabel('Search leads', { exact: true }).fill('');

    // palette + shortcuts help
    await home(); await openPalette(); await shot('palette');
    await p.getByRole('combobox').fill('clay'); await expect(p.getByRole('option').first()).toBeVisible(); await shot('palette-results');
    await p.keyboard.press('Enter'); await expect(p.getByRole('dialog', { name: clay.name })).toBeVisible(); await closeDialog();
    await openPalette(); await p.keyboard.press('Escape'); await expect(p.getByRole('dialog')).toHaveCount(0);
    await openPalette(); await p.getByRole('combobox').fill('shortcuts'); await p.keyboard.press('Enter'); await expect(p.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible(); await shot('shortcuts'); await closeDialog();

    // pipeline
    await pipeline(); await shot('pipeline');
    await p.locator('.gg-board').evaluate(el => { el.scrollLeft = el.scrollWidth; }); await p.waitForTimeout(200); await shot('pipeline-scrolled');
    await p.locator('.gg-board').evaluate(el => { el.scrollLeft = 0; });
    await p.locator('.gg-card-name').first().click(); await expect(p.getByRole('dialog')).toBeVisible(); await shot('pipeline-drawer'); await closeDialog();

    // optimistic stage change + undo toast (writes mocked; shared database untouched)
    await feature('stage move is optimistic, toasts Undo, and Undo restores', async () => {
      const card = p.locator(`.gg-pipeline-card[data-lead="${clay.tracked_slug}"]`);
      await expect(card).toBeVisible(); const from = await card.locator('.gg-card-stage').inputValue();
      const to = from === 'Replied' ? 'Joined' : 'Replied';
      await card.locator('.gg-card-stage').selectOption(to);
      await expect(p.locator(`.gg-column[data-stage="${to}"] .gg-pipeline-card[data-lead="${clay.tracked_slug}"]`)).toBeVisible({ timeout: 1000 });
      const toast = p.getByRole('status').filter({ hasText: `Moved ${clay.name} to ${to}` }); await expect(toast).toBeVisible();
      await toast.getByRole('button', { name: 'Undo' }).focus(); await shot('toast-undo');
      await toast.getByRole('button', { name: 'Undo' }).click();
      await expect(p.locator(`.gg-column[data-stage="${from}"] .gg-pipeline-card[data-lead="${clay.tracked_slug}"]`)).toBeVisible();
      await expect.poll(() => writes.calls.filter(x => x.slug === clay.tracked_slug).map(x => x.patch.stage).join('>'), { timeout: 8000 }).toContain(from);
      return { from, to, saved: writes.calls.filter(x => x.slug === clay.tracked_slug).map(x => x.patch.stage) };
    });
    await feature('stage change from the drawer is undoable while the drawer is open', async () => {
      await p.locator(`.gg-pipeline-card[data-lead="${clay.tracked_slug}"] .gg-card-name`).click(); await expect(p.getByRole('dialog')).toBeVisible();
      const select = p.getByLabel('Stage', { exact: true }); const from = await select.inputValue(); const to = from === 'Contacted' ? 'Replied' : 'Contacted';
      await select.selectOption(to); const toast = p.getByRole('status').filter({ hasText: `Moved ${clay.name} to ${to}` }); await expect(toast).toBeVisible();
      await toast.getByRole('button', { name: 'Undo' }).click(); await expect(select).toHaveValue(from); await closeDialog();
    });

    // email
    await email(); await shot('email');
    await feature('relative times show the exact time on hover or long-press', async () => {
      const t = p.locator('.gg-reltime').first(); await expect(t).toBeVisible();
      if (cfg.touch) { await t.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true }); await p.waitForTimeout(650); } else await t.hover();
      const tip = t.locator('[role=tooltip]'); await expect(tip).toBeVisible(); const text = await tip.innerText();
      if (!/\d{4}/.test(text) || !/GMT|UTC|PKT|[+-]\d/.test(text)) throw new Error('tooltip is not an exact time: ' + text);
      await shot('reltime-tooltip'); return text;
    });
    await expect(p.locator('.gg-reltime .gg-sr-only').first()).toHaveText(/(ago|just now|today|yesterday|in \d).*\d{4}/);
    expectedFault = true; faultUntil = Date.now() + 15000; await p.goto(origin + '/not-a-real-page'); await expect(p.getByRole('heading', { name: 'Page not found' })).toBeVisible(); await shot('404'); expectedFault = false;

    // loading / empty / error (read-only fault injection)
    for (const view of ['home', 'pipeline', 'email']) for (const state of ['loading', 'empty', 'error']) {
      await p.close(); p = await c.newPage(); attach(p);
      let release; const gate = new Promise(r => { release = r; }); const pending = [];
      const api = view === 'email' ? '**/api/email' : '**/api/leads'; expectedFault = state === 'error'; faultUntil = Date.now() + 15000;
      await p.route(api, route => { const work = (async () => {
        if (state === 'loading') await gate;
        if (state === 'empty') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(view === 'email' ? { live: { fetchedAt: new Date().toISOString(), day: '2026-10-08', inboxes: [], campaign: null, campaignMessage: 'No campaign yet', batches: [] }, history: [], error: '', historyError: '' } : { leads: [], clicks: { leads: [], groups: [], daily: [], dailyBySlug: [], tests: [] } }) });
        else if (state === 'error') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Shared workspace could not be loaded. Retry shortly.' }) });
        else await route.fallback();
      })(); pending.push(work); return work; });
      await p.goto(origin + (view === 'home' ? '/' : '/' + view));
      if (state === 'loading') { await expect(p.getByRole('status').filter({ hasText: view === 'email' ? 'Reading live Instantly metrics' : 'Loading shared workspace' }).first()).toBeVisible(); const sk = await p.locator('.gg-skeleton').count(); if (!sk) throw new Error(view + ' loading state shows no skeleton'); }
      else if (state === 'error') await expect(p.getByRole('alert').first()).toBeVisible();
      else await expect(p.getByRole('heading', { name: view === 'email' ? 'No sending inboxes connected' : 'Build your outreach list' })).toBeVisible();
      await shot(`${view}-${state}`);
      release(); await Promise.all(pending); await p.unrouteAll({ behavior: 'wait' }); expectedFault = false;
      if (state === 'loading') await expect(p.getByRole('status').filter({ hasText: view === 'email' ? 'Reading live Instantly metrics' : 'Loading shared workspace' })).toHaveCount(0);
    }

    // keyboard layer (physical keyboard: desktop widths) and the phone equivalents
    await home();
    if (!cfg.touch) {
      await feature('⌘K / Ctrl+K opens the palette', async () => { await p.keyboard.press('Control+k'); await expect(p.getByRole('dialog', { name: 'Command palette' })).toBeVisible(); await p.keyboard.press('Escape'); await expect(p.getByRole('dialog')).toHaveCount(0); await p.keyboard.press('Meta+k'); await expect(p.getByRole('dialog', { name: 'Command palette' })).toBeVisible(); await p.keyboard.press('Escape'); });
      await feature('g then p/e/h navigates; / focuses search; ? opens help; j/k walk the list', async () => {
        await p.keyboard.press('g'); await p.keyboard.press('p'); await expect(p).toHaveURL(/\/pipeline$/); await p.keyboard.press('g'); await p.keyboard.press('e'); await expect(p).toHaveURL(/\/email$/); await p.keyboard.press('g'); await p.keyboard.press('h'); await expect(p).toHaveURL(origin + '/');
        await expect(p.locator('.gg-name-button').first()).toBeVisible();
        await p.keyboard.press('/'); await expect(p.locator('#lead-search')).toBeFocused(); await p.locator('#lead-search').blur();
        await p.keyboard.press('j'); await expect(p.locator('.gg-name-button').first()).toBeFocused(); await p.keyboard.press('j'); await expect(p.locator('.gg-name-button').nth(1)).toBeFocused(); await p.keyboard.press('k'); await expect(p.locator('.gg-name-button').first()).toBeFocused();
        await p.keyboard.press('Enter'); await expect(p.getByRole('dialog')).toBeVisible(); await p.keyboard.press('Escape'); await expect(p.getByRole('dialog')).toHaveCount(0);
        await p.keyboard.press('?'); await expect(p.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible(); await p.keyboard.press('Escape');
      });
      await feature('Ctrl+Z undoes the last stage move', async () => {
        await pipeline(); const card = p.locator(`.gg-pipeline-card[data-lead="${clay.tracked_slug}"]`); const from = await card.locator('.gg-card-stage').inputValue(); const to = from === 'Replied' ? 'Joined' : 'Replied';
        await card.locator('.gg-card-stage').selectOption(to); await p.locator('body').click({ position: { x: 5, y: 5 } }); await p.keyboard.press('Control+z'); await expect(p.locator(`.gg-column[data-stage="${from}"] .gg-pipeline-card[data-lead="${clay.tracked_slug}"]`)).toBeVisible();
      });
      await feature('focus ring is visible on keyboard focus', async () => { await home(); await p.keyboard.press('Tab'); const rows = []; for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); rows.push(await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { tag: e.tagName, outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24) }; })); } const bad = rows.filter(r => !r.outline); if (bad.length) throw new Error('no focus ring: ' + JSON.stringify(bad)); return rows.length; });
    } else {
      await feature('phone/tablet: search tab/button opens the palette and jumps to a lead', async () => { await openPalette(); await p.getByRole('combobox').fill(clay.tracked_slug.replace('audit-', '')); await p.getByRole('option').first().click(); await expect(p.getByRole('dialog', { name: clay.name })).toBeVisible(); await closeDialog(); });
    }
    await feature('focus is never hidden behind the sticky bars (WCAG 2.4.11)', async () => {
      await home(); await p.evaluate(() => { document.body.focus(); window.scrollTo(0, 0); }); const bad = []; let n = 0;
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press('Tab');
        const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); if (!b.width || !b.height) return null; let ok = false, covering = ''; for (const fx of [.1, .5, .9]) for (const fy of [.1, .5, .9]) { const x = b.left + b.width * fx, y = b.top + b.height * fy; if (x < 0 || y < 0 || x > innerWidth - 1 || y > innerHeight - 1) continue; const top = document.elementFromPoint(x, y); if (!top || e.contains(top) || top.contains(e)) ok = true; else covering = String(top.className || top.tagName); } return { ok, label: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 30), covering }; });
        if (!r) continue; n++; if (!r.ok) bad.push(r);
      }
      if (bad.length) throw new Error('focused control covered: ' + JSON.stringify(bad.slice(0, 3))); if (n < 8) throw new Error('only ' + n + ' focus stops'); return n + ' stops';
    });
    if (cfg.width === 390) await feature('reflow at 320 px: no sideways page scroll on any view (WCAG 1.4.10)', async () => {
      await p.setViewportSize({ width: 320, height: 640 }); const seen = [];
      for (const path of ['/', '/pipeline', '/email']) { await p.goto(origin + path); await p.waitForTimeout(1800); const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); seen.push(path + ':' + w.sw + '/' + w.iw); if (w.sw > w.iw + 1) throw new Error('overflow at ' + path + ' ' + w.sw + '>' + w.iw); }
      await p.setViewportSize({ width: cfg.width, height: cfg.height }); return seen;
    });
    await feature('appearance can be switched and returns to system', async () => {
      const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor); const start = await bg();
      const btn = p.getByRole('button', { name: /^Appearance:/ }); await btn.click(); const a = await p.evaluate(() => document.documentElement.dataset.theme); await btn.click(); const b = await p.evaluate(() => document.documentElement.dataset.theme); await btn.click(); const c2 = await p.evaluate(() => document.documentElement.dataset.theme ?? 'system');
      if (a !== 'light' || b !== 'dark' || c2 !== 'system') throw new Error(`cycle ${a},${b},${c2}`); if (await bg() !== start) throw new Error('system appearance not restored'); return [a, b, c2];
    });
    await feature('board has a non-drag path and jump chips', async () => { await pipeline(); if (!(await p.locator('.gg-card-stage').count())) throw new Error('no stage menus'); await p.getByRole('navigation', { name: 'Jump to stage' }).getByRole('button', { name: /^Declined/ }).click(); await p.waitForTimeout(300); });
    await feature('home status line equals data (no hard-coded date)', async () => { await home(); const text = await p.locator('.gg-hero-line').innerText(); if (!/^GG Outreach\.?\s*\d+ creators & communities queued/.test(text.replace(/\n/g, ' '))) throw new Error('unexpected: ' + text); if (!/inboxes? warming/.test(text)) throw new Error('no inbox clause: ' + text); if (!/sending starts (once the signup link is live|[A-Z][a-z]{2} \d+)|sending now|campaign (paused|completed)/.test(text)) throw new Error('no send clause: ' + text); return text.replace(/\n/g, ' '); });
    if (writes.calls.length && run.features.every(f => f.status === 'PASS')) run.writesMocked = writes.calls.length;
  } catch (e) { run.status = 'FAIL'; run.failure = String(e.message).split('\n').slice(0, 6).join(' | '); await p.screenshot({ path: `${out}/${prefix}-FAILURE.png` }).catch(() => {}); }
  finally { if (run.errors.length) run.status = 'FAIL'; results.push(run); await fs.writeFile(`${out}/${name}.json`, JSON.stringify(results, null, 2)); console.log(name, prefix, run.status, `${run.states.length} states`, `${run.features.length} features`, run.failure?.slice(0, 160) || '', run.errors.length ? 'errors:' + run.errors.length : ''); await c.close(); }
}
await browser.close(); await logout(origin, cookie);
