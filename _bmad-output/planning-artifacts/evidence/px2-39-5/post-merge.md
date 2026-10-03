# Story 39.5 post-merge verification

Date: 2026-10-03  
Implementation HEAD (PO accepted): `443f83eb94b39b3d191f941fdffb12144d6c51d4`  
Main merge SHA: `7553872c58362e51886a7b833fc27a3f11994893` (PR #365)

## Required main CI

Run [`37125569345`](https://github.com/fad16papa/Cohestra/actions/runs/37125569345) on `7553872c` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy `37125879379` remains classification **C** (`INPUT_HOST`, `INPUT_USERNAME`, and `INPUT_KEY` empty). Not a 39.5 defect. Production not claimed.

## Live smoke (`E2E_LIVE_STACK=1`, `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_API_BASE_URL=http://localhost:8080`)

| Check | Result |
| --- | --- |
| `lib/route-boundary.test.ts` | **13 passed** — copy, recovery matrix, production guard, admin catch-all inventory, offline auto-reset once |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** — marketing/admin 404, platform guard-aware, forced error, offline auto-reconnect without Try again, descendant admin 404s in `main#main-content` |
| `e2e/website-entitlement-38-2.spec.ts` | **2 passed** — Pro editor + 200; Basic UpgradePanel + `plan_locked` 403 |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | Classification **D** — 43.999px vs 44 on client WhatsApp. Assertion not weakened. |

## Reconfirmed on merged tree

- Marketing unmatched URL → h1 `Page not found`, Home `/`
- Admin descendant 404s stay inside Workspace complementary + `main#main-content` + Dashboard `/dashboard`
- Platform unmatched remains guard-aware (login/loading or Platform home)
- Error UI exposes no exception text, digest, token, or tenant id
- Offline → online calls `reset()` once; repeated online events do not loop
- 38.1/38.2 named unavailable states and plan locks remain
- No `loading.tsx`. Epic 40 not started.

## Tracker

Story 39.5 → `done`. Epic 39 → `done`. Epic 40 not started.
