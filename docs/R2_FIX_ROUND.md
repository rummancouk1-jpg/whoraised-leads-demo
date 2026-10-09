# R2 fix round — preview verification in progress

Branch `design/elevation`; preview only, no promotion. Updated 9 October 2026.

Isolation has executed, not merely been prepared. Preview/dev use Neon branch `br-raspy-fog-b7rr7e4r` with its own endpoint and rotated child-only password. All 15 Vercel database aliases were split while production values were preserved. A real signed-in preview PATCH was observed directly in the child branch and restored; SELECT-only comparisons against the original preflight confirmed unchanged counts and row hashes for all 13 production tables. Evidence: `evidence/r2-fix/isolation.json`, `isolation-proof.json`.

The permanent real-code replay passed 18/18, and the complete Playwright suite passed 20/20. Build and lint pass (lint has existing warnings). PostgreSQL integration covers atomic leases, distributed budgets, rollback and edit/undo conflicts; contention exposed local transport timeouts and the final integration run remains pending. The remote viewport matrix found a shared sizing cascade override, a touch focus-return gap and a timezone hydration mismatch; their fixes are being verified.

All 27 audit items have implementation changes under verification except the off-machine performance result, which is pending execution. The preview Neon function scheduler is deployed with enabled 15-minute sync and Monday digest triggers. It targets the isolated preview only. The Lighthouse workflow runs all four categories, three mobile and three desktop passes per signed-in page, uses repository-held protection/login secrets, and redacts them from artifacts. No gate is claimed passed until its final evidence exists.

Current preview: https://whoraised-leads-demo-7gb6k2vxa-rummancouk1-9706s-projects.vercel.app

| Gate | Current evidence |
|---|---|
| Replay 18/18 | Passed; permanent suite, `evidence/r2-fix/replay/replay.json` |
| Matrix 36 configs / axe 0 | Pending rerun after measured shared fixes |
| Off-machine Lighthouse four categories >=90 | Workflow prepared; pending result |
| All tests green | 20/20 passed; final rerun pending |
| Prod counts and hashes unchanged | Passed on actual new preview write; final comparison pending |
