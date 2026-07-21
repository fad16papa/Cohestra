---
baseline_commit: 868480d60b94da5050863b571ae4ee4783821055
---

# Story 13.3: Export and report queries always filter by TenantId

Status: done

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

- [x] Task 1: Harden `ReportService` (AC: 1, 3, 4)
  - [x] 1.1 Inject `ICurrentTenant` into `ReportService`
  - [x] 1.2 At start of `ExportAsync` and each `Get*Async` aggregate: require `currentTenant.IsResolved`; if not, throw `InvalidOperationException` (or same fail-closed pattern as `DashboardService`)
  - [x] 1.3 Capture `var tenantId = currentTenant.TenantId` and add **explicit** `.Where(x => x.TenantId == tenantId)` on every Clients / ClientActivities / Registrations query used for export and aggregates (in addition to EF global filters)
  - [x] 1.4 Keep existing CSV column contract, filters, and UTF-8 BOM behavior unless a bug is found
  - [x] 1.5 Do **not** call `IgnoreQueryFilters` / `IgnoreTenantFilters` from ReportService

- [x] Task 2: Harden `DashboardService` aggregates (AC: 2, 3, 4, 6)
  - [x] 2.1 `GetStatsAsync` already requires resolved tenant — keep that guard
  - [x] 2.2 Add explicit `TenantId == tenantId` on Clients / ClientActivities / Registrations queries (belt-and-suspenders with EF filters)
  - [x] 2.3 Leave Platform `GetPlatformStatsAsync` + `IgnoreTenantFilters` + Redis `platform:dashboard:stats` unchanged (NFR-4 counts-only)

- [x] Task 3: Isolation tests (AC: 1, 2) — **primary deliverable**
  - [x] 3.1 Add dual-tenant WebApplicationFactory tests (pattern: `TenantIsolationApiTests` / `TenantFilterIsolationTests`)
  - [x] 3.2 Seed Tenant A + Tenant B with distinguishable Clients / activities / registrations
  - [x] 3.3 Authenticate as Tenant A admin (`TenantOperator`); call export for each type (`clients`, `registrations`, `client-activities` as supported)
  - [x] 3.4 Assert CSV body contains A markers only; assert B unique strings/emails/ids absent
  - [x] 3.5 Assert report summary (and ideally one other aggregate) + dashboard stats for A exclude B's counts
  - [x] 3.6 Optional: unit-level service tests with mocked `ICurrentTenant` if API setup is heavy — API-level preferred for FR28 proof

- [x] Task 4: Controllers / DI (AC: 4)
  - [x] 4.1 Confirm `ReportsController` / `DashboardController` DI still resolve after ctor changes
  - [x] 4.2 No new export types or Platform export endpoints

- [x] Task 5: Docs / sprint hygiene
  - [x] 5.1 Ultimate context update note for 13.3
  - [x] 5.2 Do **not** implement Story 13.4 CI gate here

### Review Findings

- [x] [Review][Patch] Nested collection predicates omit TenantId — Dashboard `Registrations.Any` / `TimelineEvents.Any` and Report `TimelineEvents.Any` lack child `TenantId == ambient` (AC3 belt-and-suspenders) [`DashboardService.cs`, `ReportService.cs`]
- [x] [Review][Patch] CSV projection joins Client/Activity without navigation TenantId predicates [`ReportService.cs` ExportReportCsvAsync Select]
- [x] [Review][Patch] `totalLeadsAtEnd` counts cohort IDs without `Clients.TenantId` filter [`ReportService.cs`]
- [x] [Review][Patch] Fail-closed test covers unresolved only — add resolved-`Guid.Empty` case for Report + Dashboard [`ReportDashboardTenantIsolationTests.cs`]
- [x] [Review][Defer] InMemory dual-tenant isolation may overstate vs SQL/global-filter production — deferred, pre-existing 13.2 test pattern
- [x] [Review][Defer] Activity/registration tenant mismatch silently drops ranking rows — deferred, data-integrity; not FR28 leakage for this story
- [x] [Review][Defer] Campaign/community/follow-up sub-aggregates not individually asserted beyond GetReport totals — deferred, coverage expansion

### Senior Developer Review (AI) — Re-review #2 (2026-07-21)

**Outcome:** Approve (clean)

**Layers:** Blind Hunter — no remaining substantive issues; Edge Case Hunter — `[]`; Acceptance Auditor — Clean vs ACs.

**Notes:** Prior patches closed AC3/AC4 gaps. No new patch/decision findings. Low residual notes only (filter navigations already base-scoped; Redis key name `dashboard:metrics` vs AC text `stats` is brownfield/13.2, not a regression).

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

