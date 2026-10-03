# Story 39.5 ATDD

## Forced-error mechanism

Server page `notFound()` when `NODE_ENV === "production"`. In development/test a client child throws once (`e2e-forced-route-error` is never rendered). Retry/`reset()` remounts the recovered idle state.

Why this cannot expose a production trigger: the thrower is unreachable after the server `notFound()` branch. No query, cookie, or header can force a throw in production.

Paths: `/e2e-force-error` (root `error.tsx`), `/dashboard/e2e-force-error` (admin `error.tsx`). Underscore-prefixed folders are private in App Router and would not route.

## Required cases

| Case | Proof |
| --- | --- |
| Marketing unmatched | `/nope-px2-39-5` → h1 Page not found, Home `/`, one main |
| Admin unmatched | `/dashboard/nope-px2-39-5` → same h1, Dashboard, one `main#main-content` |
| Admin entity descendants | `/clients/{id}/extra`, `/activities/{id}/extra`, `/campaigns/{id}/extra`, `/billing/checkout/extra`, `/reports/extra` stay in Workspace nav + `main#main-content` |
| Offline auto-retry | `setOffline(false)` recovers the force-error idle trigger without clicking Try again |
| Platform unmatched | `/platform/nope-px2-39-5` → Platform home when console shown; else platform login gate |
| Forced error | `/dashboard/e2e-force-error` → This screen failed; Retry recovers |
| Offline | `context.setOffline` on error surface → approved offline sentence |
| h1 focus | `document.activeElement` is the h1 |
| Privacy | document text excludes `e2e-forced-route-error`, `digest`, stack frames |
| 48px public | Home bounding box ≥48 on marketing 404 |
| 390 / 1440 | no `scrollWidth` overflow |
| Dark / forced-colors | evidence screenshots |

## Evidence dir

`_bmad-output/planning-artifacts/evidence/px2-39-5/viewports/`
