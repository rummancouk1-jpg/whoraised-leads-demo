// Proves server-side error capture on the deployment: trigger the canary, then read it back from the Watch feed.
import fs from 'node:fs';
import { bearer, previewUrl } from './vcl.mjs';
const token = process.env.R2_OHQ_TOKEN; const out = { url: previewUrl, at: new Date().toISOString() };
const before = bearer(token, '/api/ohq/watch').json.errors_24h.filter(e => e.name === 'MonitoringCanary').reduce((n, e) => n + e.count, 0);
const hit = bearer(token, '/api/ohq/canary'); out.canaryStatus = hit.status;
await new Promise(r => setTimeout(r, 2500));
const watch = bearer(token, '/api/ohq/watch').json; const rows = watch.errors_24h.filter(e => e.name === 'MonitoringCanary');
const after = rows.reduce((n, e) => n + e.count, 0); out.row = rows[0] && { ...rows[0], fingerprint: rows[0].fingerprint.slice(0, 12) + '…' }; out.alertsAfter = watch.alerts;
out.ok = hit.status === 500 && after === before + 1 && rows[0]?.surface === 'server' && rows[0]?.route === '/api/ohq/canary' && !/@/.test(JSON.stringify(rows)) && !watch.alerts.some(a => /new error/.test(a.reason));
console.log(out.ok ? 'PASS' : 'FAIL', 'server error captured and visible in the Watch feed', JSON.stringify({ status: hit.status, before, after, row: out.row }));
fs.writeFileSync('evidence/r2/preview-canary.json', JSON.stringify(out, null, 2)); process.exit(out.ok ? 0 : 1);
