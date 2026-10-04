# Story 40.3 checks

Date: 2026-10-04
Branch: `cursor/story-40-3-clients-profile-0fcb`
Baseline: `7e7c3c0773fe036a06338167e37f17e69708b9a2`
HEAD: `cf4a0d11ec7d494f31f75c105da1d0fe8258d114`
PR: https://github.com/fad16papa/Cohestra/pull/371 (draft)

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

## Automated

| Check | Result |
| --- | --- |
| Affected Vitest (`follow-up-category`, `clients-40-3-contract`, `motion-polish`) | **37 passed** |
| Full Vitest | **90 files / 585 passed** |
| `npx tsc --noEmit` | **PASS** |
| Targeted ESLint on 40.3 files | No new issues. Pre-existing `clients-list-page` setState-in-effect / memoization remain. |
| Production `next build` | **PASS** |
| Playwright `clients-40-3` | **9 passed** |
| Playwright `dashboard-40-1` | **5 passed** |
| Playwright `follow-up-40-2` | **7 passed** |
| Playwright `tokens-38-4` | **6 passed** |
| Playwright `a11y-38-4` | **2 passed** |
| Playwright `landmarks-38-5` | **4 passed** |
| Playwright `overlays-38-6` | **1 passed** |
| Playwright `desktop-shell-39-1` | **1 passed** |
| Playwright `mobile-nav-39-2` | **1 passed** |
| Playwright `entitlement-visibility-39-3` | **5 passed** |
| Playwright `page-header-39-4` | First combined run: Client WhatsApp 390 `43.999…`. Assertion unchanged. After 45px profile actions: **1 passed**. |
| Playwright `route-errors-39-5` | **2 passed** |

Backend APIs were not changed. No backend unit/integration rerun required.

## Screenshots

Under `viewports/`:

- `clients-390x844.png`, `clients-768x1024.png`, `clients-1024x768.png`, `clients-1440.png`
- `clients-390-empty.png`, `clients-390-nomatch.png`, `clients-390-error.png`
- `clients-1440-member.png`, `clients-1440-entitlement-denied.png`
- `profile-390.png`, `profile-1440.png`, `profile-390-not-found.png`, `profile-390-denied.png`

## Tracker

- Story 40.3: `review`
- Epic 40: `in-progress`
- Story 40.4: not started
- PR: draft, unmerged
- Production: not claimed
- Composer 2.5: unused
