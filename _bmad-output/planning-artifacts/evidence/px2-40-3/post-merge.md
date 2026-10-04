# Story 40.3 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `0ebbf03de5017eea090240e469bb59bffd8b407b`  
Implementation merge SHA: `4509866c04e6b976212a3285a365735fdee567fd` (PR #371)  
PR HEAD at merge: `0ebbf03de5017eea090240e469bb59bffd8b407b`  
Final-head review: PR #371 comment on `0ebbf03d` — 0 BLOCKER / 0 MAJOR

## Required main CI

Run [`37174648292`](https://github.com/fad16papa/Cohestra/actions/runs/37174648292) on `4509866c` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy is classification **C** when it runs (empty host/credentials). Credentials and infrastructure were not modified. Production not claimed.

## Frontend on synchronized `main` `4509866c`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| `lib/clients-40-3-contract.test.ts` | **5 passed** |
| `lib/follow-up-category.test.ts` | **24 passed** |
| Focused Vitest | **29/29 passed** |
| `e2e/clients-40-3.spec.ts` | **9 passed** |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** |
| `e2e/follow-up-40-2.spec.ts` | **7 passed** |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | **1 passed** — assertion still `>= 44`; no skip |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |
| Protected Playwright total | **27/27 passed** |
| Combined Playwright | **36/36 passed** |

No assertion was weakened. No failure was converted into a skip.

## Live smoke

On the native stack (`API :8080`, `web :3000`) after merge:

| Check | Result |
| --- | --- |
| `/clients` one `main#main-content` and one `h1` `Clients` | **PASS** |
| `/clients/{id}` populated `h1` is the person name; loading/error keep `Client` | **PASS** |
| Cards below 768; semantic `<table>` at `md+` | **PASS** |
| `New` / `Contacted` / `Active` / `Inactive` table labels not clipped | **PASS** (Playwright `scrollWidth` at 768/1024) |
| 390 / 768 / 1024 / 1440 no document overflow | **PASS** |
| `Open in Follow-up` only for Due now; `href="/follow-up"` | **PASS** |
| Messenger `alertdialog` Escape + focus restore | **PASS** |
| Tenant isolation (disjoint client ids) | **PASS** |
| TenantMember opens Clients without Team/Billing | **PASS** |
| Basic export hint + Upgrade to Pro campaign state | **PASS** |
| Profile actions `h-[45px]` floor | **PASS** (header class + 39.4 44px floor intact) |
| 160ms profile expand instant under reduced motion | **PASS** |

## Tracker

- `40-3-clients-list-and-client-profile: done`
- `epic-40: in-progress`
- Story 40.4 not created and not started

## Composer 2.5

Not used. Grok 4.6 owned merge verification, tests, CI triage, close, and reporting.
