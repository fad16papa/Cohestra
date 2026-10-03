# Story 40.1 post-merge verification

Date: 2026-10-03  
Accepted implementation commit: `4961dde68844c1b96702a90767dcf1d38e3bbb36`  
Implementation merge SHA: `e269afc69a6661bfb653df17212dfbe2260d0f19` (PR #367)  
PR HEAD at merge: `34569485288a0f709e9d5c10b41bc0d6392c16fc`

## Required main CI

Run [`37133892588`](https://github.com/fad16papa/Cohestra/actions/runs/37133892588) on `e269afc6` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy remains classification **C** (empty SSH host/username/key on prior main deploys). Not a 40.1 defect. Production not claimed.

## Live smoke (`E2E_LIVE_STACK=1`, `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_API_BASE_URL=http://localhost:8080`)

On synchronized `main` `e269afc6`:

| Check | Result |
| --- | --- |
| `lib/dashboard-view-mode.test.ts` | **9 passed** — query/preference, invalid → overview, pin, true no-op |
| `lib/admin-route-motion.test.ts` | **8 passed** — pathname-only key for `?view=` |
| `lib/page-header.test.ts` | **3 passed** — h1 Dashboard, greeting is `<p>` |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** — hierarchy, history Back, query over preference, true no-op, honest follow-up/metrics errors, skip, 390/1440 overflow, tabs ≥44 |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/page-header-39-4.spec.ts` | Classification **D** — 43.999px vs 44 on client WhatsApp. Assertion not weakened. |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |

## Reconfirmed on merged tree

- One `main#main-content` and one h1 `Dashboard`
- Overview / Graphs / Table via `?view=`; default may omit
- Query overrides stored preference; preference only when `view` is absent
- Overview → Graphs → Back restores Overview
- Re-selecting Table with stored `graphs` does not write preference, emit an event, or change history
- Needs attention and Needs follow-up stay truthful; follow-up 500 is not “all caught up”
- Needs follow-up primary action remains `/follow-up` (Epic 39 stub; 40.2 not started)
- No page overflow at 390px
- Query-only view changes do not remount the pathname route-enter wrapper

## Tracker

Story 40.1 → `done`. Epic 40 → `in-progress`. Story 40.2 not created.
