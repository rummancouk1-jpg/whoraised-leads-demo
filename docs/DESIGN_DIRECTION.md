# GG Outreach — design direction

Written before implementation (8 October 2026). The goal: David or Ian opens GG Outreach on an iPhone and understands where the campaign stands in five seconds, and a desktop user can drive the whole product without the mouse.

This is a *component-level* adoption list. Each row names something the reference product does and where it lands in this codebase. Nothing here changes data, routes or authentication, and nothing may break the client-readiness fixes (test clicks excluded, truthful inbox states, no QA traces, Reddit source health internal-only).

## 1. What we take from each reference

### Linear — density, keyboard speed, calm motion
| Linear does | We adopt | Lands in |
|---|---|---|
| ⌘K palette: one box for jump-to, search records and run commands; recent items first; fuzzy match | `CommandPalette`: pages, every lead (open drawer), commands (import, export, theme, saved views, shortcuts, refresh, log out). Arrow keys + Enter, Esc closes, focus is trapped and restored | `components/shell/CommandPalette.tsx` |
| Single-key shortcuts, `g` then a letter to go somewhere, `?` lists them | `g h / g p / g e`, `/` focus search, `?` help, `⌘Z` undo last move | `components/shell/Shortcuts.tsx` |
| Row height 36–40 px on desktop, no decorative chrome | Lead table rows 40 px at ≥1100 px; 12 columns collapse to the 5 that matter on a phone | `globals.css` table rules |
| Optimistic change, toast with **Undo**, never a spinner | Stage moves apply instantly, toast "Moved X to Replied · Undo" for 8 s (pauses on hover/focus), `⌘Z` too | `contexts/ToastContext.tsx`, `OutreachContext.update` |
| Views are first-class tabs (saved filter sets) | `SavedViews` bar: built-in views plus "Save current filters"; stored per viewer | `components/outreach/SavedViews.tsx` |
| Relative times ("3 d ago"), exact on hover | `RelTime` everywhere a timestamp appears | `components/ui/RelTime.tsx` |
| Short, ease-out motion that never blocks | 150–250 ms spring-like easing, transform/opacity only | motion tokens |

### Attio — pipeline and record drawers (the direct category)
| Attio does | We adopt | Lands in |
|---|---|---|
| Board columns with stage colour + live count; cards show only what you decide on | Column header = dot + name + count; card = name, handle, 3 tags, audience · signups, fit score | `Board.tsx` |
| Record opens in a right-hand peek, sections stacked: summary, fields, activity | Drawer sections ordered: summary (stage + fit) → edit → draft → evidence | `LeadDrawer.tsx` |
| Filter chips under the view tab instead of a wall of selects | Filters collapse into a "Filters" disclosure; active ones show as removable chips | `Workspace.tsx` |
| Move a record by drag **or** an explicit control | Drag handle (pointer + keyboard) **and** a per-card stage control (the touch / WCAG 2.5.7 path) | `Board.tsx` |

### Stripe Dashboard — numbers people trust
| Stripe does | We adopt |
|---|---|
| Metric tile = label, big tabular figure, one line of context, freshness stamp | `.gg-status-strip` tiles: `tabular-nums`, "Updated 2 min ago" via `RelTime`, never a bare ISO string |
| Honest empty/unknown states: "—" plus a reason, never a fabricated 0 | Existing truthful copy stays; unknowns remain "Awaiting data" with the reason in the subline |
| Skeletons shaped like the final content, reserving height | Skeletons for status line, tiles, rows, cards, tables; heights match loaded content so nothing shifts |
| Status badges: coloured dot + word | Stage and campaign badges use dot + text (never colour alone) |

### Vercel Dashboard — status clarity
| Vercel does | We adopt |
|---|---|
| A deployment is one word and one dot: Ready / Building / Error | The campaign has one plain sentence at the top of Home: `52 creators & communities queued · 8 inboxes warming · sending starts Oct 19`. The date and counts come from the database and Instantly; with no send date it reads "sending starts once the signup link is live" |
| Monospace for identifiers, system sans for prose | Geist Mono for slugs and addresses |
| Focus ring is a design element, not an afterthought | 2 px high-contrast ring with offset, never clipped, never hidden under sticky bars (`scroll-padding`) |

### Apple HIG — type, materials, spacing, light/dark
| HIG says | We adopt |
|---|---|
| Text scales; nothing under ~12 pt; body ≥ 16 px for inputs (no iOS zoom) | Fluid scale `--step--1 … --step-4` using `clamp()`; every field ≥ 16 px on touch |
| Hit targets ≥ 44 × 44 pt | All buttons, links in chrome, tabs, selects, checkboxes: ≥ 44 px on touch and ≤ 900 px widths (desktop keeps 32–36 px density) |
| Tab bar for primary destinations on phones; sheets for detail | Bottom tab bar (Home / Pipeline / Email / Search) on phones; the lead drawer becomes a bottom sheet ≤ 820 px |
| Materials: translucent bars over content, with a solid fallback | Header and tab bar use `backdrop-filter` with opaque fallback under `prefers-reduced-transparency` / unsupported |
| Safe areas | `viewport-fit=cover`, `env(safe-area-inset-*)` on header, tab bar, sheets, toasts |
| Semantic colour, both appearances | Token palette with light and dark values; follows the system, with an explicit System / Light / Dark override |
| Reduce Motion is honoured | One rule removes every animation and transition; behaviour never depends on motion |

