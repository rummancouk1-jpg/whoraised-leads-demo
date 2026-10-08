import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Read the existing private configuration without logging credentials or capturing authenticated pages.
process.loadEnvFile('.env.local');
assert.ok(process.env.GG_ACCESS_PASSWORD, 'Private password must be configured');
const origin = process.argv[2];
const phase = process.argv[3];
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/login`);
  const input = page.getByLabel('Workspace password', { exact: true });
  await input.fill(process.env.GG_ACCESS_PASSWORD);
  const pending = page.waitForResponse(r => r.url() === `${origin}/api/auth` && r.request().method() === 'POST');
  await input.press('Enter');
  const response = await pending;
  assert.equal(response.status(), 200);
  await page.waitForURL(`${origin}/`);
  const session = (await context.cookies()).find(c => c.name === 'gg-session');
  assert.ok(session?.httpOnly);
  assert.equal(session.sameSite, 'Strict');
  assert.equal(session.secure, true);
  const redirected = await context.request.get(`${origin}/login`);
  assert.equal(new URL(redirected.url()).pathname, '/');
  const logout = await context.request.delete(`${origin}/api/auth`, { headers: { Origin: origin } });
  assert.equal(logout.status(), 200);
  await page.goto(`${origin}/`);
  assert.equal(new URL(page.url()).pathname, '/login');
  await fs.writeFile(`evidence/login/${phase}/access.json`, JSON.stringify({ origin, status: 'PASS', successfulLogin: 200, session: { httpOnly: true, secure: true, sameSite: 'Strict' }, authenticatedLoginRedirect: '/', logout: 200, unauthenticatedRedirect: '/login', secretsCaptured: false }, null, 2));
  await context.close();
  console.log(`${phase}: real login, session, redirect and logout PASS`);
} finally { await browser.close(); }
