# Story 41.1 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `c92149eb1adf94f3ce1248c638b895196c014856`  
Implementation merge SHA: `f1ea0b136425dc0b1fcd7c043c7198d1e1fd2893` (PR #377)  
PR HEAD at merge: `c92149eb1adf94f3ce1248c638b895196c014856`  
`c92149eb` is an ancestor of `f1ea0b13`.  
Merge parents: `6d9c6af8b1ad8dc26e1c8e95722476e50736c3f8` + `c92149eb1adf94f3ce1248c638b895196c014856`.

## Required main CI

Run [`37189725262`](https://github.com/fad16papa/Cohestra/actions/runs/37189725262) on `f1ea0b13` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy remains the existing classification **C** path (empty/missing droplet SSH host/credentials). Credentials and infrastructure were not modified. Production not claimed.

PR CI on #377 is not the close signal. Final-head PR CI was [`37188945398`](https://github.com/fad16papa/Cohestra/actions/runs/37188945398) on `c92149eb` (5/5) before merge.

## Focused post-merge tests on synchronized `main` `f1ea0b13`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| Affected Analytics Vitest (`reports-api`, filter history, motion, admin-nav) | **23 passed** |
| `ReportService` / `ReportDashboard` unit tests | **11 passed** |
| `Admin_ReportExport` isolation integration | **1 passed** |
| `e2e/analytics-41-1.spec.ts` | **5 passed** — `/analytics` one main + `h1` Analytics; `/reports?preset=weekly` query-preserving redirect; Basic weekly open; Basic monthly Core lock; Core/Pro usable; 403 denied never UpgradePanel; stale/empty/error/export-disabled truthful; URL Back/Forward/refresh; Graphs `Open Analytics`; no cross-tenant ranking/export IDs; 390 no overflow; trend `sr-only` table |

## Protected Story 38.4–40.5 regressions

| Gate | Result |
| --- | --- |
| `e2e` tokens / a11y 38.4 | **8 passed** |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | **1 passed** — clip assertion still `toBe(false)`; not weakened or skipped |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** |
| `e2e/continuity-40-5.spec.ts` | **1 passed** |
| Combined Playwright | **34 passed / 0 failed** |

No assertion was weakened. No failure was converted into a skip.

## Live reconfirmations

1. `/analytics` has one `main#main-content` and one document `h1` named Analytics.
2. `/reports?preset=weekly` becomes `/analytics?preset=weekly`.
3. Basic weekly renders without UpgradePanel.
4. Basic advanced state shows the existing Core lock.
5. Entitled advanced Analytics remains usable.
6. Back/Forward and refresh preserve URL-owned state.
7. Dashboard Graphs links to Analytics and stays `/dashboard?view=graphs`.
8. Empty, error, stale, and export-disabled states remain truthful.
9. Cross-tenant ranking IDs and CSV rows remain absent.
10. 390px has no document overflow or clipped actions.
11. Trend chart has a semantic table; other charts keep named lists/descriptions.
12. Story 39.4 clip remains `toBe(false)`.

## Tracker

- `41-1-analytics-room: done`
- `epic-41: in-progress`
- Stories 41.2 and 41.3 were not created and not started

## Deferred residuals

From four-layer review on `c92149eb` — no unresolved BLOCKER or MAJOR:

- Basic monthly still fires the reports request behind the Core lock — **MINOR / defer** (wasteful, not an unlock).
- UpgradePanel still mentions saved views — **NIT / dismiss** (pre-existing copy; saved views remain a 41.2/41.3 non-goal).
- `reportFilterKey` read without being a fetch-effect dependency — **NIT**.
- Referral debounce can push multiple history entries — **NIT**.
- Export toast `"Report exported."` for zero rows is unreachable — **NIT**.

## Composer 2.5

Not used. Grok 4.6 owned FINAL HEAD REVIEW, merge, post-merge verification, CI triage, close, and reporting.
