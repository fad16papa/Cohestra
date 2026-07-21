---
baseline_commit: 39993a7feccc09b8b9f11ffe06481117f862f103
---

# Story 12.1: TenantMembership and remove single-operator gate

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a multi-user tenant,
I want users linked to tenants via membership roles,
so that Cohestra is no longer limited to a single global operator.

## Acceptance Criteria

1. **Given** the identity model  
   **When** `TenantMembership` is introduced  
   **Then** it stores `UserId`, `TenantId`, and `Role` ∈ {TenantAdmin, TenantMember}  
   **And** a user may have memberships in multiple tenants (UI switcher still deferred)

2. **Given** the existing `AuthService` single-operator existence check (`GetExistingOperatorAsync` or equivalent)  
   **When** this story completes  
   **Then** that gate is removed so a second user can exist without blocking signup/invite flows later

3. **Given** the seeded `default` tenant from Epic 11  
   **When** migration/seed runs  
   **Then** the existing Platform 0 operator (if any) is linked as `TenantAdmin` on `default`  
   **And** orphaned users without membership cannot obtain a tenant-scoped admin session

4. **Given** unit/integration coverage  
   **When** memberships are created/queried  
   **Then** role values are validated and duplicate `(UserId, TenantId)` memberships are rejected

## Tasks / Subtasks

- [ ] Domain + EF (AC: 1, 4)
  - [ ] Add `TenantMembershipRole` enum: `TenantAdmin = 0`, `TenantMember = 1` — **never** add PlatformAdmin here
  - [ ] Add `TenantMembership` entity under `src/Domain/Tenants/TenantMembership.cs` (`Id`, `UserId`, `TenantId`, `Role`, `CreatedAt`, `UpdatedAt`)
  - [ ] EF configuration: required FKs; unique index `(UserId, TenantId)`; table `tenant_memberships` (snake_case to match tenants)
  - [ ] `DbSet<TenantMembership>` on `CohestraDbContext`
  - [ ] EF migration + snapshot update

- [ ] Remove single-operator gate (AC: 2)
  - [ ] Delete `AuthService.GetExistingOperatorAsync` and all call sites
  - [ ] Rewrite `GetOnboardingStatusAsync` / `RegisterAsync` without Identity-role headcount as a workspace lock
  - [ ] **Bootstrap rule (locked for this story):** `registrationAvailable` / register accept when **default tenant has zero `TenantAdmin` memberships**; once ≥1 TenantAdmin membership exists on `default`, public `/auth/register` returns a clear “sign in instead” style error — this is **membership-scoped first bootstrap**, not a global Identity `GetUsersInRoleAsync` count. Do **not** reintroduce `GetExistingOperatorAsync`.
  - [ ] On successful Platform 0 register (first TenantAdmin on default): create Identity `TenantAdmin` role **and** `TenantMembership` on `TenantIds.Default` with `Role=TenantAdmin`
  - [ ] Keep `RoleExclusivity` on register — refuse TenantAdmin if user is/would be PlatformAdmin
  - [ ] Update AuthController 409 mapping if message strings change; web register/onboarding copy if needed

- [ ] Seed + backfill (AC: 3)
  - [ ] After OperatorSeeder ensures a TenantAdmin user: upsert `TenantMembership` (TenantAdmin) on `TenantIds.Default` for that user
  - [ ] Migration or startup backfill: every user currently in Identity role `TenantAdmin` who is **not** in `PlatformAdmin` gets membership on `default` if missing (idempotent)
  - [ ] Never create TenantMembership for PlatformAdmin-only users

- [ ] Orphan session guard (AC: 3)
  - [ ] In `AuthService.LoginAsync` / `IssueTokensAsync` path: if user has Identity `TenantAdmin` **and** has **zero** `TenantMembership` rows → refuse tokens with a clear error (not a generic invalid credentials). PlatformAdmin-only users (no TenantAdmin role) continue to login without membership.
  - [ ] Do **not** add JWT `tenant_id` claim here (Story 12.2)

- [ ] Membership write API surface for tests/service (AC: 1, 4)
  - [ ] Prefer a small Application/Infrastructure helper (e.g. `ITenantMembershipService` or internal seeder helper) for create/query with validation — Controllers for Team invite stay Epic 14
  - [ ] Reject invalid role; reject duplicate `(UserId, TenantId)` → Conflict/validation

- [ ] Tests (AC: 1–4)
  - [ ] Unit: unique `(UserId, TenantId)`; invalid role rejected; create TenantAdmin + TenantMember
  - [ ] Unit/integration: `GetExistingOperatorAsync` gone — second Identity user can exist; register blocked only when default already has TenantAdmin membership (bootstrap rule)
  - [ ] Seed/backfill: operator linked to `default`
  - [ ] Orphan TenantAdmin Identity user without membership → login/token denied
  - [ ] PlatformAdmin login still works without membership
  - [ ] Existing platform TenantAdmin→403 / PlatformAdmin lifecycle tests still pass

