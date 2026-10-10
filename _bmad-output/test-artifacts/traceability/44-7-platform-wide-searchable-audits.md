# Traceability — Story 44.7 Platform-wide Searchable Audits

Workflow: bmad-testarch-trace
Date: 2026-10-10
Model: Cursor Grok 4.6
Gate: **PASS** for Story 44.7 P0/P1. Not a production-cutover gate. DigitalOcean missing host remains Epic 19.

| Requirement | Query | DTO | Controller | UI | Test |
|---|---|---|---|---|---|
| FR-44-13 search | ApplyFilters + Skip/Take | PlatformAuditListResponse | GET /audits | /platform/audits | unit + integration + vitest |
| FR-44-7 / P0-17 export cap | Take(5001) | CSV allow-list | GET /audits/export | Export CSV | unit + integration + Playwright |
| P0-17 tenant JWT 403 | — | — | PlatformAdminOnly | route guard not relied on | TenantAuthz + Isolation |
| P1-08 action | name-only enum (reject `0`/`1`) | Action string | action= | Action select | unit + integration |
| P1-08 tenantId | TenantId == | tenantId | tenantId= | Tenant ID | Isolation A/B |
| P1-08 actorEmail | ToLower exact | actorEmail | actorEmail= | Actor email | integration |
| P1-08 from/to | inclusive CreatedAt | createdAt | from/to | From/To UTC | integration 400 from>to |
| Pagination | page/pageSize | Page/PageSize/TotalCount | query | Previous/Next | unit + UI |
| DetailsJson omission | Select without column | PlatformAuditEntryResponse | JSON/CSV | parse rejects | sentinel tests |
| P1-01 1440/390 | — | — | — | table + cards | Playwright |
| P1-12 a11y | — | — | — | h1, skip, aria-current | Playwright |

Zero orphan ACs.
