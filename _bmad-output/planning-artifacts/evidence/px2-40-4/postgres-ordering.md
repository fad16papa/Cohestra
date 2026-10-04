# Story 40.4 — PostgreSQL list-ordering proof

Date: 2026-10-04  
Classification of the gap: **MAJOR** (important missing test). Production `ListAsync` already ordered before `Skip`/`Take`; only InMemory unit tests had proven it. The green API integration job did not execute the new query against PostgreSQL.

## Fixture

Isolated tenants created through the existing platform + TenantAdmin helpers. Names prefixed `40-4-ord-`. Default tenant plan and demo activities are not mutated.

`src/Api.IntegrationTests/ActivityListOrderingIntegrationTests.cs`

| Fact | Proofs |
| --- | --- |
| `List_Unfiltered_PagesArchivedLast_ReplaysDeterministically_AndExcludesForeignTenant` | 1 paging, 2 replay + Id ASC, 3 union/metadata, 6 isolation |
| `List_StatusArchived_IsTruthful_AndKeepsRequestedSortWithIdTieBreak` | 4 filtered Archived |
| `List_RegistrationCountSort_KeepsArchivedSecondary_OnPostgreSQL` | 5 correlated `registrationCount` sort |

## Assertions

- pageSize 5, 7 actionable + 5 Archived; every Archived `UpdatedAt` is newer than every actionable row
- page 1 contains only Draft/Published; Archived appears only after all actionable IDs
- two walks of every page return the same IDs
- equal `UpdatedAt` uses `Id ASC`
- union of pages equals the seeded set; no duplicate IDs; `totalCount` / `page` / `pageSize` match
- `status=archived` returns only Archived, keeps UpdatedAt + Id order, excludes Draft/Published
- `sortBy=registrationCount&sortDirection=desc` keeps a 9-registration Archived row last while 3 / 1 / 0 actionable rows keep count order
- a foreign-tenant marker is absent from every page and from `totalCount`

## Production patch

None. PostgreSQL translated the existing `Status == Archived ? 1 : 0` key and the registration-count subquery. The first registration fixture failed on `IX_registrations_ClientId_ActivityId` (one client reused); that was a test fixture defect, not a list-query defect.
