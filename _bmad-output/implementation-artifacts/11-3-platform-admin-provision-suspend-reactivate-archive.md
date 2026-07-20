---
baseline_commit: 3ba711155e855ec37b6e50af17d51e00ac657096
---

# Story 11.3: Platform Admin provision, suspend, reactivate, archive

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Platform Admin,
I want to create tenants and run break-glass Suspend / reactivate / archive with a reason,
so that abuse and support freezes are handled without using Suspend as collections.

## Acceptance Criteria

1. **Given** an authenticated Platform Admin  
   **When** they create a tenant (name, slug, initial plan, admin contact email)  
   **Then** a `Tenant` row is created with `Status=Active` (and defaults `BillingStatus=Free` unless plan path says otherwise)  
   **And** the action is audited (actor user id, timestamp, action, tenant id)  
   **And** slug follows P10 rules (lowercase `[a-z0-9-]`, 3–48, start/end alphanumeric, reserved list) and is globally unique

2. **Given** an Active tenant  
   **When** Platform Admin sets `Status=Suspended` with a **required** reason (abuse / ToS / support freeze)  
   **Then** the change is persisted and audited (reason stored on the audit entry)  
   **And** API/OpenAPI copy frames Suspend as break-glass — **not** non-payment  
   **And** `BillingStatus` is left unchanged

3. **Given** a Suspended tenant  
   **When** Platform Admin reactivates  
   **Then** `Status=Active` and prior `BillingStatus` remains  
   **And** the action is audited

4. **Given** a tenant to wind down  
   **When** Platform Admin archives  
   **Then** `Status=Archived`, `ArchivedAt` is set (UTC), and the action is audited  
   **And** soft-archive window is represented (`ArchivedAt` + documented 30-day retention) — **hard purge job is out of scope**

5. **Given** a JWT without Platform Admin authorization  
   **When** they call platform tenant lifecycle endpoints  
   **Then** the request is rejected with **403** (ProblemDetails)

## Tasks / Subtasks

- [x] Platform Admin auth (minimal — unblocks AC 5; full PlatformUsers story remains 12.4) (AC: 5)
  - [x] Add Identity role constant e.g. `PlatformAdminSeeder.PlatformAdminRole = "PlatformAdmin"` (do **not** reuse `OperatorSeeder.AdminRole`)
  - [x] Ensure role exists at startup; optional config seed `PlatformAdminSeed:Enabled/Email/Password` (mirror `OperatorSeed` pattern) — **disabled by default** in production-like configs
  - [x] Existing `JwtTokenService` already emits `ClaimTypes.Role` from Identity roles — no claim inventing required for this story
  - [x] Protect platform controller with `[Authorize(Roles = PlatformAdminSeeder.PlatformAdminRole)]` (or equivalent policy named `PlatformAdmin`)
  - [x] Document that Story 12.4 may add `platform_admin` claim / PlatformUsers; this story’s role is the v1 gate

- [x] Domain + persistence (AC: 1–4)
  - [x] Add slug rules helper in Domain e.g. `TenantSlugRules` — validate format + reserved set: `www`, `api`, `admin`, `app`, `platform`, `mail`, `ftp`, `cdn`, `static`, `status`, `support`, `help`, `billing`, `cohestra` (+ reject `default` for **new** provisioned tenants; Platform 0 `default` row already exists)
  - [x] Extend `Tenant` with: `AdminContactEmail` (required on create), `ArchivedAt` (`DateTimeOffset?`), optional `SuspendedAt` (`DateTimeOffset?`) — clear `SuspendedAt` on reactivate; set `ArchivedAt` on archive
  - [x] Do **not** add `IsComplimentary` (11.5); do **not** add `TenantMembership` (Epic 12)
  - [x] Add immutable audit entity e.g. `PlatformAuditLog` (`Id`, `ActorUserId`, `TenantId`, `Action` string/enum, `Reason?`, `CreatedAt`, optional `DetailsJson`) — append-only; no update/delete API
  - [x] EF configs + migration for new columns + `platform_audit_logs` (or `platform_audit_entries`) table
  - [x] Stamp `CreatedAt`/`UpdatedAt` on Tenant write paths (11.1 CR defer)

