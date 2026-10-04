# Story 41.1 test results

HEAD under test: Story 41.1 implementation including the post-review honesty patch (clear a previous error when the query key changes).

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

## Local gates

| Gate | Result |
| --- | --- |
| Affected Vitest (`reports-api`, filter history, motion, admin-nav) | 23/23 pass |
| Full Vitest | 94 files, 614 pass |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on 41.1 files | pass (0 issues) |
| Related `ReportService` / `ReportDashboard` unit tests | 11/11 pass |
| Report/export API integration tests | not re-run; API/schema unchanged |
| Production `next build` | pass (`/analytics` static, `/reports` dynamic redirect) |
| Story 41.1 Playwright | 5/5 pass (re-run after honesty patch) |
| Protected 38.4–40.5 Playwright | 51/51 pass |

## Story 41.1 Playwright (5/5)

1. Landmarks, `/reports` redirect with query preservation, invalid preset → weekly, Graphs `Open Analytics`, Back restores `view=graphs`, filter push history, pathname motion key stays stable
2. Basic weekly open; Basic monthly Core lock; Core monthly usable; Pro member weekly usable
3. Loading, empty period + disabled export reason, stale “Updating report…”, recoverable error + retry, 403 denied (no UpgradePanel)
4. Export `preset=weekly`; ranking/export IDs do not leak between default Pro and `px2-basic`
5. 390/430/767/768/1024/1440 no overflow; 44px preset/export; stacked charts below 768; trend `sr-only` table; Axe contrast/landmark/heading/table; dark after menu close; forced colors; reduced-motion query change

## Composer

Unused. All product logic, entitlements, URL, a11y, and review stayed on Grok 4.6.
