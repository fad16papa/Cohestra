# Story 40.4 test results

Implementation fix HEAD: `fd00b332`. Screenshot refresh lands in the following evidence commit.

## Automated

| Suite | Result |
| --- | --- |
| `npx tsc --noEmit` (web) | Pass after `fd00b332` |
| Targeted ESLint on 40.4 files | 0 new issues. Pre-existing `react-hooks/set-state-in-effect` remain in recovery-mode effect and detail tab/theme effects (untouched logic). |
| Affected Vitest (`activities-40-4-contract`) | 7/7 |
| Full Vitest | 91 files, 593/593 |
| `ActivityServiceListSortTests` | 8/8 |
| .NET unit (`Category!=Integration`) | 929 passed, 8 skipped (pre-existing Redis/schedule skips) |
| API integration | Not required — list sort covered by unit tests; no new endpoint |
| Production `next build` | Pass on `162da9c9`; web tests pass on `fd00b332` |
| Playwright `activities-40-4.spec.ts` | 6/6 after `fd00b332` |
| Protected 38.5, 38.6, 39.1–39.5, 40.2, 40.3 | 35/35 |
| Protected 40.1 | 4/5. Failure is `390 view tab height` 43.999px — classification **D**, same pre-existing flake as prior PX2 stories. Assertion not weakened. |
| Form Studio 36.4 / 36.5 / 36.6 | 15/15 |

## Classification of the 40.1 flake

Mandatory Code Review Loop type **D** (flaky / subpixel). Unrelated to Activities sort. Do not skip or loosen.

## ClientDedup / DigitalOcean

Not run. Pre-existing flake / classification C remain out of scope.
