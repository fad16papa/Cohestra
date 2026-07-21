# Story 13.3: Export and report queries always filter by TenantId

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **TenantOperator**,
I want **admin report CSV export and report/dashboard aggregates to always scope by my tenant**,
so that **I never receive another tenant's rows or counts (FR28 / NFR-S4)**.

## Acceptance Criteria

1. **Given** Tenant A and Tenant B both have Clients / ClientActivities / Registrations  
   **When** A's admin calls `GET /api/v1/admin/reports/export` (any valid type/filters)  
   **Then** the CSV contains **only Tenant A rows** — zero Tenant B PII or activity rows (FR28).

2. **Given** the same dual-tenant fixtures  
   **When** A's admin calls report aggregate endpoints (`summary`, `by-activity`, `by-day`, `by-status`) and/or `GET /api/v1/admin/dashboard`  
   **Then** all counts/series reflect **only Tenant A** data.

3. **Given** report/dashboard code paths  
   **When** implemented  
   **Then** queries include **explicit** `TenantId == ambient` predicates (belt-and-suspenders with Story 13.2 EF global filters) — do not rely on global filters alone for exports.

4. **Given** ambient tenant is unresolved (`Guid.Empty`)  
   **When** export or report aggregate runs  
   **Then** the service fails closed (no CSV / no aggregate data for "all tenants") — prefer `InvalidOperationException` / 401-class behavior consistent with existing admin patterns.

5. **Given** Platform admin paths  
   **When** Platform uses dashboard/report surfaces  
   **Then** **NFR-4** holds: Platform remains **counts-only** (existing `IgnoreTenantFilters` + `GroupBy TenantId` pattern). **No** Platform CSV of cross-tenant client PII in this story.

6. **Given** Story 13.2 Redis namespacing  
   **When** this story lands  
   **Then** dashboard Redis keys remain `tenant:{id}:dashboard:stats` (no regression). Export stays **uncached** (no new Redis for CSV).

## Tasks / Subtasks

- [ ] Task 1: Harden `ReportService` (AC: 1, 3, 4)
  - [ ] 1.1 Inject `ICurrentTenant` into `ReportService`
  - [ ] 1.2 At start of `ExportAsync` and each `Get*Async` aggregate: require `currentTenant.IsResolved`; if not, throw `InvalidOperationException` (or same fail-closed pattern as `DashboardService`)
  - [ ] 1.3 Capture `var tenantId = currentTenant.TenantId` and add **explicit** `.Where(x => x.TenantId == tenantId)` on every Clients / ClientActivities / Registrations query used for export and aggregates (in addition to EF global filters)
  - [ ] 1.4 Keep existing CSV column contract, filters, and UTF-8 BOM behavior unless a bug is found
  - [ ] 1.5 Do **not** call `IgnoreQueryFilters` / `IgnoreTenantFilters` from ReportService

- [ ] Task 2: Harden `DashboardService` aggregates (AC: 2, 3, 4, 6)
  - [ ] 2.1 `GetStatsAsync` already requires resolved tenant — keep that guard
  - [ ] 2.2 Add explicit `TenantId == tenantId` on Clients / ClientActivities / Registrations queries (belt-and-suspenders with EF filters)
  - [ ] 2.3 Leave Platform `GetPlatformStatsAsync` + `IgnoreTenantFilters` + Redis `platform:dashboard:stats` unchanged (NFR-4 counts-only)

- [ ] Task 3: Isolation tests (AC: 1, 2) — **primary deliverable**
  - [ ] 3.1 Add dual-tenant WebApplicationFactory tests (pattern: `TenantIsolationApiTests` / `TenantFilterIsolationTests`)
  - [ ] 3.2 Seed Tenant A + Tenant B with distinguishable Clients / activities / registrations
  - [ ] 3.3 Authenticate as Tenant A admin (`TenantOperator`); call export for each type (`clients`, `registrations`, `client-activities` as supported)
  - [ ] 3.4 Assert CSV body contains A markers only; assert B unique strings/emails/ids absent
  - [ ] 3.5 Assert report summary (and ideally one other aggregate) + dashboard stats for A exclude B's counts
  - [ ] 3.6 Optional: unit-level service tests with mocked `ICurrentTenant` if API setup is heavy — API-level preferred for FR28 proof

- [ ] Task 4: Controllers / DI (AC: 4)
  - [ ] 4.1 Confirm `ReportsController` / `DashboardController` DI still resolve after ctor changes
  - [ ] 4.2 No new export types or Platform export endpoints

- [ ] Task 5: Docs / sprint hygiene
  - [ ] 5.1 Ultimate context update note for 13.3
  - [ ] 5.2 Do **not** implement Story 13.4 CI gate here

