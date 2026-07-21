---
baseline_commit: 526b75568aa7163ac3ed982413dcb5404a5c646b
---

# Story 12.4: Platform Admin role claim

Status: in-progress

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Platform Admin,
I want a distinct platform role claim on my token,
so that platform routes reject ordinary tenant JWTs and tenant routes stay tenant-scoped.

## Acceptance Criteria

1. **Given** a Platform Admin identity  
   **When** they authenticate to platform routes  
   **Then** the access token includes claim **`platform_admin` = `true`** (architecture spine)  
   **And** that claim is **not** a substitute for tenant membership (`tenant_id` / membership `"role"` still omitted for platform-only sessions)

2. **Given** a tenant Admin/Member JWT **without** the platform claim  
   **When** they call Platform Admin APIs (`/api/v1/platform/*` — directory, lifecycle, me)  
   **Then** the request is rejected (**403**)

3. **Given** a Platform Admin JWT **without** a valid tenant membership context  
   **When** they call tenant admin APIs (`/api/v1/admin/*`, tenant-scoped auth like change-password)  
   **Then** they **cannot** impersonate a Tenant Admin (no break-glass login-as in v1)  
   **And** they may only perform platform metadata/lifecycle operations as defined in Epic 11

4. **Given** platform vs tenant route separation  
   **When** authorization runs  
   **Then** platform routes require the **`platform_admin` claim** (policy); tenant routes require **`tenant_id` + membership `"role"`** (existing 12.3 policies)

## Tasks / Subtasks

- [x] Emit `platform_admin` claim (AC: 1)
  - [x] Add `JwtTokenService.PlatformAdminClaimType = "platform_admin"` (value `"true"` when Identity roles include `PlatformAdmin`)
  - [x] Emit only for Platform Admin sessions — **never** on pure tenant Admin/Member tokens
  - [x] Platform-only sessions continue to **omit** `tenant_id` and membership `"role"`
  - [x] Keep emitting Identity `ClaimTypes.Role` = `PlatformAdmin` for compatibility (do not drop Identity role claims)
  - [x] Keep `MapInboundClaims = false` and `RoleClaimType = ClaimTypes.Role` — do **not** remap `"role"` / `platform_admin`

- [x] Platform authorization policy (AC: 2, 4)
  - [x] Add policy e.g. **`PlatformAdminOnly`** — authenticated + `RequireClaim("platform_admin", "true")`
  - [x] Register beside existing `AddTenantMembershipPolicies` (same extension file or `PlatformAuthorizationExtensions`)
  - [x] Switch `PlatformMeController` and `PlatformTenantsController` from `[Authorize(Roles = PlatformAdmin)]` to `[Authorize(Policy = PlatformAdminOnly)]`
  - [x] Tenant Admin/Member JWT (membership `"role"` only, no `platform_admin`) → **403** on `/api/v1/platform/*`

- [x] Block PlatformAdmin impersonation on tenant routes (AC: 3, 4)
  - [x] **Locked:** PlatformAdmin-only principals must **not** bypass tenant authz. Existing `TenantOperator` / `TenantAdminOnly` already require parseable `tenant_id` + membership `"role"` — keep that fail-closed
  - [x] **Tighten middleware:** `TenantJwtHostAlignmentMiddleware` must **not** skip Host↔`tenant_id` alignment for PlatformAdmin-only users on **tenant** paths. Path skip for `/api/v1/platform/*` remains. Remove (or narrow) the `IsInRole(PlatformAdmin) && !IsInRole(TenantAdmin)` early-return that currently skips alignment on `/admin/*`
  - [x] Result: PlatformAdmin without `tenant_id` hitting `/api/v1/admin/*` → **403** (middleware and/or membership policies) — never treated as TenantAdmin
  - [x] Do **not** implement break-glass login-as or audited impersonation

- [x] Preserve PlatformAdmin login + Epic 11 APIs (AC: 1, 3)
  - [x] PlatformAdmin-only login without membership still succeeds (12.1/12.2)
  - [x] RoleExclusivity PlatformAdmin ⊥ TenantAdmin unchanged
  - [x] Seeder / `LoginAsPlatformAdminAsync` helpers still work; tokens now include `platform_admin=true`
  - [x] Optional: `TenantProfileRoles` / platform `/me` may surface claim or keep Identity role string — UI can keep using `PlatformAdmin` Identity role for routing if claim is also present

