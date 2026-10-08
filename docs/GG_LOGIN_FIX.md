# GG Outreach login release

Released October 7, 2026 (Asia/Karachi). [Production login](https://whoraised-leads-demo.vercel.app/login).

## Changes and blur diagnosis

The previous card was 420px wide, with a 30px title, 10–12px body/label/control text and 38px controls. Its body line height was 21.6px, and grid centering could place the card and text at fractional coordinates. No transform, filter, backdrop-filter or will-change was found on the login's text ancestors. The soft appearance was consistent with undersized text and fractional placement rather than a blur effect.

Login now has dedicated styles: a quiet opaque dark card, 500px desktop width, 13px tracked eyebrow, 42px/600 title, 17px body and control text, 15px labels/help/errors, 56px controls, and 32px section spacing. Tablet uses a 40px title and 32px card padding; mobile uses a 34px title, 16px body, 24px padding and 28px section spacing. Line heights and measured text/control bounds are whole pixels. The login restores native font smoothing instead of inheriting forced grayscale smoothing.

The subtitle is exactly “Private workspace for the GG team only.” Root title, description, OG and Twitter tags use generic workspace copy. Robots disallows crawling and metadata sets noindex/nofollow. Manifest contains generic workspace copy. Errors use fixed public messages rather than arbitrary server details.

Password receives autofocus, Enter submits, Show/Hide preserves its value, and loading disables the submit button. A synchronous submission guard prevents duplicate requests. The inline accessible error has reserved space; measurements confirm both card and button remain stationary when it appears. Typing clears the error.

## Evidence

| Gate | Result |
|---|---|
| 390 / 820 / 1440 / 1920, 1x and 2x DPR, normal and reduced motion | All 16 combinations PASS locally and on production |
| Default and wrong-password screenshots | 32 screenshots per environment, plus loading/text proof and native title/input crops |
| Whole-pixel geometry, font sizes, no filtered/scaled/composited text ancestors | PASS in every combination |
| Screenshot equality between local production build and live release | All 16 default captures have identical raw pixels and geometry |
| Autofocus, Enter, show/hide, loading, duplicate prevention, error reset | PASS |
| Inline error card/button movement | Zero in every combination |
| Real wrong-password request | 401, correct inline message locally and live |
| Real valid-password request, secure HttpOnly SameSite Strict cookie, redirects, logout | PASS locally and live; credentials and private pages were not captured |
| Unauthenticated workspace routes | `/`, `/pipeline`, `/email` redirect to `/login`; `/api/leads` returns 401 |
| Personal-name grep | `rg -n -i '\b(david|ian)\b' src public` returns no matches (exit 1), zero hits across all application and public source |
| Rendered public name scan | Zero hits in `/login`, root/pipeline/email redirects, metadata, robots, manifest and 404 |
| Production build, TypeScript, ESLint, existing contract tests | PASS |
| Production error log query | No error logs returned for the requested 10-minute window |

Evidence: [live matrix](../evidence/login/live/PARITY.md), [local matrix](../evidence/login/local/PARITY.md), [live measurements/public audit](../evidence/login/live/results.json), [real live authentication checks](../evidence/login/live/access.json), [pixel comparison](../evidence/login/comparison.json), [visual gallery](../evidence/login/live/index.html).

Native 100% screenshots, cropped without resizing: [title at 1440/1x](../evidence/login/live/crop-title-1440-1x.png), [input at 1440/1x](../evidence/login/live/crop-input-1440-1x.png). Input proof contains synthetic text, never a real password. Matrix interaction checks hold mocked 401 responses to inspect loading; separate real API checks verify actual authentication.

Old evidence and internal operations documents remain historical artifacts outside public routes. They are excluded from deployment source uploads, along with tests, scripts and unrelated local worktrees. The zero-hit claim covers application/public source and unauthenticated HTTP surfaces, not historical documentation or test regexes.

## Deployment

- URL: https://whoraised-leads-demo.vercel.app/login
- Target: production; status: READY
- Project: `whoraised-leads-demo`, `prj_hmmvsjJtmK2Oour8oBpj3mBeMHL2`
- Team: `rummancouk1-9706s-projects`, `team_hRjHSu4sSUQnuotRYCgsIo19`
- Deployment: `dpl_BY67QHDQpNDi2yx8DNBDBSx8sJZt`
- [Deployment inspector](https://vercel.com/rummancouk1-9706s-projects/whoraised-leads-demo/BY67QHDQpNDi2yx8DNBDBSx8sJZt)
- Framework: Next.js 16.3.8; build duration: 24 seconds
- Source: existing checkout based on `0b9c022`, including its pre-existing uncommitted GG Outreach work and this login fix. No commit or Git push was made.

The first release served updated markup with the previous CSS. The live whole-pixel check rejected it immediately. A production redeploy with `--force`, skipping the restored build cache, resolved the stale stylesheet; the final live screenshots exactly match local. The initial failure is retained as [diagnostic screenshot](../evidence/login/live-first-check.png).

Verification is Chromium on this Windows host with simulated DPR and reduced-motion settings. It does not claim Safari/Firefox or physical-device testing. Runtime log query is bounded evidence, not long-term monitoring; drains and monitoring configuration were not changed.

Reproduce with `node scripts/verify-login.mjs <origin> <local|live>`. Real successful-access checks use `node scripts/verify-login-access.mjs <origin> <local|live>` and read the existing ignored private configuration without logging it.
