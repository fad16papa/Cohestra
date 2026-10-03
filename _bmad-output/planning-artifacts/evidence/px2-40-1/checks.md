# Story 40.1 QA checks

Date: 2026-10-03  
HEAD at check time: local working tree after history-pin fix (commit follows).  
Composer 2.5: unused.

## Unit / type / lint / build

| Gate | Result |
| --- | --- |
| Affected Vitest (`dashboard-view-mode`, `admin-route-motion`, `page-header`) | 19 passed |
| Full Vitest | 88 files / 555 passed (pre-pin); pin suite 8 passed |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on 40.1 files | 0 errors after session-id / unused-import / purity fixes |
| `npm run build` (Next 16.3 production) | compiled, typed, 45 routes generated |

## Live Playwright

`E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Spec | Result |
| --- | --- |
| `e2e/dashboard-40-1.spec.ts` | 4 passed |
| `e2e/landmarks-38-5.spec.ts` | 4 passed |
| `e2e/overlays-38-6.spec.ts` | 1 passed |
| `e2e/desktop-shell-39-1.spec.ts` | 1 passed |
| `e2e/mobile-nav-39-2.spec.ts` | 1 passed |
| `e2e/entitlement-visibility-39-3.spec.ts` | 5 passed |
| `e2e/page-header-39-4.spec.ts` | 1 failed — **known 43.999px vs 44 residual** on Client WhatsApp 390. Classification D. Assertion not weakened. |
| `e2e/route-errors-39-5.spec.ts` | 2 passed |
| `e2e/tokens-38-4.spec.ts` | 5 passed (post-review HEAD) |
| `e2e/a11y-38-4.spec.ts` | 2 passed (post-review HEAD) |

## 40.1 live coverage

- Overview → Graphs → Back restores Overview (history pin of query-less entry)
- Direct `?view=table` opens Table
- Invalid `?view=kanban` → Overview
- Query overrides stored preference; preference applies when query absent
- Session id + `[data-admin-route-transition]` marker survive query-only view changes
- Skip link focuses `main#main-content`
- Needs follow-up “View all” → `/follow-up`
- Follow-up 500 is error + retry, not “all caught up”
- Metrics 500 is `ProductErrorState` on Graphs
- 390 / 1440 no page overflow; view tabs ≥44×44
- Screenshots: `evidence/px2-40-1/viewports/`
