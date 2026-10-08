import fs from 'node:fs';
export const root = 'evidence/design-elevation';
export function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.preclient.local', 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
  return env;
}
/** Logs in through the real endpoint; returns the cookie string. The session is revoked by `logout`. */
export async function login(origin) {
  const env = loadEnv();
  const r = await fetch(origin + '/api/auth', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: env.GG_ACCESS_PASSWORD }) });
  if (r.status !== 200) throw new Error('login ' + r.status);
  return r.headers.get('set-cookie').split(';')[0];
}
export async function logout(origin, cookie) { await fetch(origin + '/api/auth', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } }); }
export const cookieParts = cookie => { const [name, ...v] = cookie.split('='); return { name, value: v.join('=') }; };
/** Local env has no valid Instantly key; serve the newest saved snapshot as the "live" block (test harness only). */
export async function mockEmail(context, origin, cookie) {
  const real = await (await fetch(origin + '/api/email', { headers: { Cookie: cookie } })).json();
  if (real.live) return real;
  const base = real.history[0]?.metrics;
  await context.route('**/api/email', async route => {
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...real, live: base ? { ...base, fetchedAt: new Date(Date.now() - 4 * 60000).toISOString() } : null, error: '' }) }); }
    catch { /* page closed while the request was in flight */ }
  });
  return real;
}
/**
 * Stateful write mock: PATCHes are recorded and layered over real GET /api/leads responses, so UI behaviour
 * (optimistic change, undo, polling) is exercised without ever writing to the shared database.
 */
export async function mockWrites(context) {
  const overrides = new Map(), calls = [];
  await context.route(/\/api\/leads(\?.*)?$/, async route => {
    try {
      if (route.request().method() !== 'GET') return await route.continue();
      const response = await route.fetch(); const json = await response.json();
      json.leads = json.leads.map(l => overrides.has(l.tracked_slug) ? { ...l, ...overrides.get(l.tracked_slug) } : l);
      await route.fulfill({ response, json });
    } catch { /* page closed while the request was in flight */ }
  });
  await context.route(/\/api\/leads\/[^/?]+$/, async route => {
    try {
      if (route.request().method() !== 'PATCH') return await route.continue();
      const slug = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
      const patch = route.request().postDataJSON();
      overrides.set(slug, { ...overrides.get(slug), ...patch }); calls.push({ slug, patch });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    } catch { /* page closed */ }
  });
  return { overrides, calls };
}