- [x] Tests (AC: 1–4)
  - [x] `JwtTokenService`: PlatformAdmin token has `platform_admin=true`; omits `tenant_id` / membership `"role"`; tenant Admin token does **not** get `platform_admin`
  - [x] Policy: `PlatformAdminOnly` allows claim; denies tenant membership-only principal
  - [x] Controller inventory: platform controllers use `PlatformAdminOnly` policy (not Identity Roles alone)
  - [x] Middleware: PlatformAdmin-only on `/api/v1/admin/me` **does not** skip alignment (403 without `tenant_id`); `/api/v1/platform/me` still skips Host bind
  - [x] Regression: PlatformAdmin login without membership; tenant Host login + membership policies; `MapInboundClaims=false` unchanged
  - [x] Integration (optional/Skippable): operator JWT → 403 on `/platform/tenants`; PlatformAdmin → 200 on platform list — extend existing platform tests if easy

- [x] Out of scope (do not implement)
  - [x] Full `TenantResolutionMiddleware`, EF global filters, TenantIsolation CI, `[RequiresPlatformAdmin]` audit bypass productization (Epic 13)
  - [x] `PlatformUsers` table / separate identity store
  - [x] Break-glass impersonation / login-as-tenant
  - [x] Team invite, Stripe, Member UI feature-lock (Epic 14/15)
  - [x] Collapsing Identity + membership + platform into one claim type; flipping `MapInboundClaims`
  - [x] Changing Identity role string away from `PlatformAdmin` (claim is additive)

## Dev Notes

### Epic context

Epic 12 closes with **12.4**: distinct platform claim so FR-7 route separation is claim-enforced, not Identity-role-only. **12.1** membership, **12.2** `tenant_id` + Host bind, **12.3** Admin vs Member policies. Next epic is **13** isolation.

[Source: `epics-cohestra-enterprise.md` Epic 12 / Story 12.4]

### Architecture compliance (must follow)

| Source | Implication |
|--------|-------------|
| AD-7 | Platform Admin is **not** a `TenantMembership` role — claim `platform_admin` (or PlatformUsers); keep Identity role for seed/exclusivity |
| Consistency | JWT claims: `sub`, `tenant_id`, `role`, optional **`platform_admin=true`** |
| FR-7 | Platform routes reject tenant JWTs; no impersonation in MVP |
| AD-3 | Tenant admin still Host + `tenant_id`; platform console does not require tenant bind |
| 12.2/12.3 locks | `MapInboundClaims=false`; membership `"role"` ≠ Identity `ClaimTypes.Role` |

[Source: `ARCHITECTURE-SPINE.md` AD-7 / JWT claims table; `prd.md` FR-7; `addendum.md`]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| `JwtTokenService` | Identity roles + optional `tenant_id` / membership `"role"` | Also emit `platform_admin=true` when Identity has PlatformAdmin |
| Platform controllers | `[Authorize(Roles = PlatformAdmin)]` | Policy `PlatformAdminOnly` on claim |
| Host alignment middleware | Skips `/platform/*` **and** PlatformAdmin-only on any path | Keep path skip; **remove** PlatformAdmin-only skip on tenant paths |
| Tenant policies (12.3) | Require `tenant_id` + membership `"role"` | Unchanged — already blocks platform-only tokens |
| Frontend | Checks Identity `PlatformAdmin` role string | No required change if Identity role still present |

Key paths:
- `src/Infrastructure/Auth/JwtTokenService.cs`
- `src/Infrastructure/Auth/AuthService.cs` — `IssueTokensAsync` / `ResolveSessionBindingAsync`
- `src/Infrastructure/Auth/TenantAuthorizationExtensions.cs` / `TenantAuthPolicies.cs` — extend or add platform policy constants
- `src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs`
- `src/Api/Controllers/V1/PlatformMeController.cs`, `PlatformTenantsController.cs`
- `src/Api/Program.cs` — policy registration
- Tests: `JwtTokenServiceTests`, `TenantJwtHostAlignmentMiddlewareTests`, `TenantAuthControllerPolicyTests`, platform integration tests

### Claim / auth design locks (avoid CR thrash)

1. Claim type **`platform_admin`**, value **`true`** (string) — spine `platform_admin=true`.
2. **Third claim lane** — distinct from Identity `ClaimTypes.Role` and membership `"role"`. Do not set `RoleClaimType = "platform_admin"`.
3. **Identity `PlatformAdmin` role remains** the assignment source (seeder + RoleExclusivity); claim is derived at token mint.
4. **Never** add PlatformAdmin to `TenantMembershipRole` or membership table.
5. **Middleware:** platform path skip OK; PlatformAdmin-only must not auto-pass tenant Host alignment.
6. Tenant Admin JWT must **not** receive `platform_admin` even if misconfigured Identity somehow has both — RoleExclusivity should prevent; if both Identity roles appear, fail-closed (prefer refuse token or omit platform claim when TenantAdmin Identity present — document choice: **omit platform claim unless PlatformAdmin-only session** / `SessionBinding.PlatformOnly`).

### Anti-patterns (will fail review)

