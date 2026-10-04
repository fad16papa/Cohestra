# Story 40.2 test strategy correction

Date: 2026-10-03  
Owner: Grok 4.6 as Test Architect (Murat)  
Trigger: PO MAJOR 1 + MAJOR 2. Composer 2.5 unused.

## Risk

Follow-up is a primary daily-work room. The previous client fan-out + unstable sort can omit people, duplicate people, or fail closed against healthy data. Tests must prove **server-side category pages**, not a mocked `totalCount` on a 101-row client merge.

## Backend (unit + integration)

Must prove:

1. Category filtering uses the accepted first-match contract.
2. Category totals are tenant-scoped and exclude Healthy from needs attention.
3. TenantMember can read Follow-up data (`followUpCategory` on the existing clients list).
4. Unauthorized and cross-tenant access remain denied.
5. More than 100 clients with identical primary sort values paginate without duplicates or omissions (real database, not InMemory-only).
6. Page 1 and page 2 remain deterministic across repeated requests.
7. Existing clients-list behavior is unchanged when Follow-up parameters are absent (`FollowUpCategoryCounts` omitted/null; unfiltered items).
8. Invalid `followUpCategory` and paging inputs use the repository’s normal validation contract (400 for invalid category; page &lt; 1 normalizes to 1; pageSize still capped at 100).

## Frontend (Vitest)

Must prove:

1. Initial room load does not fetch every client page (exactly one clients request).
2. Only the selected category page is requested (`followUpCategory` + `page`).
3. Category counts come from `followUpCategoryCounts` and stay truthful while paging.
4. Category changes reset page to 1 / reconcile an empty out-of-range page.
5. Pagination replaces without duplicates (one page of items; unique ids).
6. Global empty vs selected-filter empty remain distinct and use **category totals**, not “did this page have rows?”.
7. Retry, permission, loading, and populated states remain truthful.
8. Dashboard → Follow-up → profile continuity helpers still produce `/follow-up` and `/clients/{id}`.
9. URL helpers preserve unrelated query keys.
10. Member access is not client-locked.

## Playwright / visual

Keep Story 40.2 journeys: dashboard widget → room → profile; filters; global vs filter empty; error + retry; TenantAdmin; TenantMember; 390 and 1440 readable, no overflow, 44px chips; keyboard/focus; reduced motion; one main/h1/skip. Assert the live/mocked room issues one clients request on first paint and that Next/Previous replaces the selected category page without duplicates.

Protected 38.4–39.5 and 40.1 must still pass. Do not weaken the 39.4 44px assertion.

## Explicitly insufficient

- 101-record frontend mock that only checks `totalCount`
- Raising the page-size cap
- Concurrent request storms
- Skipping the real-database paging test