## Dev Notes

### Epic / PRD / Architecture anchors

| Source | Requirement |
|--------|-------------|
| Epics Story 13.3 | Export/report queries always filter by TenantId; never return cross-tenant rows |
| FR28 | Exports never include other tenants' data |
| NFR-S4 | Tenant isolation enforced in every query path |
| NFR-4 | Platform sees aggregate counts only — not client PII |
| Architecture §2.3 / ADR-003 | TenantId on every row; fail closed |
| Architecture §6 | `tenant:{id}:…` Redis; export uncached |
| UX-DR18 | Tenant-scoped lists/exports |

### Brownfield — current report/export surface

| Endpoint | Auth | Service |
|----------|------|---------|
| `GET /api/v1/admin/reports/export?type=&from=&to=&activityId=&status=` | `TenantOperator` | `ReportService.ExportAsync` |
| `GET /api/v1/admin/reports/summary` | TenantOperator | `GetSummaryAsync` |
| `GET /api/v1/admin/reports/by-activity` | TenantOperator | `GetByActivityAsync` |
| `GET /api/v1/admin/reports/by-day` | TenantOperator | `GetByDayAsync` |
| `GET /api/v1/admin/reports/by-status` | TenantOperator | `GetByStatusAsync` |
| `GET /api/v1/admin/dashboard` | Admin | `DashboardService.GetStatsAsync` |

**Export types today:** `clients` | `registrations` | `client-activities` (see `ReportService`).

**Gap:** `ReportService` does **not** inject `ICurrentTenant` and has **no** explicit `TenantId` predicates — relies solely on Story 13.2 EF global filters. `DashboardService` already requires resolved tenant + Redis namespace, but DB aggregates also lack explicit `TenantId` predicates.

**No existing Report/Dashboard isolation tests** — this story's tests are the FR28 proof.

### Implementation sketch

```csharp
// ReportService — every query:
var tenantId = RequireTenantId(); // throws if !IsResolved
var query = _db.Clients.AsNoTracking()
    .Where(c => c.TenantId == tenantId);
// ... existing filters ...
```

Same pattern for ClientActivities / Registrations and all aggregate methods.

```csharp
// DashboardService.GetStatsAsync — after existing RequireResolved:
.Where(c => c.TenantId == tenantId)
```

### Anti-patterns (do NOT)

- Rely only on EF global filters for export without explicit predicates
- `IgnoreQueryFilters()` / `IgnoreTenantFilters` in ReportService
- Cache export CSV in Redis
- Add Platform CSV export of client PII
- Change JWT / membership (Epic 12) or host resolution (13.1)
- Implement Story 13.4 TenantIsolation CI gate / SM-1 here
- Soft-delete global IgnoreQueryFilters expansion (deferred-work)

### Previous story intelligence (13.1 + 13.2)

- Ambient tenant via `ICurrentTenant` / `TenantResolutionMiddleware`
- EF `HasQueryFilter` + `TenantFilterTenantId`; unresolved → `Guid.Empty` match-nothing
- Default stamp when unresolved is intentional for seed — **services** must still refuse unresolved for admin reads
- Redis: `TenantRedisKeys.DashboardStats(tenantId)` already used
- Test patterns: `TenantIsolationApiTests`, `TenantFilterIsolationTests`, `MultiTenantWebAppFactory`
- Latest clean CR: Story 13.2 re-review #2 — do not reopen 13.2 unless regression

### Project Structure Notes

| Path | Role |
|------|------|
| `backend/src/Cohestra.Application/Services/ReportService.cs` | **Primary** — export + aggregates |
| `backend/src/Cohestra.Application/Services/DashboardService.cs` | Explicit TenantId on tenant stats |
| `backend/src/Cohestra.Api/Controllers/Admin/ReportsController.cs` | Export + report routes |
| `backend/src/Cohestra.Api/Controllers/Admin/DashboardController.cs` | Dashboard route |
| `backend/tests/Cohestra.Tests/` | New isolation tests |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13 Story 13.3]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR28, NFR-S4, NFR-4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — §2.3, §6, ADR-003]
- [Source: `_bmad-output/implementation-artifacts/13-2-ef-core-global-query-filters-and-redis-tenant-prefixes.md`]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Ultimate context engineering tip

Story 13.3 = **prove FR28** for CSV export + report/dashboard aggregates: inject `ICurrentTenant` into ReportService, fail closed if unresolved, add **explicit** `TenantId` filters on every query (belt-and-suspenders with 13.2 EF filters), keep Platform counts-only, keep dashboard Redis namespaced, add dual-tenant isolation tests. **Not** 13.4 CI gate.

### Story completion status

ready-for-dev — analyze complete; developer can implement without inventing export scope.
