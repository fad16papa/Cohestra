# Story 39.5 adversarial review

Model: Grok 4.6 (`bmad-review-adversarial-general`)  
HEAD: post-PO-correction implementation (admin catch-alls + offline auto-reset).

## Required probes

| Probe | Result |
| --- | --- |
| Boundary ownership gaps | Every `ADMIN_PATH_PREFIXES` folder has a nested `[...unmatched]`. Entity `[id]` pages remain. `/billing/checkout` and `/billing/paddle-return` remain in the production route table. |
| Infinite retry/reset loops | Auto-reset is the first offline→online transition only (`hasAutoReset`). Mount-online does not reset. Repeated `online` events do not reset again. |
| Incorrect redirect destinations | Matrix unchanged in `route-boundary.ts`. |
| Auth failures disguised as 404 | Team/Billing denied copy unchanged. Platform unauth → login. |
| Plan locks disguised as crashes | UpgradePanel / 38.1 / 38.2 still render (38.2 Playwright green with API on :8080). |
| Named-state truthfulness | Offline copy now invokes `reset()` on reconnect. 404 never becomes offline. |
| Raw exception disclosure | UI copy only; `console.error` digest only. |
| Production forced-error hooks | `isForceErrorBlocked('production')` → `notFound()`. |
| Nested main / duplicate h1 | Admin/platform/public primitives do not render `main`. Playwright: one h1 / one `main#main-content` plus `data-admin-shell`. |
| Studio remount / draft loss | No `loading.tsx`. Website editor still mounts for Pro. |

## Cynical leftovers (not blockers)

- Force-error URLs exist in the production route manifest and 404 there.
- Admin breadcrumbs stay path-derived on unmatched descendants.
- Content-language `{tenant}` is “this workspace”.
- 39.4 43.999px vs 44 remains a classification D residual.

No unresolved BLOCKER or MAJOR.
