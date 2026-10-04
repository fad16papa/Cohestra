# Story 40.4 test results

PostgreSQL ordering correction added after `7c6e4817`. Targeted integration 3/3 green; remaining suite results land with the verification commit.

## Automated

| Suite | Result |
| --- | --- |
| `ActivityListOrderingIntegrationTests` (PostgreSQL) | 3/3 |
| `ActivityServiceListSortTests` | pending re-run |
| .NET unit (`Category!=Integration`) | pending re-run |
| Full API integration | pending re-run |
| `npx tsc --noEmit` (web) | pending re-run |
| Targeted ESLint on 40.4 files | 0 new issues expected |
| Affected Vitest (`activities-40-4-contract`) | pending re-run |
| Full Vitest | pending re-run |
| Production `next build` | pending re-run |
| Playwright `activities-40-4.spec.ts` | pending re-run |
| Protected 38.5, 38.6, 39.1–39.5, 40.2, 40.3 | 35/35 |
| Protected 40.1 | 4/5. Failure is `390 view tab height` 43.999px — classification **D**, same pre-existing flake as prior PX2 stories. Assertion not weakened. |
| Form Studio 36.4 / 36.5 / 36.6 | 15/15 |

## Classification of the 40.1 flake

Mandatory Code Review Loop type **D** (flaky / subpixel). Unrelated to Activities sort. Do not skip or loosen.

## ClientDedup / DigitalOcean

Not run. Pre-existing flake / classification C remain out of scope.
