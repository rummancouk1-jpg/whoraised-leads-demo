import fs from "node:fs/promises";
import sharp from "sharp";

const rows = JSON.parse(await fs.readFile("evidence/parity-results.json", "utf8"));
const views = [...new Set(rows.map(r => r.view))];
const dimensions = [390, 820, 1440].flatMap(width => ["normal", "reduce"].map(motion => ({ width, motion })));
let markdown = "# GG Outreach parity evidence\n\nProduction Chromium, viewport heights 960px. Normal and prefers-reduced-motion: reduce at each requested width. Modal captures use the viewport; page captures include the complete page. All populated screenshots use synthetic QA records imported through the real CSV UI, in isolated browser contexts. No QA leads are seeded into the app.\n\n";
markdown += "| View | 390 normal | 390 reduced | 820 normal | 820 reduced | 1440 normal | 1440 reduced |\n|---|---|---|---|---|---|---|\n";
for (const view of views) {
  markdown += `| ${view} | ` + dimensions.map(d => {
    const row = rows.find(r => r.view === view && r.width === d.width && r.motion === d.motion);
    return row ? `[${row.status}](${row.screenshot})` : "Not applicable";
  }).join(" | ") + " |\n";
}
markdown += `\n${rows.length} captures; ${rows.filter(r => r.status === "FAIL").length} layout failures. Checks cover page overflow, dialog bounds, form-control clipping, and disabled CSS animations/transitions under reduced motion. Workflow tests additionally verify board scrolling, keyboard and pointer drag, persistence, clipboard and CSV round trips. See [machine-readable parity results](parity-results.json) and [test results](test-results.json).\n`;
await fs.writeFile("evidence/PARITY.md", markdown);
for (const view of ["dashboard", "pipeline", "drawer", "import-preview", "export"]) {
  const layers = [];
  for (const [i, dimension] of dimensions.entries()) {
    const row = rows.find(r => r.view === view && r.width === dimension.width && r.motion === dimension.motion);
    if (!row) throw new Error(`Missing ${view} ${dimension.width} ${dimension.motion}`);
    const buffer = await sharp(`evidence/${row.screenshot}`).resize({ width: 480, height: 820, fit: "inside" }).toBuffer();
    const meta = await sharp(buffer).metadata();
    const left = i % 3 * 500;
    const top = Math.floor(i / 3) * 870;
    layers.push({ input: Buffer.from(`<svg width="500" height="35"><text x="12" y="25" fill="white" font-size="18" font-family="Arial">${view} ${dimension.width}px ${dimension.motion} ${row.status}</text></svg>`), left, top });
    layers.push({ input: buffer, left: left + Math.floor((500 - meta.width) / 2), top: top + 40 });
  }
  await sharp({ create: { width: 1500, height: 1740, channels: 3, background: "#1e293b" } }).composite(layers).png().toFile(`evidence/review-${view}.png`);
}
await fs.writeFile("evidence/index.html", `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GG Outreach parity evidence</title><style>body{margin:32px;background:#0b0f14;color:#e2e8f0;font:14px system-ui}a{color:#a5b4fc}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}figure{margin:0;padding:12px;border:1px solid #334155;border-radius:8px}img{width:100%;height:300px;object-fit:contain;background:#111827}figcaption{padding:10px 0}</style><h1>GG Outreach parity evidence</h1><p>${rows.length} layout captures · ${rows.filter(r => r.status === "FAIL").length} failures · Chromium · QA data imported only for tests</p><p><a href="PARITY.md">Matrix</a> · <a href="test-results.json">Functional test results</a></p><div class="grid">${rows.map(r => `<figure><a href="${r.screenshot}"><img loading="lazy" src="${r.screenshot}" alt="${r.view} at ${r.width}px ${r.motion}"></a><figcaption>${r.view} · ${r.width}px · ${r.motion} · ${r.status}</figcaption></figure>`).join("")}</div></html>`);
console.log(`${rows.length} screenshots indexed; five review sheets generated.`);
