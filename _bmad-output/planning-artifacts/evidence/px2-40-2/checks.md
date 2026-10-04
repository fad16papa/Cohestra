# Story 40.2 test results

Date: 2026-10-03  
HEAD at run: working tree after ADV-1 empty-populated fail-closed (commit immediately after this note)  
Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

## Commands

| Gate | Result |
| --- | --- |
| Affected backend unit (`ClientServiceFollowUpCategory` + list) | **13 passed** (Follow-up category 6/6) |
| Affected API integration (`FollowUpClientsListIntegrationTests`) | **6/6 passed** — isolated-tenant contract + 101-row identical `CreatedAt` registrations |
| Affected Follow-up Vitest | **21 passed** (includes empty page 1 + chip drift fail-closed) |
| Full Vitest | **578 passed** / 89 files |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on 40.2 files | pass (0 errors) |
| Story 40.2 Playwright | **7/7 passed** first try |
| Protected 38.4–39.5 + 40.1 Playwright | **27/28 passed**; 39.4 43.999px on WhatsApp 768 then lead-status; assertion unchanged; classified D |

## Required contract confirmation

| Contract | Proof |
| --- | --- |
| Deterministic paging | Integration 101 identical registrations: 100+1, no overlap, full union, page 1/2 replay |
| Category totals | Isolated tenant exact 2/1/2/1; Healthy excluded from needs-attention (5) |
| Duplicate-ID failure | Vitest `loadFollowUpPage` throws on duplicate ids |
| Empty populated fail-closed | Vitest: empty page 1 + `totalCount>0`; empty page 1 + `totalCount=0` + chip 8 |
| Member access | Integration TenantMember 200 + counts; Playwright member room |
| Tenant isolation | Foreign Due-now id absent; PlatformAdmin 401/403; Playwright two-tenant ids |
| Legacy clients list | No `followUpCategory` ⇒ `FollowUpCategoryCounts` null; status counts unchanged |

## Playwright 40.2

`web/e2e/follow-up-40-2.spec.ts`

- Dashboard View all → room → profile
- Category filters + Healthy in viewport at 390/430/768/1024/1440
- Global empty vs filter empty vs error + Try again
- Pagination replaces the selected category page without duplicates
- TenantMember room (no Team/Billing headings)
- Reduced motion zeros chip transition
- Tenant isolation via existing clients API (default vs px2-basic)

## Classified residuals

| Item | Class | Note |
| --- | --- | --- |
| 39.4 43.999px | D | First: Client WhatsApp 768 height `43.999992`. Retry: Client profile lead status height `43.999992`. Spec unedited (`toBeGreaterThanOrEqual(44)`). Not weakened. |
| DigitalOcean empty SSH | C | Out of scope; not claimed. |
| ClientDedup phone-hex | pre-existing flake | Not in this suite. |
| Dashboard vs room Due now helper residual | documented | Server `followUpDue` vs client `isFollowUpDue`; do not import cinema. |
| Computing four totals still scans the tenant in one HTTP call | accepted architecture | Required chip contract. Not 50 sequential page fetches. |

## Composer 2.5

Not used. Grok 4.6 owned architecture, implementation, tests, and review.
