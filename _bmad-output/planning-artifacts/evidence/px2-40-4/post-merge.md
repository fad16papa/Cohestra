# Story 40.4 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `ed096690bf7d8a38a9834aa5ae926f13abc9e10c`  
Implementation merge SHA: `dd8bf563361982dab5faf8e2ead7e03b0d90dd24` (PR #373)  
PR HEAD at merge: `ed096690bf7d8a38a9834aa5ae926f13abc9e10c`  
`ed096690` is an ancestor of `dd8bf563`. Merge parents: `327c0a4ace6864d83307c7e907cec54f22d7965d` + `ed096690bf7d8a38a9834aa5ae926f13abc9e10c`.  
Tree of `dd8bf563` equals `ed096690` (empty diff).

## Required main CI

Run [`37180771698`](https://github.com/fad16papa/Cohestra/actions/runs/37180771698) on `dd8bf563` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy run [`37181029240`](https://github.com/fad16papa/Cohestra/actions/runs/37181029240) failed. Classification **C** (empty/missing droplet host/credentials). Credentials and infrastructure were not modified. Production not claimed.

PR CI on #373 is not the close signal.

## Backend on accepted HEAD `ed096690` / synchronized `main` `dd8bf563`

PostgreSQL integration executed (0 skipped). EF logged `ORDER BY CASE WHEN a."Status" = 'Archived' THEN 1 ELSE 0 END`, requested primary, `a."Id"`, then `LIMIT`/`OFFSET`.

| Gate | Result |
| --- | --- |
| `ActivityListOrderingIntegrationTests` | **3/3 passed, 0 skipped** |
| `ActivityServiceListSortTests` | **8/8 passed** |
| ActivityService unit (`FullyQualifiedName~ActivityService`) | **19/19 passed** |

Reconfirmed by those facts:

- Archived-last paging across all pages
- Deterministic replay and `Id ASC` tie-break
- Exact union with no duplicates or omissions
- Truthful page metadata
- Filtered Archived behavior
- Registration-count ordering
- Tenant isolation

## Frontend on accepted HEAD `ed096690`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| `lib/activities-40-4-contract.test.ts` | **7 passed** |
| `e2e/activities-40-4.spec.ts` | **6 passed** |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** |
| `e2e/follow-up-40-2.spec.ts` | **7 passed** |
| `e2e/clients-40-3.spec.ts` | **9 passed** |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | **0/1** — pre-existing `client-profile 768 clipped` (classification **F**). Assertion still `toBe(false)`; no skip |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |
| Form Studio 36.4 | **12 passed** |
| Form Studio 36.5 + checkpoint | **11 passed** |
| Form Studio 36.6 | **1 passed** |
| Combined Playwright | **65 passed / 1 pre-existing F** |

No assertion was weakened. No failure was converted into a skip. 40.1 `>= 44` assertions unchanged.

Reconfirmed:

- Archive dialog traps focus, Escape cancels, failure keeps the record
- Opportunity remains a Follow-up category and is absent from Activities
- No responsive overflow on 390 / 767 / 768 / 1024 / 1440 Activities layouts

## Tracker

- `40-4-activities-and-opportunities-as-category: done`
- `epic-40: in-progress`
- Story 40.5 not created and not started

## Composer 2.5

Not used. Grok 4.6 owned merge verification, tests, CI triage, close, and reporting.
