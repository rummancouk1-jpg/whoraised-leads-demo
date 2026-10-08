// Verifies the PREVIEW against live Instantly using the bearer-protected machine endpoints (no password sign-in).
// usage: R2_OHQ_TOKEN=<token the preview was deployed with> node scripts/r2/preview-reconcile.mjs
import fs from 'node:fs';
import { req, bearer, previewUrl } from './vcl.mjs';
const token = process.env.R2_OHQ_TOKEN; if (!token) throw new Error('R2_OHQ_TOKEN is required');
const out = { url: previewUrl, at: new Date().toISOString(), checks: [] };
const add = (label, ok, detail) => { out.checks.push({ label, status: ok ? 'PASS' : 'FAIL', detail }); console.log(ok ? 'PASS' : 'FAIL', label, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400)); };
for (const p of ['/api/ohq/health', '/api/ohq/watch', '/api/ohq/reconcile']) add(`${p} without a bearer is refused`, req(p).status === 401, req(p).status);
add('wrong bearer is refused', bearer('x'.repeat(20), '/api/ohq/watch').status === 401);
add('signup webhook refuses unauthenticated posts', [401, 503].includes(req('/api/attribution/signup', { method: 'POST', body: '{}' }).status));
add('cron endpoints refuse unauthenticated calls', ['/api/cron/instantly-sync', '/api/cron/digest'].every(p => req(p).status === 401));
add('app APIs refuse unauthenticated calls', ['/api/activity', '/api/digest', '/api/sync', '/api/leads'].every(p => req(p, { method: p === '/api/sync' ? 'POST' : 'GET' }).status === 401));
const t0 = Date.now(); const health = bearer(token, '/api/ohq/health'); const hMs = Date.now() - t0;
add('/api/ohq/health: JSON, 200, counts-only', health.status === 200 && health.json && !/@/.test(health.text), { status: health.status, ms: hMs, body: health.json });
const t1 = Date.now(); const watch = bearer(token, '/api/ohq/watch'); const wMs = Date.now() - t1;
add('/api/ohq/watch: JSON, 200, no addresses', watch.status === 200 && watch.json && !/@/.test(watch.text), { status: watch.status, ms: wMs });
out.watch = watch.json;
const rec = bearer(token, '/api/ohq/reconcile?sync=1'); out.reconcile = rec.json;
add('/api/ohq/reconcile?sync=1 ran the real sync against live Instantly', rec.status === 200 && rec.json?.sync_run?.ok === true, { status: rec.status, sync_run: rec.json?.sync_run, error: rec.json?.error });
for (const c of rec.json?.checks ?? []) add('source vs app: ' + c.label, c.ok, { provider: c.provider, app: c.app });
const shape = rec.json?.shape; out.shape = shape;
for (const k of ['leads', 'emails']) { const x = shape?.[k]; if (!x) continue; if (x.rows === 0) { out.checks.push({ label: `provider ${k} row shape`, status: 'UNVERIFIED', detail: 'the workspace has no ' + k + ' yet' }); console.log('UNVERIFIED provider ' + k + ' row shape: no rows in the workspace'); } else add(`provider ${k} rows carry every field the mapper reads (${x.rows} sampled)`, x.requiredMissing.length === 0, x); }
const after = bearer(token, '/api/ohq/watch'); add('after the sync: watch reports a healthy sync and no alerts', after.json?.checks?.instantly_sync?.state === 'ok' && after.json.alerts.length === 0, { sync: after.json?.checks?.instantly_sync, alerts: after.json?.alerts });
fs.writeFileSync('evidence/r2/preview-reconcile.json', JSON.stringify(out, null, 2));
process.exit(out.checks.some(c => c.status === 'FAIL') ? 1 : 0);
