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

## Fixture isolation notes

- `ScheduledStartsAt` is pinned 21 days ahead so `ActivityExpirationHostedService` cannot archive Published rows or rewrite `UpdatedAt` during a long suite (startup backfill + the 3-minute expiration pass).
- After EF insert, `"UpdatedAt"` is SQL-locked and the expected order is rebuilt from the persisted row. Unquoted `updated_at` is not a column on `activities`.
- Activity IDs are fresh GUIDs (`OrderedIds()` for ties) so reruns cannot collide on `PK_activities`.
- Each registration uses its own Client so `IX_registrations_ClientId_ActivityId` stays unique.

## Production patch

None so far. Isolated PostgreSQL runs translated `Status == Archived ? 1 : 0` and the registration-count subquery. The first full-suite mismatch was fixture timestamp / expiration drift, not a list-query defect. This file is updated again if a later PostgreSQL run proves a production translation bug.
