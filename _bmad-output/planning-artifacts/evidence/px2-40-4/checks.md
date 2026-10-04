# Story 40.4 test results

HEAD at recording: `81fcf786` plus subsequent e2e assertion commits if present.  
Re-run after the final review HEAD and replace this SHA if it changes.

## Automated

| Suite | Result |
| --- | --- |
| `npx tsc --noEmit` (web) | Pass |
| Targeted ESLint on 40.4 files | 0 new issues. Pre-existing `react-hooks/set-state-in-effect` remain in recovery-mode effect and detail tab/theme effects (untouched logic). |
| Affected Vitest (`activities-40-4-contract`, plan-limit, follow-up, clients-40-3) | 46/46 |
| Full Vitest | 91 files, 591/591 |
| `ActivityServiceListSortTests` | 8/8 |
| .NET unit (`Category!=Integration`) | 929 passed, 8 skipped (pre-existing Redis/schedule skips) |
| API integration | Not required — list sort covered by unit tests; no new endpoint |
| Production `next build` | Pass |
| Playwright `activities-40-4.spec.ts` | 6/6 |
| Protected 38.5, 38.6, 39.1–39.5, 40.2, 40.3 | 35/35 |
| Protected 40.1 | 4/5. Failure is `390 view tab height` 43.999px — classification **D**, same pre-existing flake as prior PX2 stories. Assertion not weakened. |
| Form Studio 36.4 / 36.5 / 36.6 | 15/15 |

## Classification of the 40.1 flake

Mandatory Code Review Loop type **D** (flaky / subpixel). Unrelated to Activities sort. Do not skip or loosen.

## ClientDedup / DigitalOcean

Not run. Pre-existing flake / classification C remain out of scope.