- [x] Application + Infrastructure service (AC: 1–4)
  - [x] `IPlatformTenantService` in `Application/Tenants/` (or `Application/Platform/`)
  - [x] Implement in Infrastructure: create / suspend / reactivate / archive
  - [x] Create: validate slug → unique check → insert Tenant (`Status=Active`, `Plan` from request, `BillingStatus=Free` for Basic; for Core/Pro provisioned without Stripe still use `BillingStatus=Free` and document that Checkout is later — do **not** invent Stripe objects)
  - [x] Suspend: require non-whitespace reason; only from `Active` (or document allowed transitions); **never** mutate `BillingStatus`
  - [x] Reactivate: only from `Suspended` → `Active`; leave `BillingStatus` alone
  - [x] Archive: set `ArchivedAt=UtcNow`, `Status=Archived`; reject nonsense transitions (e.g. archive already Archived → 409)
  - [x] Every successful lifecycle mutation writes one audit row in the same SaveChanges (or explicit transaction)
  - [x] Do **not** create Identity users / TenantMembership on provision — store `AdminContactEmail` only (membership lands Epic 12 / signup FR-1)

- [x] API (AC: 1–5)
  - [x] Add `PlatformTenantsController` at route `api/v1/platform/tenants` (spine name; **not** under `api/v1/admin`)
  - [x] Endpoints (suggested):
    - `POST /` → create
    - `POST /{tenantId}/suspend` body `{ "reason": "..." }`
    - `POST /{tenantId}/reactivate`
    - `POST /{tenantId}/archive`
  - [x] Contracts under `Contracts/Platform/` — request/response DTOs only; never return EF entities
  - [x] ProblemDetails for 400 (validation), 403 (authz), 404 (unknown tenant), 409 (slug conflict / illegal transition)
  - [x] XML/OpenAPI summaries: Suspend = abuse/ToS/support freeze — **not** collections / non-payment

- [x] Tests (AC: 1–5)
  - [x] Unit: `TenantSlugRules` reserved/format cases; lifecycle transition matrix; Suspend leaves BillingStatus unchanged; audit written
  - [x] Integration (preferred): PlatformAdmin JWT can create/suspend/reactivate/archive; tenant `Admin` JWT → **403** on same routes; unauthenticated → 401
  - [x] Extend integration helpers to seed/login a PlatformAdmin user without breaking Platform 0 operator tests
  - [x] Run `dotnet test src/Infrastructure.Tests` (+ relevant Api.IntegrationTests if stack available)

- [x] Out of scope
  - [x] Platform tenant **directory UI** / Midnight Atelier console (Story 11.4)
  - [x] Complimentary flag (11.5)
  - [x] JWT `tenant_id`, TenantMembership, remove single-operator gate (Epic 12)
  - [x] EF global filters / TenantResolutionMiddleware (Epic 13)
  - [x] Hard purge job after 30 days; Stripe Checkout; Suspend-as-collections
  - [x] Impersonation / login-as-tenant (explicitly forbidden — PRD A-5)

### Review Findings

_CR 2026-07-20 — Blind Hunter / Edge Case / Acceptance Auditor. Auditor: ACs 1–5 pass._

