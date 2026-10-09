import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const origin = process.argv[2] || 'https://whoraised-leads-demo.vercel.app';
const slug = 'example-click-proof-20261007';
const root = 'evidence/click-tracking';
await fs.mkdir(root, { recursive: true });
const sql = neon(process.env.DATABASE_URL);
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
async function data() { const r = await context.request.get(`${origin}/api/leads`); assert.equal(r.status(), 200); return r.json(); }
try {
  assert.equal((await context.request.get(`${origin}/api/leads`)).status(), 401);
  await page.goto(`${origin}/login`);
  await page.getByLabel('Workspace password').fill(process.env.GG_ACCESS_PASSWORD);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lead list', exact: true })).toBeVisible({ timeout: 45000 });
  const before = await data();
  if (!before.leads.some(l => l.tracked_slug === slug)) {
    const csv = 'name,handle,platform,kind,audience_size,niche,us_focus,contact,tracked_slug,stage,signups,last_touch,notes\nEXAMPLE Click Verification,@qa-click,YouTube,creator,0,earnings,unknown,,' + slug + ',New,0,,Production verification fixture; real browser clicks; excluded from conversion totals';
    const imported = await context.request.post(`${origin}/api/leads`, { headers: { Origin: origin }, data: { csv, replace: false } });
    assert.equal(imported.status(), 200);
  }
  const count = async () => (await sql`SELECT count(*)::int AS n FROM gg_clicks WHERE slug=${slug}`)[0].n;
  const baseline = await count();
  const botHeaders = execFileSync('curl.exe', ['--silent', '--show-error', '--dump-header', '-', '--output', 'NUL', '--user-agent', 'Twitterbot/1.0', `${origin}/go/${slug}`], { encoding: 'utf8' });
  assert.match(botHeaders, /HTTP\/\S+ 302/);
  assert.match(botHeaders, /utm_source=creator.*utm_campaign=gg-q3.*utm_content=example-click-proof-20261007/);
  assert.equal(await count(), baseline);
  for (const agent of ['facebookexternalhit/1.1', 'Slackbot', 'Discordbot', 'LinkedInBot', 'WhatsApp', 'TelegramBot']) {
    assert.equal((await context.request.get(`${origin}/go/${slug}`, { headers: { 'user-agent': agent }, maxRedirects: 0 })).status(), 302);
  }
  assert.equal((await context.request.head(`${origin}/go/${slug}`, { maxRedirects: 0 })).status(), 302);
  assert.equal((await context.request.get(`${origin}/go/${slug}`, { headers: { 'user-agent': 'Mozilla/5.0', 'sec-purpose': 'prefetch' }, maxRedirects: 0 })).status(), 302);
  assert.equal(await count(), baseline);
  assert.equal((await context.request.get(`${origin}/go/invalid_slug`, { maxRedirects: 0 })).status(), 404);
  assert.equal((await context.request.post(`${origin}/go/${slug}`)).status(), 405);
  const unknown = await context.request.get(`${origin}/go/unknown-click-verification`, { headers: { 'user-agent': 'Mozilla/5.0' }, maxRedirects: 0 });
  assert.equal(unknown.status(), 302);
  assert.equal((await sql`SELECT count(*)::int AS n FROM gg_clicks WHERE slug='unknown-click-verification'`)[0].n, 0);
  // A headed desktop browser with its natural UA, not a spoofed mobile request.
  if (process.argv.includes('--desktop')) {
    const desktop = await chromium.launch({ headless: false });
    try {
      const p = await desktop.newPage();
      await p.goto(`${origin}/login`);
      await p.evaluate(({ origin, slug }) => { const a = document.createElement('a'); a.href = `${origin}/go/${slug}`; a.textContent = 'Verify desktop click'; a.id = 'desktop-click-proof'; document.body.append(a); }, { origin, slug });
      const redirect = p.waitForResponse(r => r.url() === `${origin}/go/${slug}` && r.status() === 302);
      await p.locator('#desktop-click-proof').click({ noWaitAfter: true });
      await redirect;
      assert.equal(await count(), baseline + 1);
    } finally { await desktop.close(); }
  }
  const parity = [];
  for (const width of [390, 820, 1440]) for (const motion of ['no-preference', 'reduce']) {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto(origin);
    await expect(page.locator('.gg-name-button').filter({ hasText: 'EXAMPLE Click Verification' })).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('All edits saved to the shared workspace.', { exact: false })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (motion === 'reduce') assert.equal(await page.evaluate(() => [...document.querySelectorAll('body *')].some(el => { const s = getComputedStyle(el); return s.animationName !== 'none' || s.transitionDuration.split(',').some(v => parseFloat(v) > 0); })), false);
    const stem = `${width}-${motion === 'reduce' ? 'reduce' : 'normal'}`;
    await page.screenshot({ path: `${root}/dashboard-${stem}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('heading', { name: 'Click activity', exact: true }).evaluate(el => el.closest('section').scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${root}/trend-${stem}.png`, animations: 'disabled' });
    await page.locator('.gg-name-button').filter({ hasText: 'EXAMPLE Click Verification' }).click();
    await expect(page.locator('.gg-draft')).toContainText(`${origin}/go/${slug}`);
    await expect.poll(async () => {
      const b = await page.getByRole('dialog').boundingBox();
      return b.x >= -1 && b.x + b.width <= width + 1 && b.y >= -1 && b.y + b.height <= 961;
    }).toBe(true);
    await page.screenshot({ path: `${root}/drawer-${stem}.png`, animations: 'disabled' });
    await page.locator('.gg-draft').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${root}/pitch-${stem}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Close', exact: false }).click();
    await page.goto(`${origin}/pipeline`);
    await expect(page.getByRole('heading', { name: 'Outreach pipeline', exact: true })).toBeVisible();
    await expect(page.getByText('All edits saved to the shared workspace.', { exact: false })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${root}/pipeline-${stem}.png`, fullPage: true, animations: 'disabled' });
    parity.push({ width, motion, status: 'PASS', dashboard: `dashboard-${stem}.png`, trend: `trend-${stem}.png`, drawer: `drawer-${stem}.png`, pitch: `pitch-${stem}.png`, pipeline: `pipeline-${stem}.png` });
  }
  const result = await data();
  const events = await sql`SELECT clicked_at, slug, lead_group, referrer, platform_guess, is_example FROM gg_clicks WHERE slug=${slug} ORDER BY clicked_at`;
  const columns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='gg_clicks' ORDER BY ordinal_position`;
  assert.equal(columns.some(c => /ip|agent/.test(c.column_name)), false);
  assert.equal(result.clicks.leads.find(l => l.slug === slug)?.clicks ?? 0, events.length);
  assert.equal(result.clicks.daily.length, 30);
  assert.deepEqual(errors, []);
  await fs.writeFile(`${root}/verification.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), slug, baseline, count: events.length, botCurl: 'PASS: 302 and unchanged click count', botHeaders, checks: ['private analytics', 'six preview agents excluded', 'HEAD excluded', 'prefetch excluded', 'invalid slug 404', 'POST 405', 'unknown slug uncounted', 'dashboard equals persisted events', 'no IP or UA columns', '30-day UTC trend'], events, columns, parity, errors }, null, 2));
  console.log(JSON.stringify({ slug, events, parity: parity.length, errors }, null, 2));
} finally { await browser.close(); }