- [ ] Out of scope (do not implement)
  - [ ] JWT `tenant_id` / Host-aligned login (12.2)
  - [ ] Admin vs Member endpoint matrix (12.3)
  - [ ] `platform_admin` claim work beyond existing Identity PlatformAdmin role (12.4)
  - [ ] Team invite / seats (14.6); tenant switcher UI; TenantResolutionMiddleware (Epic 13)
  - [ ] Replacing every `[Authorize(Roles = TenantAdmin)]` with membership policies — keep Identity role gates until 12.2/12.3

## Dev Notes

### Epic context

Epic 12 = Secure Tenant Sign-In & Roles (FR-4, FR-5, FR-7). **12.1** introduces the join table and kills the Platform 0 single-operator lock. **12.2** binds JWT to tenant. **12.3** enforces Admin vs Member. **12.4** hardens Platform Admin route separation.

[Source: `epics-cohestra-enterprise.md` Epic 12 / Story 12.1]

### Architecture compliance

| Source | Implication |
|--------|-------------|
| AD-7 | `TenantMemberships(UserId, TenantId, Role)` Role ∈ TenantAdmin, TenantMember only |
| AD-7 / FR-7 | Platform Admin is **not** a membership role — Identity `PlatformAdmin` / later claim |
| Naming | Identity role string remains `TenantAdmin` (not `Admin`); membership enum mirrors PRD names |
| project-context | Remove `GetExistingOperatorAsync` — do not reintroduce |
| RoleExclusivity | PlatformAdmin ⊥ TenantAdmin — preserve fail-closed |

[Source: `ARCHITECTURE-SPINE.md` AD-7; `project-context.md`; Epic 11 RoleExclusivity]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| `AuthService.GetExistingOperatorAsync` | Blocks second operator via `GetUsersInRoleAsync(TenantAdmin)` | **Delete**; use membership-based bootstrap only |
| `GetOnboardingStatusAsync` / `RegisterAsync` | Gate on existing operator | Membership count on `default` for first bootstrap; always create membership on success |
| `OperatorSeeder` | Creates TenantAdmin Identity user; skips if any TenantAdmin exists | Keep Identity seed; **add** membership on `default` |
| `ApplicationUser` | Global Identity user, no TenantId | Unchanged |
| Controllers | `[Authorize(Roles = TenantAdmin)]` | **Unchanged** this story |
| JWT | `sub`, `email`, roles — no `tenant_id` | **Unchanged** (12.2) |
| `TenantMembership` | Does not exist | **Create** |

Key paths:
- `src/Infrastructure/Auth/AuthService.cs` (~33–54 onboarding, ~129–210 register, ~398–412 gate)
- `src/Infrastructure/Auth/OperatorSeeder.cs`
- `src/Infrastructure/Auth/RoleExclusivity.cs` — preserve
- `src/Infrastructure/Identity/ApplicationUser.cs`
- `src/Domain/Tenants/TenantIds.cs` — `Default` / `DefaultSlug`
- `web/components/auth/register-form.tsx` + `web/lib/auth-api.ts` — onboarding flag consumers

### Previous story intelligence (Epic 11)

- Tenant entity + `TenantIds.Default` = `11111111-1111-1111-1111-111111111111`, slug `default` (must exist before membership FK)
- Identity role renamed `Admin` → `TenantAdmin`; existing JWTs with `Admin` need re-login after deploy
- Hard rule: PlatformAdmin ⊥ TenantAdmin (`RoleExclusivity`)
- Platform routes stay PlatformAdmin-only; do not authorize with TenantAdmin
- Integration helpers: `LoginAsOperatorAsync` (`operator@cohestra.local`), `LoginAsPlatformAdminAsync`
- Leave unrelated dirty files alone (e.g. `deploy/uat-bootstrap.sh`)

### Anti-patterns (do not)

- Put `PlatformAdmin` in `TenantMembership.Role`
- Reintroduce `GetUsersInRoleAsync(TenantAdmin).Count` as a global workspace lock
- Issue JWT `tenant_id` or trust `X-Tenant-Id` alone (12.2)
- Swap all admin controllers to membership authorization yet (12.3)
- Create a parallel auth microservice / greenfield Identity stack
- Soft-delete membership without uniqueness story (keep unique `(UserId, TenantId)` for v1)

### Testing requirements

- Prove unique constraint / service-level duplicate rejection
- Prove gate removed (Identity can have >1 TenantAdmin user **after** invites/later flows — bootstrap register still membership-gated on default)
- Prove operator seed → membership on `default`
- Prove orphan TenantAdmin Identity → no tokens
- Prove PlatformAdmin login without membership
- Run `dotnet test` filtered Auth/Tenant as appropriate; keep platform lifecycle SkippableFacts green when stack available

### Project context reference

Follow `_bmad-output/project-context.md`: brownfield extend-only; ProblemDetails; Contracts wire types; Identity role names; no single-operator reintroduction.

### Git intelligence

HEAD at story creation: `39993a7feccc09b8b9f11ffe06481117f862f103` (Epic 11 / Story 11.5 done). Build membership on that spine; do not reinvent platform auth console.

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 12 / Story 12.1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-4, FR-5, FR-7]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/addendum.md` — Identity / AD-7]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-7]
- [Source: `_bmad-output/implementation-artifacts/11-5-complimentary-sponsored-tenant-flag.md` — prior epic close-out patterns]
- [Source: `_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-21: Story context created (ready-for-dev)