## 2. Tokens

**Colour** (semantic, both schemes; dark is not "inverted light"): `--bg`, `--surface`, `--surface-2`, `--surface-raised`, `--line`, `--line-strong`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-text`, `--ok`, `--warn`, `--bad`, `--focus`. Every text/background pairing is chosen to pass WCAG 2.2 AA (4.5:1 body, 3:1 large text and UI boundaries) and is machine-checked by axe in both schemes.

**Type** (fluid, `clamp()` between a 390 px phone and a 1440 px desktop):

| Token | Range | Use |
|---|---|---|
| `--step--1` | 0.8125 → 0.8125 rem | meta, table header, badges |
| `--step-0` | 0.9375 → 0.875 rem… 1 rem | body, controls (never below 16 px in inputs) |
| `--step-1` | 1.0625 → 1.125 rem | card titles, tile labels |
| `--step-2` | 1.25 → 1.5 rem | section headings, tile figures |
| `--step-3` | 1.5 → 2 rem | page title |
| `--step-4` | 1.75 → 2.75 rem | **the status line** |

**Space**: 4 px base, 8 px rhythm (`--s-1 … --s-8`). **Radius**: 8 / 12 / 20. **Elevation**: one hairline plus one soft shadow; in dark, raised surfaces get *lighter*, not shadowier.

**Motion** (`--ease-spring` is a `linear()` spring with ~6 % overshoot, falling back to `cubic-bezier(.2,.9,.3,1.1)`): `--d-fast` 150 ms (hover, press), `--d-base` 200 ms (toast, menu), `--d-slow` 250 ms (sheet, palette). Only `transform` and `opacity`. `prefers-reduced-motion: reduce` sets every animation and transition to none; state changes remain instantaneous and complete.

## 3. Layout by viewport

* **Phone (390)** — slim top bar (brand, search, theme, Log out), bottom tab bar, one column. Home order is fixed: *status line → the four numbers → pipeline stages → lead list*. Lead rows show name/handle, fit score, stage, Draft. Board scrolls horizontally with snap and a stage-jump chip row. Drawer is a bottom sheet.
* **Tablet (820)** — same shell; tiles 2 × 2; lead table shows 8 columns; board shows 2.3 columns.
* **Desktop (1440)** — top bar with segmented navigation and the ⌘K field; tiles in one row; full table; drawer on the right.

Every feature works at every size. Desktop-only affordances have a phone equivalent: ⌘K ↔ search button; keyboard drag ↔ per-card stage control; hover tooltips ↔ tap/long-press on any `RelTime`.

## 4. PWA

Installable (192/512/maskable icons, `id`, `scope`, shortcuts), iOS home-screen standalone (`apple-touch-icon`, `appleWebApp` with the `default` status bar so the clock stays legible in both appearances, per-device launch images in light and dark), `theme-color` per scheme. The service worker caches **only** hashed static assets and icons. It never stores a page, an API response, or anything behind the session cookie; navigations always go to the network and fall back to a static, data-free offline page. The worker is registered only inside the signed-in workspace; logging out deletes every Cache Storage entry, unregisters the worker and clears viewer storage, and the login page does not bring it back.

## 5. Non-negotiables carried over from the audit

Same data, same routes, same auth and CSP (every inline script carries the request nonce). Test clicks stay excluded; inbox states stay truthful ("Warming up", "Awaiting metrics", never a fabricated zero); no QA wording anywhere a client can see; Reddit source health stays internal. Selectors and accessible names used by the audit scripts (`.gg-name-button`, `.gg-status-strip > div`, "Search leads", "Show long tail", "Close dialog", "Log out", region names on the Email tables, …) are preserved so the full audit re-run exercises the new UI unchanged.

## 6. Deliberately not adopted

Left sidebar navigation (Linear/Attio) — three destinations do not justify it, and it costs phone width. Multi-user presence and comments — no data model for it. Shared (team) saved views — would need a new table; views are per-viewer and local. Web push — nothing in scope sends notifications.

## 7. What changed between the plan and the build

* **The status sentence is server-rendered.** Waiting for two client fetches put mobile LCP at 3.6 s and CLS at 0.245. The layout now computes the lead counts and reads the newest saved Instantly snapshot, so the sentence is in the first HTML; the client then replaces it with live values. The list, board and click tile keep their skeletons.
* **No left rail, no shared views, no comments** (section 6) held. Saved views are per viewer and cleared on logout.
* **Selects are custom-drawn** (appearance reset with an inline chevron) because WebKit's native control looked heavy on the dark board.
* **Toast Undo is mouse/touch/`⌘Z`.** While a drawer is open the page behind it is inert; the toast region is exempt so Undo stays reachable, and the drawer's own Stage select is the keyboard path back.
* **Optimistic saves invalidate in-flight reads.** A poll that began before a save landed could overwrite the screen with the old value; every completed save now bumps the revision so such a response is discarded.
* **The service worker registers only inside the signed-in workspace**, so logging out leaves nothing behind and the login page never recreates a cache.
* **Copy follows the audit's banned-word list** ("unavailable" never appears; the status line says "couldn't read inbox status").
