# Story 40.4 test results

PostgreSQL ordering correction on `cursor/story-40-4-activities-opportunity-0fcb`. Production `ListAsync` was not patched. Status remains `review`.

## Automated

| Suite | Result |
| --- | --- |
| `ActivityListOrderingIntegrationTests` (PostgreSQL) | 3/3 |
| `ActivityServiceListSortTests` (EF InMemory) | 8/8 |
| ActivityService unit filter (`FullyQualifiedName~ActivityService`) | 19/19 |
| .NET unit (`Category!=Integration`) | 937/937 |
| Full API integration (`Category=Integration`) | 131 passed, 0 skipped, 1 failed: `AuthOtpAbuseIntegrationTests.Reset_password_brute_force_returns_429_after_threshold` (Expected `BadRequest`, Actual `TooManyRequests`). Pre-existing flake / classification F. Re-ran after the Id-tie/slug fixture lock: same 131/1, and the three ordering facts stayed green. |
| `npx tsc --noEmit` (web) | pass |
| Targeted ESLint on 40.4 files | 3 errors / 1 warning, all pre-existing `react-hooks/set-state-in-effect` (and one `exhaustive-deps`) on list/detail effects. Not introduced by the PostgreSQL correction. Not weakened. |
| Affected Vitest (`lib/activities-40-4-contract.test.ts`) | 7/7 |
| Full Vitest | 593/593 (91 files) |
| Production `next build` | pass |
| Playwright `activities-40-4.spec.ts` | 6/6 (`E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 NEXT_PUBLIC_API_URL=http://localhost:8080`) |
| Protected 38.5 | 4/4 |
| Protected 38.6 | 1/1 |
| Protected 39.1 | 1/1 |
| Protected 39.2 | 1/1 |
| Protected 39.3 | 5/5 |
| Protected 39.4 | 0/1. `client-profile 768 clipped` — pre-existing, unrelated to Activities sort. Assertion not weakened. |
| Protected 39.5 | 2/2 |
| Protected 40.1 | 5/5 this run. `>= 44` assertions unchanged. Known 43.999px residual retains classification **D**. |
| Protected 40.2 | 7/7 |
| Protected 40.3 | 9/9 |
| Form Studio 36.4 | 12/12 |
| Form Studio 36.5 (+ checkpoint) | 11/11 |
| Form Studio 36.6 | 1/1 |

## Classification of the 40.1 flake

Mandatory Code Review Loop type **D** (flaky / subpixel). Unrelated to Activities sort. Do not skip or loosen. The `toBeGreaterThanOrEqual(44)` assertions in `web/e2e/dashboard-40-1.spec.ts` are unchanged.

## 39.4 clip

Pre-existing `client-profile 768 clipped`. Out of scope for 40.4. Assertion not weakened.

## AuthOtpAbuse / ClientDedup / DigitalOcean

`AuthOtpAbuse` 429-vs-400 is a pre-existing integration flake (classification F). ClientDedup phone-validation flake and DigitalOcean remain out of scope / classification C.

## Empty-DB `/ready` skip-storm

Dropping `cohestra_test` and immediately running the suite can mark the factory unavailable before the default-tenant health check is green (128 skips). The recorded full-suite run used a migrated `cohestra_test` with Platform 0 present. Targeted 3/3 also passed on that infrastructure.