### Brownfield — current report/export surface (as implemented)

| Endpoint | Auth | Service |
|----------|------|---------|
| `GET /api/v1/admin/reports?preset=` | `TenantOperator` | `ReportService.GetReportAsync` |
| `GET /api/v1/admin/reports/export?preset=` | `TenantOperator` | `ReportService.ExportReportCsvAsync` |
| `GET /api/v1/admin/dashboard/metrics` | `TenantOperator` | `DashboardService.GetMetricsAsync` |

**Export surface today:** single CSV export of period metrics + registration rows (presets: weekly / monthly / custom). Not multi-type `clients|registrations|client-activities` (CS assumed planning names; brownfield uses this shape).

**Platform:** counts-only via `PlatformTenantService` + `IgnoreTenantFilters` (unchanged). No Platform CSV.

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
- Redis: `TenantRedisKeys.DashboardMetrics(tenantId)` → `tenant:{id}:dashboard:metrics`
- Test patterns: `TenantQueryFilterTests`, dual-tenant in-memory + `CurrentTenant`

### Project Structure Notes

| Path | Role |
|------|------|
| `src/Infrastructure/Reports/ReportService.cs` | **Primary** — export + aggregates |
| `src/Infrastructure/Dashboard/DashboardService.cs` | Explicit TenantId on tenant stats |
| `src/Application/Dashboard/IDashboardMetricsCache.cs` | Cache abstraction for DI/tests |
| `src/Api/Controllers/V1/ReportsController.cs` | Export + report routes |
| `src/Api/Controllers/V1/DashboardController.cs` | Dashboard metrics route |
| `src/Infrastructure.Tests/Tenancy/ReportDashboardTenantIsolationTests.cs` | FR28 isolation proofs |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13 Story 13.3]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR28, NFR-S4, NFR-4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — §2.3, §6, ADR-003]
- [Source: `_bmad-output/implementation-artifacts/13-2-ef-core-global-query-filters-and-redis-tenant-namespaces.md`]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- Full `Infrastructure.Tests`: 300 passed (includes 7 Story 13.3 isolation tests after CR patches)

### Completion Notes List

- Injected `ICurrentTenant` into `ReportService`; fail-closed with `InvalidOperationException` when unresolved.
- Added explicit `TenantId == ambient` predicates on Registrations, Clients, Activities, and Campaigns queries in report export/aggregates.
- Added explicit `TenantId` predicates on all `DashboardService` metric queries; Redis key remains `tenant:{id}:dashboard:metrics` via `IDashboardMetricsCache` / `RedisDashboardMetricsCache`.
- Introduced `IDashboardMetricsCache` so dashboard isolation tests can run without Redis; DI registers Redis implementation.
- Platform counts-only path (`PlatformTenantService` + `IgnoreTenantFilters`) left unchanged; no Platform CSV.
- FR28 proofs: `ReportDashboardTenantIsolationTests` (7) — CSV excludes B markers; report + dashboard A-only; unresolved + resolved-Empty fail closed.
- CR patches applied: nested collection TenantId, CSV navigation TenantId, totalLeadsAtEnd Clients.TenantId, Empty-tenant fail-closed tests.
- Story 13.4 CI gate not implemented.

### File List

- `src/Application/Dashboard/IDashboardMetricsCache.cs` (new)
- `src/Infrastructure/Reports/ReportService.cs`
- `src/Infrastructure/Dashboard/DashboardService.cs`
- `src/Infrastructure/Dashboard/RedisDashboardMetricsCache.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Infrastructure.Tests/Tenancy/ReportDashboardTenantIsolationTests.cs` (new)
- `_bmad-output/implementation-artifacts/13-3-export-and-report-queries-always-filter-by-tenantid.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-21: DS 13.3 — report/dashboard explicit TenantId filters + FR28 isolation tests; status → review.
- 2026-07-21: CR 13.3 — applied 4 patches (nested TenantId, CSV nav TenantId, totalLeadsAtEnd, Empty fail-closed); status → done.

## Ultimate context engineering tip

Story 13.3 = **prove FR28** for CSV export + report/dashboard aggregates: inject `ICurrentTenant` into ReportService, fail closed if unresolved, add **explicit** `TenantId` filters on every query (belt-and-suspenders with 13.2 EF filters), keep Platform counts-only, keep dashboard Redis namespaced, add dual-tenant isolation tests. **Not** 13.4 CI gate.

### Story completion status

done — CR patches applied; FR28 isolation proofs green (300 Infrastructure.Tests).
