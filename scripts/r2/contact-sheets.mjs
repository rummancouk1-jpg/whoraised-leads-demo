// Contact sheets from the R2 parity matrix. One sheet per state: columns = 390 / 820 / 1440 (iPhone WebKit, iPad WebKit, Chrome),
// rows = light / dark (reduced motion). A second sheet per key state compares engines at 1440 and 390.
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = 'evidence/r2', out = `${root}/contact-sheets`;
await fs.mkdir(out, { recursive: true });
const m = (cfg, scheme, state, motion = 'reduce') => `${root}/matrix/${cfg}/${scheme}-${motion}-${state}.png`;
const exists = f => fs.access(f).then(() => true, () => false);
const states = {
  'home': 'Home — status sentence, Needs action today, numbers with freshness stamps (real data)',
  'real-needs-empty': 'Needs action today — real data: no email has been sent yet',
  'fixture-busy-queue': 'Needs action today — fixture: replies, a bounce, follow-ups due',
  'fixture-busy-timeline': 'Lead drawer — Sent → Opened → Replied → Clicked → Signed up (fixture)',
  'fixture-attributed-queue': 'Home with the signup link live (fixture)',
  'fixture-attribution-live': 'Clicks → signups per creator (fixture; the real state is "starts when the signup link is live")',
  'fixture-sync-failing': 'Sync failing — visible warning, last good time, reason, Sync now (fixture)',
  'fixture-sync-stale': 'Sync behind schedule — warning (fixture)',
  'email-sync-detail': 'Email — Instantly sync detail (real data)',
  'email-digest-preview': 'Email — weekly digest preview, sending off (real data)',
  'drawer': 'Lead drawer (real data)',
};
const viewport = [['390', 'webkit-iphone-390'], ['820', 'webkit-ipad-820'], ['1440', 'chrome-1440']];
const engines = [['Chrome 1440', 'chrome-1440'], ['Edge 1440', 'msedge-1440'], ['WebKit 1440', 'webkit-1440'], ['Chrome 390', 'chrome-390'], ['iPhone WebKit 390', 'webkit-iphone-390']];
const H = { 390: 640, 820: 640, 1440: 480 };
const b = await chromium.launch({ channel: 'chrome' });
const written = [];
async function sheet(file, title, subtitle, cols, rows, height) {
  let any = false, body = '';
  for (const [rowLabel, scheme] of rows) {
    let cells = '';
    for (const [colLabel, cfg, state] of cols) {
      const f = m(cfg, scheme, state);
      if (await exists(f)) { any = true; cells += `<td><div class="c">${colLabel}</div><img src="data:image/png;base64,${(await fs.readFile(f)).toString('base64')}" style="max-height:${height(colLabel)}px;max-width:100%"></td>`; }
      else cells += `<td><div class="c">${colLabel}</div><div class="none">not captured</div></td>`;
    }
    body += `<tr><th>${rowLabel}</th>${cells}</tr>`;
  }
  if (!any) return;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#f1f5f9;font:14px system-ui;color:#0f172a}h1{font:600 20px system-ui;margin:0 0 4px}p{margin:0 0 16px;color:#475569}table{border-collapse:separate;border-spacing:12px}th{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:600;color:#334155}td{vertical-align:top}img{display:block;border:1px solid #cbd5e1;border-radius:6px}.c{font-weight:600;margin-bottom:4px}.none{width:200px;height:120px;border:1px dashed #94a3b8;border-radius:6px;display:grid;place-items:center;color:#64748b}</style><h1>${title}</h1><p>${subtitle}</p><table>${body}</table>`;
  const c = await b.newContext({ viewport: { width: 1900, height: 800 } }); const p = await c.newPage();
  await p.setContent(html); await p.waitForLoadState('load'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${file}.png`, fullPage: true }); await c.close(); written.push([file, title]);
}
for (const [state, title] of Object.entries(states)) {
  await sheet(state, title, 'Columns: phone 390 · tablet 820 · desktop 1440. Rows: light, dark. Reduced motion. Fixture sheets use mocked activity data over real leads; every other sheet is real data.',
    viewport.map(([w, cfg]) => [w, cfg, state]), [['Light', 'light'], ['Dark', 'dark']], w => H[w]);
}
for (const state of ['home', 'fixture-busy-queue', 'fixture-sync-failing']) {
  await sheet(`engines-${state}`, `${states[state]} — engines`, 'Chrome, Edge and WebKit at 1440; Chrome and iPhone WebKit at 390. Light and dark, reduced motion.',
    engines.map(([label, cfg]) => [label, cfg, state]), [['Light', 'light'], ['Dark', 'dark']], label => /390/.test(label) ? 560 : 360);
}
await b.close();
await fs.writeFile(`${out}/index.md`, `# R2 contact sheets\n\n${written.map(([f, t]) => `- [${t}](${f}.png)`).join('\n')}\n`);
console.log('sheets', written.length);
