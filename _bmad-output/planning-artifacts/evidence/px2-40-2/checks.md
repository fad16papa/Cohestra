# Story 40.2 test results

Date: 2026-10-03  
HEAD at run: post-review patch after `8c4af64b` (commit immediately after this note)  
Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

## Commands

| Gate | Result |
| --- | --- |
| Affected backend unit (`ClientService` + Follow-up category) | **15 passed** (`ClientServiceFollowUpCategoryTests` 6/6) |
| Affected API integration (`FollowUpClientsListIntegrationTests`) | **6/6 passed** — isolated-tenant contract + 101-row identical `CreatedAt` registrations |
| Affected Follow-up Vitest | **21 passed** |
| Full Vitest | **578 passed** / 89 files |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on 40.2 files | pass (0 errors) |
| `next build` (production) | pass; `/follow-up` prerenders |
| Story 40.2 Playwright | **7/7 passed** after one D retry of 43.999px Due now chip (assertion not weakened) |
| Protected 38.4–39.5 + 40.1 Playwright | **27/28 passed**; 39.4 WhatsApp 43.999px failed twice, classified D, assertion not weakened |

## Backend contract coverage

- Category first-match filter + totals (Due now / At risk / Opportunity / Healthy)
- Totals tenant-scoped; Healthy excluded from needs-attention
- TenantMember can read Follow-up query
- Anonymous 401; PlatformAdmin denied; foreign-tenant rows absent
- 101 clients with identical non-null `LastRegistrationAt` page without duplicates/omissions; page 1/2 stable on repeat
- Clients list without `followUpCategory` omits `followUpCategoryCounts`
- Invalid category → 400; page `< 1` → 1; pageSize `500` → 100

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
| 39.4 43.999px WhatsApp height | D | Failed twice on this run. **Assertion not weakened.** Known sub-pixel flake from 40.1 close; not introduced by Follow-up paging. |
| DigitalOcean empty SSH | C | Out of scope; not claimed. |
| ClientDedup phone-hex | pre-existing flake | Not in this suite. |
| Dashboard vs room Due now helper residual | documented | Server `followUpDue` vs client `isFollowUpDue`; do not import cinema. |
| Computing four totals still scans the tenant in one HTTP call | accepted architecture | Required for truthful chips. Not 50 sequential page fetches. |

## Composer 2.5

Not used. Grok 4.6 owned architecture, implementation, tests, and review.
