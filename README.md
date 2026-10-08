# GG Outreach

Private shared recruiting pipeline for finance creators, trading communities and newsletters joining the Gap Gambler / Earnings Tournament. Oct 19–Nov 13, free entry, one daily pick, longest streak wins $1,000, U.S. 18+.

Next.js 16.3.8 App Router, React 19.2.4, TypeScript, Tailwind 4 and dnd-kit. Dashboard at `/`, Pipeline at `/pipeline`, read-only Email at `/email`, password gate at `/login`. Neon Postgres stores shared leads and daily Instantly metrics. No automated sending.

Production: https://whoraised-leads-demo.vercel.app. See [operations and migration](docs/GG_OUTREACH_OPERATIONS.md) and [deployment evidence](docs/GG_OUTREACH_DEPLOYMENT_REPORT.md). Configure the server-only variables listed in `.env.example` before running locally.

```sh
npm install
npm run dev
```

The workspace starts empty. Download `public/gg-outreach-template.csv`, add real leads, then use **Import CSV → Validate CSV → Import**. Historical example rows are retained only in internal audit evidence; the client download contains the blank template.

CSV columns must match exactly, in order:

```csv
name,handle,platform,kind,audience_size,niche,us_focus,contact,tracked_slug,stage,signups,last_touch,notes
```

Use enum values from `src/types/outreach.ts`. Audience/signups are nonnegative whole numbers. Contact is an email, http(s) DM URL or blank. Unique slugs use lowercase letters/numbers and single hyphens. Last touch is `YYYY-MM-DD` or blank. Quoted commas, quotes, multiline notes, CRLF and UTF-8 BOM are supported.

Add mode keeps existing slugs/edits and adds new slugs. Replace mode previews which workspace will be replaced. **Export CSV** exports the entire state, including filtered-out rows, with the same 13 columns.

Open a lead name or draft button to edit stage, notes, signups and last touch. Changes auto-save to hosted Neon Postgres and synchronize across authenticated viewers within a few seconds. Export backups. Use the one-time CSV migration option to bring over a previous browser-local export; old browser records are not silently imported.

Drag the board grip to a stage, or focus it and press Space, arrow keys, Space to drop; Escape cancels. Narrow-screen columns scroll horizontally. The drawer stage selector is also available. Reduced motion disables animations, transitions and smooth keyboard scrolling.

Edit `src/config/fit-weights.json` for weights/factors. Defaults: audience 35, niche 30, U.S. focus 20, contact 15. Suggested weights require three touched real leads and a signup. **Use suggested priorities** applies learned weights and ranks observed converting groups for the navigation session; reload returns to configured weights. It never rewrites config. Signups are recorded manually.

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
node scripts/verify-deployed.mjs https://whoraised-leads-demo.vercel.app
node scripts/render-deployed-evidence.mjs
```

`npm test` checks CSV/scoring/draft/compound contracts. The deployed gate uses two independent browsers and all requested widths/motion modes against production, imports uniquely marked EXAMPLE records, then removes only those QA records. The [original implementation report](docs/GG_OUTREACH_REPORT.md) is historical. Current [parity matrix](evidence/deployed/PARITY.md) and [screenshot gallery](evidence/deployed/index.html) record live verification.
