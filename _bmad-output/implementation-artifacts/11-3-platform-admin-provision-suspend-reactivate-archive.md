---
baseline_commit: 3ba711155e855ec37b6e50af17d51e00ac657096
---

# Story 11.3: Platform Admin provision, suspend, reactivate, archive

Status: ready-for-dev

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

- [ ] Platform Admin auth (minimal — unblocks AC 5; full PlatformUsers story remains 12.4) (AC: 5)
  - [ ] Add Identity role constant e.g. `PlatformAdminSeeder.PlatformAdminRole = "PlatformAdmin"` (do **not** reuse `OperatorSeeder.AdminRole`)
  - [ ] Ensure role exists at startup; optional config seed `PlatformAdminSeed:Enabled/Email/Password` (mirror `OperatorSeed` pattern) — **disabled by default** in production-like configs
  - [ ] Existing `JwtTokenService` already emits `ClaimTypes.Role` from Identity roles — no claim inventing required for this story
  - [ ] Protect platform controller with `[Authorize(Roles = PlatformAdminSeeder.PlatformAdminRole)]` (or equivalent policy named `PlatformAdmin`)
  - [ ] Document that Story 12.4 may add `platform_admin` claim / PlatformUsers; this story’s role is the v1 gate

- [ ] Domain + persistence (AC: 1–4)
  - [ ] Add slug rules helper in Domain e.g. `TenantSlugRules` — validate format + reserved set: `www`, `api`, `admin`, `app`, `platform`, `mail`, `ftp`, `cdn`, `static`, `status`, `support`, `help`, `billing`, `cohestra` (+ reject `default` for **new** provisioned tenants; Platform 0 `default` row already exists)
  - [ ] Extend `Tenant` with: `AdminContactEmail` (required on create), `ArchivedAt` (`DateTimeOffset?`), optional `SuspendedAt` (`DateTimeOffset?`) — clear `SuspendedAt` on reactivate; set `ArchivedAt` on archive
  - [ ] Do **not** add `IsComplimentary` (11.5); do **not** add `TenantMembership` (Epic 12)
  - [ ] Add immutable audit entity e.g. `PlatformAuditLog` (`Id`, `ActorUserId`, `TenantId`, `Action` string/enum, `Reason?`, `CreatedAt`, optional `DetailsJson`) — append-only; no update/delete API
  - [ ] EF configs + migration for new columns + `platform_audit_logs` (or `platform_audit_entries`) table
  - [ ] Stamp `CreatedAt`/`UpdatedAt` on Tenant write paths (11.1 CR defer)

- [ ] Application + Infrastructure service (AC: 1–4)
  - [ ] `IPlatformTenantService` in `Application/Tenants/` (or `Application/Platform/`)
  - [ ] Implement in Infrastructure: create / suspend / reactivate / archive
  - [ ] Create: validate slug → unique check → insert Tenant (`Status=Active`, `Plan` from request, `BillingStatus=Free` for Basic; for Core/Pro provisioned without Stripe still use `BillingStatus=Free` and document that Checkout is later — do **not** invent Stripe objects)
  - [ ] Suspend: require non-whitespace reason; only from `Active` (or document allowed transitions); **never** mutate `BillingStatus`
  - [ ] Reactivate: only from `Suspended` → `Active`; leave `BillingStatus` alone
  - [ ] Archive: set `ArchivedAt=UtcNow`, `Status=Archived`; reject nonsense transitions (e.g. archive already Archived → 409)
  - [ ] Every successful lifecycle mutation writes one audit row in the same SaveChanges (or explicit transaction)
  - [ ] Do **not** create Identity users / TenantMembership on provision — store `AdminContactEmail` only (membership lands Epic 12 / signup FR-1)

- [ ] API (AC: 1–5)
  - [ ] Add `PlatformTenantsController` at route `api/v1/platform/tenants` (spine name; **not** under `api/v1/admin`)
  - [ ] Endpoints (suggested):
    - `POST /` → create
    - `POST /{tenantId}/suspend` body `{ "reason": "..." }`
    - `POST /{tenantId}/reactivate`
    - `POST /{tenantId}/archive`
  - [ ] Contracts under `Contracts/Platform/` — request/response DTOs only; never return EF entities
  - [ ] ProblemDetails for 400 (validation), 403 (authz), 404 (unknown tenant), 409 (slug conflict / illegal transition)
  - [ ] XML/OpenAPI summaries: Suspend = abuse/ToS/support freeze — **not** collections / non-payment

- [ ] Tests (AC: 1–5)
  - [ ] Unit: `TenantSlugRules` reserved/format cases; lifecycle transition matrix; Suspend leaves BillingStatus unchanged; audit written
  - [ ] Integration (preferred): PlatformAdmin JWT can create/suspend/reactivate/archive; tenant `Admin` JWT → **403** on same routes; unauthenticated → 401
  - [ ] Extend integration helpers to seed/login a PlatformAdmin user without breaking Platform 0 operator tests
  - [ ] Run `dotnet test src/Infrastructure.Tests` (+ relevant Api.IntegrationTests if stack available)

- [ ] Out of scope
  - [ ] Platform tenant **directory UI** / Midnight Atelier console (Story 11.4)
  - [ ] Complimentary flag (11.5)
  - [ ] JWT `tenant_id`, TenantMembership, remove single-operator gate (Epic 12)
  - [ ] EF global filters / TenantResolutionMiddleware (Epic 13)
  - [ ] Hard purge job after 30 days; Stripe Checkout; Suspend-as-collections
  - [ ] Impersonation / login-as-tenant (explicitly forbidden — PRD A-5)

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-20: Story context created (ready-for-dev)