- Authorizing `/platform/*` with `TenantOperator` / `TenantAdminOnly`
- Putting PlatformAdmin in membership enum/table
- Skipping Host alignment for PlatformAdmin on `/admin/*` (current bug vs AC)
- Treating `platform_admin` claim as granting tenant ops without membership
- Re-enabling `MapInboundClaims` or collapsing claim types
- Implementing Epic 13 EF filters / TenantIsolation gate / break-glass impersonation
- Dropping Identity `PlatformAdmin` role emission (breaks frontend + exclusivity tests unless fully migrated — keep both)

### Previous story intelligence — do not regress

- 12.3: `TenantAdminOnly` / `TenantOperator`; Guid-parseable non-empty `tenant_id`; `TenantProfileRoles` prefers membership; campaign `plan_locked` / `tenant_not_found`
- 12.2: Host allowlist; refresh JSON `{userId,tenantId}`; membership check before refresh consume; Active tenants only
- 12.1: Bootstrap confirmed default TenantAdmin; RoleExclusivity; no `GetExistingOperatorAsync`
- Deferred: access-token membership recheck; full HTTP 403 matrix; Status∩Billing HTTP wiring

### Testing standards

- xUnit `Infrastructure.Tests`; decode JWT for claim asserts; middleware harness like `TenantJwtHostAlignmentMiddlewareTests`
- No Moq; prefer real stubs
- Keep Platform 0 / operator paths green; extend rather than delete Identity PlatformAdmin tests

### Project Structure Notes

- Prefer `TenantAuthPolicies.PlatformAdminOnly` **or** `PlatformAuthPolicies.PlatformAdminOnly` — one clear constant
- Claim constant lives next to `JwtTokenService.TenantIdClaimType`
- Web changes optional; if touched, keep `ROLES.PlatformAdmin` working via Identity claim still on token

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 12 / Story 12.4]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-7]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/addendum.md` — JWT claims]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-7, JWT claims]
- [Source: `_bmad-output/implementation-artifacts/12-3-enforce-admin-vs-member-server-side.md`]
- [Source: `_bmad-output/implementation-artifacts/12-2-jwt-tenant-id-and-tenant-scoped-login.md`]
- [Source: `_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

### Completion Notes List

- Emit `platform_admin=true` on PlatformAdmin-only JWT sessions; omit when TenantAdmin Identity present; keep Identity `ClaimTypes.Role`.
- Policy `PlatformAdminOnly` on claim; `PlatformMeController` / `PlatformTenantsController` switched from Identity Roles=.
- Removed PlatformAdmin-only Host-alignment skip on tenant paths; `/api/v1/platform/*` path skip remains.
- Tests: JWT claim emission, policy allow/deny, controller inventory, middleware tenant-path 403 vs platform-path skip. Infrastructure.Tests: **254** passed.

### File List

- `src/Infrastructure/Auth/JwtTokenService.cs`
- `src/Infrastructure/Auth/TenantAuthPolicies.cs`
- `src/Infrastructure/Auth/TenantAuthorizationExtensions.cs`
- `src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs`
- `src/Api/Controllers/V1/PlatformMeController.cs`
- `src/Api/Controllers/V1/PlatformTenantsController.cs`
- `src/Infrastructure.Tests/Auth/JwtTokenServiceTests.cs`
- `src/Infrastructure.Tests/Auth/TenantMembershipAuthorizationTests.cs`
- `src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs`
- `src/Infrastructure.Tests/Tenancy/TenantJwtHostAlignmentMiddlewareTests.cs`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/12-4-platform-admin-role-claim.md`

### Change Log

- 2026-07-21: Implement Story 12.4 platform_admin claim + PlatformAdminOnly policy; mark review.

### Review Findings

- [ ] [Review][Patch] Emit `platform_admin` only when `tenantId` and membership role are both null (PlatformOnly session) [`src/Infrastructure/Auth/JwtTokenService.cs`]
- [ ] [Review][Patch] Scope Host alignment to tenant surfaces (`/api/v1/admin`, change-password) so authenticated PlatformAdmin is not 403'd on `/api/v1/system/*` [`src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs`]
- [ ] [Review][Patch] `PlatformAdminOnly` rejects principals that also carry `tenant_id` (no hybrid dual-plane token) [`src/Infrastructure/Auth/TenantAuthorizationExtensions.cs`]
- [ ] [Review][Patch] Tests: PlatformAdmin+tenantId omits claim; hybrid denied by platform policy; PlatformAdmin-only fails TenantOperator; system path not aligned [`src/Infrastructure.Tests`]
- [x] [Review][Defer] Full HTTP WebApplicationFactory tenant→403 on `/platform/*` — deferred; policy unit coverage present
- [x] [Review][Defer] Assert `MapInboundClaims=false` via host boot — deferred (same as 12.3)
