# Story 40.5 test evidence

Date: 2026-10-04  
HEAD at last Playwright rerun: working tree after 430/767 mobile Back assertions (commit after this evidence).

## Unit

| Suite | Result |
| --- | --- |
| Affected Vitest (`continuity-context`, `follow-up-category`, `admin-nav`, `dashboard-view-mode`, `admin-route-motion`) | Pass after updating the activity-tab source assertion to `selectTab` |
| Full Vitest | **92 files / 605 tests pass** |

## Typecheck and build

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| Targeted ESLint on 40.5 files | Pre-existing `react-hooks/set-state-in-effect` / memoization findings only. No new rule categories introduced. |
| `npm run build` (Next.js 16.3 production) | Pass |

## Backend

No API or schema change. Backend unit/integration not required.

## Playwright

| Suite | Result |
| --- | --- |
| `e2e/continuity-40-5.spec.ts` | **1/1 pass** |
| Protected 38.5 | 4/4 pass |
| Protected 38.6 | 1/1 pass |
| Protected 39.1 | 1/1 pass |
| Protected 39.2 | 1/1 pass |
| Protected 39.3 | 5/5 pass |
| Protected 39.4 | 0/1 — `client-profile 768 clipped` (pre-existing F from Story 39.4 / 40.4; assertion not weakened) |
| Protected 39.5 | 2/2 pass |
| Protected 40.1 | 5/5 pass |
| Protected 40.2 | 7/7 pass |
| Protected 40.3 | 9/9 pass |
| Protected 40.4 | 6/6 pass |
| Form Studio 36.4 / 36.5 / 36.6 / 36.7 | Pass |
| Epic 35 | 30/30 pass on serial rerun (two parallel `response?.ok()` flakes on public `/register`, unrelated to admin `ctx`) |

## URL proofs

See `url-history-proofs.json` and `viewports/`.