- [x] [Review][Decision] Block suspend/archive of Platform 0 `TenantIds.Default`? — **chose Block (409)** 2026-07-20
- [ ] [Review][Patch] Reject suspend/archive when `tenant.Id == TenantIds.Default` → 409 [PlatformTenantService.cs]
- [ ] [Review][Patch] Map slug unique-index race to 409 via `DbUpdateException` [PlatformTenantService.cs CreateAsync]
- [ ] [Review][Patch] Null-guard create/suspend request bodies → 400 [PlatformTenantsController.cs]
- [ ] [Review][Patch] Reject `Guid.Empty` actor user id [PlatformTenantsController.cs TryGetActorUserId]
- [ ] [Review][Patch] Validate AdminContactEmail format + Name/Reason/Email max lengths before SaveChanges [PlatformTenantService.cs]
- [ ] [Review][Patch] Reject numeric enum plan strings (`"0"`) — require named plans [PlatformTenantService.cs]
- [ ] [Review][Patch] Make `TenantSlugRules.Reserved` immutable (`FrozenSet` / copy) [TenantSlugRules.cs]
- [ ] [Review][Patch] Keep `SuspendedAt` when archiving from Suspended (forensics) [PlatformTenantService.ArchiveAsync]
- [x] [Review][Defer] Append-only audit enforcement (DB triggers / no-update interceptor) — deferred, documentation + no update API for now
- [x] [Review][Defer] Concurrent PlatformAdminSeeder race — deferred, same pattern as OperatorSeeder
- [x] [Review][Defer] Optimistic concurrency on Tenant status transitions — deferred, low-traffic platform path
- [x] [Review][Defer] Integration tests skippable without `/ready` stack — deferred, story allows; CI stack optional

## Dev Notes

### Epic context

Epic 11 = tenant workspaces + Platform Control. **11.1** dials + evaluator · **11.2** TenantId migration · **11.3 (this)** lifecycle API + audit · **11.4** directory/health UI · **11.5** complimentary. FR-2 / UX-DR16 / AD-7 (platform role separate from tenant Admin).

### Critical product rules

| Rule | Implication |
|------|-------------|
| Suspend ≠ collections | Never auto-set Suspend from billing; copy must say abuse/ToS/freeze |
| Suspended wins | `TenantAccessEvaluator` already blocks; **enforcement on requests is Epic 13** — do not fake middleware here |
| Soft archive 30d | Set `ArchivedAt`; document retention; no purge job |
| No impersonation | Platform Admin only metadata/lifecycle |

### Architecture compliance

| AD / source | Implication |
|-------------|-------------|
| Spine structural seed | `Controllers/V1/PlatformTenantsController.cs` |
| AD-7 | Platform Admin ≠ tenant membership; separate role/claim |
| AD-8 | Plan ∈ Basic/Core/Pro/Enterprise |
| AD-11 | Dual dials; Suspended wins (evaluator already shipped) |
| Slug P10 | Reserved list + format in Domain helper |
| FR-18 (partial) | Immutable audit for lifecycle; directory listing is 11.4; `/ready` already exists |

[Source: `architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md`, `epics-cohestra-enterprise.md` Story 11.3, PRD § slug/A-6]

### Previous story intelligence

**11.1**
- `Tenant`, enums, `TenantAccessEvaluator` (Active+Canceled → Blocked), `tenants` table unique Slug
- Deferred slug format validation → **implement here**
- Deferred CreatedAt/UpdatedAt auto-stamp → **stamp on write here**

**11.2**
- `TenantIds.Default` / slug `default` seeded; all business rows tenant-scoped
- `ApplyDefaultTenantIds` on SaveChanges until Epic 12–13
- Do not create a second “default” via provision API; reject reserved/`default` slug on create
- Global query filters **not** enabled

### Auth reality today (do not invent wrong gate)

- Only Identity role `"Admin"` (tenant operator) exists — used by all `api/v1/admin/*`
- **Must not** authorize platform routes with `Admin`
- Single-operator gate still in `AuthService` — leave it; Epic 12 removes it
- Minimal PlatformAdmin role + seed is the correct 11.3 unblocking slice of 12.4

### Suggested state machine

```text
create     → Active (+ BillingStatus=Free for provisioned tenants)
Active     → Suspended (reason required) | Archived
Suspended  → Active (reactivate) | Archived
Archived   → (terminal for v1 API; restore optional later / FR-25 note — out of scope unless trivial)
```

Illegal transitions → 409 ProblemDetails.

### Files to touch (expected)

