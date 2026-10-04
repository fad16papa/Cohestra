# Story 41.2 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `8576d0a3d658a62eb5286835606f284b34f5e625`  
Implementation merge SHA: `a558eba220f45e7b478bf1bc9dcf4b251a5604b2` (PR #379)  
PR HEAD at merge: `8576d0a3d658a62eb5286835606f284b34f5e625`  
`8576d0a3` is an ancestor of `a558eba2`.  
Merge parents: `bb420f89446ef78445fbdd4f655b6752cfd7d713` + `8576d0a3d658a62eb5286835606f284b34f5e625`.

## Required main CI

Run [`37193492232`](https://github.com/fad16papa/Cohestra/actions/runs/37193492232) on `a558eba2` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy remains the existing classification **C** path (empty/missing droplet SSH host/credentials). Credentials and infrastructure were not modified. Production not claimed.

PR CI on #379 is not the close signal. Final-head PR CI was [`37192341083`](https://github.com/fad16papa/Cohestra/actions/runs/37192341083) on `8576d0a3` (5/5) before merge.

## Focused post-merge tests on synchronized `main` `a558eba2`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| Affected intelligence Vitest | **9 passed** |
| Intelligence service / composer / guard units | **18 passed** |
| Intelligence brief + isolation integration | **3 passed** |
| `e2e/ai-41-2.spec.ts` | **5 passed** — `/ai` one main + `h1` Cohestra AI; `/intelligence` and `/needs-attention` query-preserving redirects; Dashboard Needs attention links to `/ai`; deterministic truthful; synthesized fixture only; insufficient ≠ empty success; 500 retry; 403 denied never UpgradePanel; TenantMember access; unsafe action non-clickable; safe `/clients` action; no cross-tenant IDs; 390 no overflow; keyboard/dark/forced-colors/reduced-motion |

## Protected Story 34 / 38.4–41.1 regressions

| Gate | Result |
| --- | --- |
| Story 34.1–34.3 (brief API, dashboard brief, synthesis fallback) | covered by 18 intelligence units + 3 integration + Dashboard 40.1 |
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
| `e2e/analytics-41-1.spec.ts` | **5 passed** |
| Combined Playwright | **39 passed / 0 failed** |

No assertion was weakened. No failure was converted into a skip.

## Live reconfirmations

1. `/ai` has one `main#main-content` and one document `h1` named Cohestra AI.
2. `/intelligence` and `/needs-attention` redirect to `/ai` and keep safe query parameters.
3. Dashboard section remains Needs attention and links to `/ai`.
4. Deterministic mode is labeled “Based on workspace rules and data.”
5. Synthesized mode is proven only with a controlled fixture.
6. Synthesis stays disabled by default; composer/guard units cover deterministic fallback.
7. Insufficient data is a named state, not empty success.
8. API failure shows ProductErrorState + retry.
9. TenantMember opens the room under TenantOperator.
10. Unsafe action/evidence hrefs are non-clickable.
11. Safe actions land on existing authorized routes.
12. Cross-tenant names/IDs remain absent.
13. 390px has no document overflow.
14. Keyboard, dark mode, forced colors, and reduced motion remain valid.

## Tracker

- `41-1-analytics-room: done`
- `41-2-cohestra-ai-room: done`
- `epic-41: in-progress`
- Story 41.3 was not created and not started

## Deferred residuals

From four-layer review on `8576d0a3` — no unresolved BLOCKER or MAJOR:

- Independent Dashboard + `/ai` fetches can duplicate work — **NIT**.
- Dashboard still renders full insight cards (Story 34.2) — **NIT / dismiss**.
- Room refresh remounts rather than a stale live region — **NIT**.

## Composer 2.5

Not used. Grok 4.6 owned FINAL HEAD REVIEW, merge, post-merge verification, CI triage, close, and reporting.
