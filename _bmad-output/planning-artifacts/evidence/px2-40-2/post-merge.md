# Story 40.2 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `2a3d5e6bc1984ff19cb88bed4948c7bf43bd4f49`  
Implementation merge SHA: `2b84032232b326eb197fa4012a1318c8df4020d9` (PR #369)  
PR HEAD at merge: `2a3d5e6bc1984ff19cb88bed4948c7bf43bd4f49`  
Final-head review: PR comment `#issuecomment-5975192503` — 0 BLOCKER / 0 MAJOR

## Required main CI

Run [`37167020928`](https://github.com/fad16papa/Cohestra/actions/runs/37167020928) on `2b840322` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy `37167236383` remains classification **C** (`INPUT_HOST`, `INPUT_USERNAME`, and `INPUT_KEY` empty; `missing server host`). Credentials and infrastructure were not modified. Production not claimed.

## Backend on synchronized `main` `2b840322`

| Gate | Result |
| --- | --- |
| `ClientServiceFollowUpCategory` unit | **6 passed** |
| Broader `ClientService` unit (includes Follow-up) | **15 passed** |
| `FollowUpClientsListIntegrationTests` | **6/6 passed** |

Covered contracts:

- Deterministic 101-row paging with identical `CreatedAt` / registration timestamps: 100 + 1, no overlap, full union, page replay
- Isolated-tenant category totals 2/1/2/1; Healthy excluded from needs-attention
- TenantMember 200 + counts
- Cross-tenant / unauthorized remain denied
- Legacy clients list without `followUpCategory` omits `FollowUpCategoryCounts`
- Invalid `followUpCategory=overdue` uses existing 400 validation
- Duplicate/omission protection via `ThenBy(Id)` + fail-closed client checks

## Frontend on synchronized `main` `2b840322`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| `lib/follow-up-category.test.ts` | **21 passed** |
| `e2e/follow-up-40-2.spec.ts` | **7 passed** — first run 6/7; viewport Due now 430 height `43.999…` retry passed. Assertion still `>= 44`. Classified **D**. |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** |
| `e2e/tokens-38-4.spec.ts` | **6 passed** |
| `e2e/a11y-38-4.spec.ts` | **2 passed** |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | First: Client WhatsApp 390 height `43.999…`. Retry **passed**. Assertion not weakened. Classified **D**. |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |

## Live smoke

On the restarted native stack (`API :8080`, `web :3000`) after merge:

| Check | Result |
| --- | --- |
| `/follow-up` one `main#main-content` and one `h1` | **PASS** |
| Due now / At risk / Opportunity / Healthy filters | **PASS** |
| Only one selected-category page requested on first load | **PASS** (`followUpCategory=due-now&page=1`, no fan-out) |
| Totals remain authoritative chips | **PASS** |
| Previous / Next paging | **PASS** |
| Category change returns to page 1 | **PASS** (Due now omits `?page=` / default URL) |
| Page 1 empty + chip > 0 fails closed | **PASS** (`Could not load Follow-up`, not global empty) |
| Later empty page reconciles | **PASS** (no fail-closed on page 2 empty + totals) |
| Global empty vs filter empty | **PASS** (official 40.2 Playwright; distinct headings) |
| TenantMember opens the room | **PASS** |
| Dashboard “View all” → `/follow-up` | **PASS** |
| Result links → `/clients/{id}` | **PASS** |
| 390px no page overflow; nav/FAB do not collide | **PASS** (official 40.2 viewports + mobile-nav 39.2) |
| No automated messaging or client mutation | **PASS** (GET-only Follow-up; no WhatsApp/Viber/SMS writes) |

## Tracker

- `40-2-follow-up-primary-room: done`
- `epic-40: in-progress`
- Story 40.3 not created and not started

## Composer 2.5

Not used. Grok 4.6 owned merge verification, tests, CI triage, close, and reporting.
