import fs from 'node:fs';
export const root = process.env.EVIDENCE_ROOT || 'evidence/design-elevation';
export function loadEnv() {
  const env = {};
  for (const line of (fs.existsSync('.env.preclient.local') ? fs.readFileSync('.env.preclient.local', 'utf8') : '').split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
  return { ...env, ...process.env };
}
export function protectionHeaders() { return process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}; }
/** Logs in through the real endpoint; returns the cookie string. The session is revoked by `logout`. */
export async function login(origin) {
  const env = loadEnv();
  const r = await fetch(origin + '/api/auth', { method: 'POST', headers: { ...protectionHeaders(), Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: env.GG_ACCESS_PASSWORD }) });
  if (r.status !== 200) throw new Error('login ' + r.status);
  return r.headers.get('set-cookie').split(';')[0];
}
export async function logout(origin, cookie) { await fetch(origin + '/api/auth', { method: 'DELETE', headers: { ...protectionHeaders(), Origin: origin, Cookie: cookie } }); }
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lead: { ...patch, version: 'mock-version' } }) });
    } catch { /* page closed */ }
  });
  return { overrides, calls };
}

/**
 * R2 fixtures for activity states that do not exist yet in real data (no email has been sent): a busy queue, a failing
 * sync, a live attribution table. Applied per page with page.route and removed afterwards; the app and the shared
 * database are untouched, and every screenshot taken under a fixture is named for it in the evidence.
 */
export function activityFixture(kind, leads) {
  const now = Date.now(), iso = ms => new Date(now - ms).toISOString(), MIN = 60000, DAY = 86400000;
  const pick = leads.filter(l => !/example/i.test(l.name)).slice(0, 6);
  const [reply, bounce, quiet, dm, joined] = pick;
  const stat = (l, o) => ({ slug: l.tracked_slug, email: 'fixture@example.invalid', sent: 2, opened: 3, replied: 0, clicked: 0, bounced: false, unsubscribed: false, interest: null, lastOutboundAt: iso(6 * DAY), lastInboundAt: null, lastOpenAt: iso(2 * DAY), lastClickAt: null, syncedAt: iso(3 * MIN), ...o });
  const healthy = { state: 'ok', lastOkAt: iso(3 * MIN), lastAttemptAt: iso(3 * MIN), lastError: null, failedSince: null, consecutiveFailures: 0, counts: { campaign: 'found', matched: 4, sent: 8, opened: 9, replied: 1, bounced: 1 } };
  const base = { generatedAt: iso(0), sync: healthy, queue: [], stats: {}, attribution: { live: false, since: null, rows: [], clicks: 0, signups: 0, lastSignupAt: null }, errors24h: 0 };
  if (kind === 'busy' || kind === 'attributed') {
    base.stats = { [reply.tracked_slug]: stat(reply, { replied: 1, lastInboundAt: iso(5 * 3600000) }), [bounce.tracked_slug]: stat(bounce, { bounced: true, opened: 0 }), [quiet.tracked_slug]: stat(quiet, { lastOutboundAt: iso(9 * DAY) }), [dm.tracked_slug]: stat(dm, { sent: 0, lastOutboundAt: null }) };
    base.queue = [
      { slug: reply.tracked_slug, name: reply.name, kind: 'reply', reason: 'Replied and waiting for your answer', since: iso(5 * 3600000), days: 0 },
      { slug: bounce.tracked_slug, name: bounce.name, kind: 'bounce', reason: 'Email bounced — find another contact', since: iso(2 * DAY), days: 2 },
      { slug: quiet.tracked_slug, name: quiet.name, kind: 'followup', reason: 'No reply in 9 days', since: iso(9 * DAY), days: 9 },
      { slug: dm.tracked_slug, name: dm.name, kind: 'followup', reason: 'No reply in 6 days', since: iso(6 * DAY), days: 6 },
    ];
    if (kind === 'attributed') base.attribution = { live: true, since: iso(3 * DAY), rows: pick.slice(0, 4).map((l, i) => ({ slug: l.tracked_slug, name: l.name, clicks: 40 - i * 9, signups: 6 - i * 2 })), clicks: 94, signups: 8, lastSignupAt: iso(2 * 3600000) };
  }
  if (kind === 'failing') base.sync = { state: 'failing', lastOkAt: iso(95 * MIN), lastAttemptAt: iso(2 * MIN), lastError: 'Instantly read failed (HTTP 401). Check API key read scopes, plan and availability.', failedSince: iso(80 * MIN), consecutiveFailures: 6, counts: healthy.counts };
  if (kind === 'stale') base.sync = { ...healthy, state: 'stale', lastOkAt: iso(70 * MIN), lastAttemptAt: iso(70 * MIN) };
  if (kind === 'busy' || kind === 'attributed') base.timeline = slug => {
    const s = base.stats[slug];
    return { syncedAt: iso(3 * MIN), steps: [
      { key: 'sent', label: 'Sent', done: !!s?.sent, at: s?.lastOutboundAt ?? null, detail: s?.sent ? `${s.sent} emails sent` : 'Not sent yet' },
      { key: 'opened', label: 'Opened', done: !!s?.opened, at: s?.lastOpenAt ?? null, detail: s?.opened ? `${s.opened} opens` : 'No opens yet' },
      { key: 'replied', label: 'Replied', done: !!s?.replied, at: s?.lastInboundAt ?? null, detail: s?.replied ? '1 reply' : 'No reply yet' },
      { key: 'clicked', label: 'Clicked', done: false, at: null, detail: 'No link visits yet' },
      { key: 'signed_up', label: 'Signed up', done: false, at: null, detail: 'Attribution starts when the signup link is live' },
    ] };
  };
  return base;
}
export async function mockActivity(page, kind, leads) {
  const fx = activityFixture(kind, leads); const posts = [];
  await page.route('**/api/activity', async route => { try { const { timeline, ...body } = fx; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); } catch { /* page closed */ } });
  await page.route(/\/api\/leads\/[^/?]+\/activity$/, async route => { try { const slug = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-2)); if (fx.timeline) await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fx.timeline(slug)) }); else await route.fallback(); } catch { /* page closed */ } });
  await page.route('**/api/sync**', async route => { try { posts.push(route.request().url()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ran: true, ok: true }) }); } catch { /* page closed */ } });
  return { fx, posts };
}