| Area | Paths |
|------|--------|
| Domain | `Tenants/TenantSlugRules.cs`, `Tenants/Tenant.cs` (+ fields), `Tenants/PlatformAuditLog.cs` (or `Platform/`), action enum |
| Application | `Tenants/IPlatformTenantService.cs` (+ result types if useful) |
| Contracts | `Platform/*.cs` |
| Infrastructure | `Platform/PlatformTenantService.cs`, `Auth/PlatformAdminSeeder.cs`, EF config + migration, DI register |
| Api | `Controllers/V1/PlatformTenantsController.cs`, Program/startup seed call |
| Config | `appsettings*.json` `PlatformAdminSeed` section (Enabled=false by default) |
| Tests | `Infrastructure.Tests/Tenants/*`, `Api.IntegrationTests` platform auth cases |
| Web | **Skip** platform UI (11.4) |

### Testing requirements

- xUnit style matching `TenantAccessEvaluatorTests` / integration collection patterns
- Prove **403** for tenant Admin role on platform routes (AC 5 is a release gate for this story)
- Do not delete Platform 0 tests (SM-4)

### Project context reference

Follow `_bmad-output/project-context.md`: brownfield extend-only; ProblemDetails; Contracts-only wire types; dual-dial rules; never Suspend-for-unpaid; no greenfield platform app.

### Git intelligence

Recent commits on enterprise branch: 11.2 CR patches (migration seed assert + drop TenantId DEFAULT), DemoDataSeeder TenantId, SitePage legacy doc, 11.1 access matrix. Continue Domain POCO + fluent config + Infrastructure service + thin controller pattern.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- `dotnet test src/Infrastructure.Tests` — 161 passed
- `dotnet ef migrations add AddPlatformTenantLifecycle`
- `dotnet test src/Api.IntegrationTests --filter PlatformTenant` — 2 skipped (no local Postgres/Redis `/ready`)
- `dotnet build src/Api` — succeeded

### Completion Notes List

- Added `PlatformAdmin` Identity role + optional `PlatformAdminSeed` (Enabled=false by default); wired at startup after OperatorSeeder.
- Domain: `TenantSlugRules` (P10 + reserved/`default`), Tenant `AdminContactEmail`/`SuspendedAt`/`ArchivedAt`, immutable `PlatformAuditLog`.
- `PlatformTenantService` create/suspend/reactivate/archive; Suspend never mutates BillingStatus; audit per mutation.
- API: `POST api/v1/platform/tenants` (+ suspend/reactivate/archive); OpenAPI copy marks Suspend as break-glass.
- Unit tests for slug rules + lifecycle/audit; integration tests assert Admin→403 and PlatformAdmin lifecycle (skip when stack down).

### File List

- src/Domain/Tenants/TenantSlugRules.cs
- src/Domain/Tenants/PlatformAuditAction.cs
- src/Domain/Tenants/PlatformAuditLog.cs
- src/Domain/Tenants/Tenant.cs
- src/Application/Tenants/IPlatformTenantService.cs
- src/Contracts/Platform/PlatformTenantContracts.cs
- src/Infrastructure/Auth/PlatformAdminSeedSettings.cs
- src/Infrastructure/Auth/PlatformAdminSeeder.cs
- src/Infrastructure/Platform/PlatformTenantService.cs
- src/Infrastructure/Persistence/CohestraDbContext.cs
- src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs
- src/Infrastructure/Persistence/Configurations/PlatformAuditLogConfiguration.cs
- src/Infrastructure/Persistence/Migrations/20260720165150_AddPlatformTenantLifecycle.cs
- src/Infrastructure/Persistence/Migrations/20260720165150_AddPlatformTenantLifecycle.Designer.cs
- src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs
- src/Infrastructure/DependencyInjection.cs
- src/Api/Controllers/V1/PlatformTenantsController.cs
- src/Api/Program.cs
- src/Api/appsettings.json
- src/Infrastructure.Tests/Tenants/TenantSlugRulesTests.cs
- src/Infrastructure.Tests/Tenants/PlatformTenantServiceTests.cs
- src/Api.IntegrationTests/PlatformTenantLifecycleIntegrationTests.cs
- src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs
- src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs

## Change Log

- 2026-07-20: Story context created (ready-for-dev)
- 2026-07-20: Implemented Platform Admin lifecycle API + audit — status → review
