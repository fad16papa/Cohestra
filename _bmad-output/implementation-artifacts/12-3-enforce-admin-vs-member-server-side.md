---
baseline_commit: e3615e154a37e8edd124966b27c3e2f9e2689b5f
---

# Story 12.3: Enforce Admin vs Member server-side

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Tenant Admin,
I want Members blocked from billing, team, and tenant settings APIs,
so that money and seat controls stay Admin-only while Members can run allowed ops.

## Acceptance Criteria

1. **Given** a Tenant Member JWT  
   **When** they call Team, Billing, or Tenant settings endpoints  
   **Then** the API returns **403** (ProblemDetails)

2. **Given** a Tenant Member on **Core** (no campaigns)  
   **When** they call campaign create/send (and other campaign) APIs  
   **Then** the API returns **403** (or plan-locked equivalent with stable `errorCode`, e.g. `plan_locked`)  
   **And** Member UI feature-locked copy / no billing CTA is **out of scope** (Epic 14/15)

3. **Given** a Tenant Admin  
   **When** they call the same Team / Billing / settings endpoints  
   **Then** access is allowed (role gate passes)  
   **And** Status ∩ BillingStatus / full AD-8 plan matrix beyond campaigns stay as existing or deferred — do **not** wire full `TenantAccessEvaluator` HTTP enforcement in this story

4. **Given** role checks  
   **When** any tenant admin endpoint runs  
   **Then** authorization is enforced **server-side** via membership claim policies (not UI-only, not Identity `Roles=TenantAdmin` alone)

5. **Given** Basic has only the Admin seat  
   **When** Member-role behavior is tested  
   **Then** the matrix still holds on **Core/Pro fixtures** where Member seats exist (tests create Member memberships; do not implement invite UI)

## Tasks / Subtasks

- [x] Authorization policies on membership claim (AC: 1, 3, 4)
  - [x] Keep **`MapInboundClaims = false`** and **`RoleClaimType = ClaimTypes.Role`** — do **not** set `RoleClaimType = "role"` (12.2 CR lock)
  - [x] Register named policies in `Program.cs` (or small `TenantAuthorizationExtensions`) using **`JwtTokenService.MembershipRoleClaimType`** (`"role"`):
    - **`TenantAdminOnly`** — authenticated + `RequireClaim("role", "TenantAdmin")` (+ prefer also `RequireClaim("tenant_id")`)
    - **`TenantOperator`** — authenticated + `RequireClaim("role", "TenantAdmin", "TenantMember")` (+ prefer `tenant_id`)
  - [x] Use claim **values** from `TenantMembershipRole.ToString()` (`TenantAdmin` | `TenantMember`)
  - [x] Do **not** authorize Admin vs Member via `[Authorize(Roles = …)]` / `IsInRole` on the short `"role"` claim
  - [x] Leave **PlatformAdmin** controllers on Identity `[Authorize(Roles = PlatformAdminSeeder.PlatformAdminRole)]` unchanged (12.4 hardens platform claim)

- [x] Replace Identity TenantAdmin gates on tenant admin controllers (AC: 4)
  - [x] **TenantOperator** (Member + Admin): activities, clients, communities, categories, dashboard, reports, campaigns (+ email-templates if campaign-adjacent), `GET api/v1/admin/me`, `POST api/v1/auth/change-password`, and other operational modules Members may use per FR-5
  - [x] **TenantAdminOnly**: tenant settings / money / seats stand-ins:
    - `PATCH api/v1/admin/me/appearance` (tenant appearance / brand settings)
    - `EmailDeliveryController` (SendGrid delivery/status — Admin-only per FR-5 SendGrid sender)
    - New thin **Team** and **Billing** stub controllers (below)
  - [x] **AdminSiteController**: `TenantOperator` (FR-5: Members get site admin within plan). Do **not** invent full SitePage plan gate UI; optional Basic→403 plan check only if cheap and tested — otherwise leave Site plan enforcement for later AD-8 work
  - [x] Remove controller-level `[Authorize(Roles = OperatorSeeder.TenantAdminRole)]` from tenant admin controllers once policies are applied (method-level override OK where Admin-only action lives on an otherwise Operator controller — e.g. appearance on `AdminController`)

- [x] Team + Billing Admin-only stubs (AC: 1, 3)
  - [x] Add minimal controllers so AC is testable **before** Epic 14:
    - e.g. `GET api/v1/admin/team` → 200 empty/stub payload, `[Authorize(Policy = TenantAdminOnly)]`
    - e.g. `GET api/v1/admin/billing` → 200 stub payload, same policy
  - [x] Contracts DTOs can be minimal placeholders; no Stripe, no invites, no seats logic
  - [x] Document in comments/Dev Notes: Epic 14 replaces stubs with real Team invite / Stripe Portal surfaces **keeping the same policy names**

- [x] Campaign plan gate (AC: 2)
  - [x] Enforce **Pro+** for campaign APIs (Admin **and** Member): `Tenant.Plan` ∈ {`Pro`, `Enterprise`} allowed; `Basic`/`Core` → 403 + `plan_locked` (or existing ProblemDetails shape with stable code)
  - [x] Resolve plan from JWT `tenant_id` (load Tenant row) — never from client body/header
  - [x] Prefer a small reusable helper/filter/handler (e.g. `ITenantPlanGate` / authorization requirement) used by `CampaignsController` (and email-templates if those are campaign-only)
  - [x] Do **not** implement full AD-8 matrix for every module in this story

- [x] Member session realism (AC: 5)
  - [x] Tests (and any helper) must mint/login a user with **`TenantMembershipRole.TenantMember`** on a Core/Pro tenant **without** requiring Identity role `TenantAdmin`
  - [x] Login/refresh already bind from membership (12.2) — do not reintroduce Identity-role-only admin gates that block Members from obtaining tokens
  - [x] Existing TenantAdmin Identity + membership Admin path must keep working (Platform 0 / seeded operator)

- [x] Tests (AC: 1–5)
  - [x] Member JWT → **403** on Team stub, Billing stub, appearance PATCH, email-delivery
  - [x] Member JWT → **200** (or non-403 authz) on a representative Operator endpoint (e.g. `GET admin/me` or activities list) when otherwise valid
  - [x] Admin JWT → **200** on Team/Billing stubs and settings endpoints (authz passes)
  - [x] Member on **Core** → campaign APIs **403** `plan_locked`; Member (or Admin) on **Pro** → campaign authz/plan gate passes (may still fail business validation — assert not role/plan 403)
  - [x] PlatformAdmin routes still Identity-gated; tenant policies must not open platform APIs to Members
  - [x] Regression: Host/`tenant_id` alignment middleware still applies; `MapInboundClaims` remains false
  - [x] Prefer `Infrastructure.Tests` / API filter tests; integration optional if factory helpers already support Host + token mint

- [x] Out of scope (do not implement)
  - [x] Distinct `platform_admin` claim / platform route hardening (12.4)
  - [x] Full `TenantResolutionMiddleware`, EF global filters, TenantIsolation CI gate (Epic 13)
  - [x] Team invite/seats, Stripe Checkout/Portal, UpgradePanel, feature-lock UI copy (Epic 14/15)
  - [x] Wiring `TenantAccessEvaluator` (Status ∩ BillingStatus) into every request
  - [x] Tenant switcher; creating production Member invite flows
  - [x] Reverting `MapInboundClaims` to true or collapsing Identity + membership into one claim type

## Dev Notes

### Epic context

Epic 12 = Secure Tenant Sign-In & Roles (FR-4, FR-5, FR-7). **12.1** membership table + killed single-operator gate. **12.2** JWT `tenant_id` + Host bind + membership `"role"` claim with `MapInboundClaims=false`. **12.3** (this story) enforces Admin vs Member on APIs. **12.4** platform claim separation.

[Source: `epics-cohestra-enterprise.md` Epic 12 / Story 12.3]

### FR-5 matrix (server must match)

| Capability | TenantAdmin | TenantMember |
|------------|:-----------:|:------------:|
| Activities / clients / dashboard / reports | ✓ | ✓ |
| Email campaigns | Pro+ | Pro+ |
| Public site admin | Core+ (plan) | Core+ (plan) |
| Team management | ✓ | — → **403** |
| Tenant settings / SendGrid | ✓ | — → **403** |
| Billing / Portal / upgrade | ✓ | — → **403** |

Effective access later = role ∩ plan ∩ Status ∩ BillingStatus. This story delivers **role** (+ campaign **plan** slice). Suspended/billing dials remain Domain `TenantAccessEvaluator` unused by HTTP.

[Source: `prd-cohestra-enterprise-2026-07-15/prd.md` FR-5]

### Architecture compliance (must follow)

| Source | Implication |
|--------|-------------|
| AD-7 | Membership Role ∈ TenantAdmin, TenantMember only; Platform Admin is not a membership role |
| AD-3 | JWT already has `tenant_id`; Host alignment middleware exists — keep it |
| AD-8 | Plan gates server-side — implement **campaign Pro+** gate here; do not claim full AD-8 done |
| Consistency | Claim type `"role"` for membership; Identity roles stay `ClaimTypes.Role` |
| project-context | Plan gates enforced server-side; never trust `X-Tenant-Id` alone |

[Source: `ARCHITECTURE-SPINE.md` AD-3/AD-7/AD-8; `project-context.md`]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| JWT | Emits Identity `ClaimTypes.Role` + membership `"role"` + `tenant_id` | Unchanged emission; **consume** membership `"role"` in policies |
| `Program.cs` | `MapInboundClaims=false`; `RoleClaimType=ClaimTypes.Role`; default policy = authenticated only | Add `TenantAdminOnly` / `TenantOperator` policies |
| Controllers | All tenant admin APIs `[Authorize(Roles=TenantAdmin)]` | Switch to membership policies per matrix |
| Team / Billing APIs | **Do not exist** | Thin Admin-only stubs for 403 tests |
| Campaign plan gate | **None** | Pro+ gate for campaign controllers |
| Frontend Member gating | None | **Out of scope** |

Key paths:
- `src/Api/Program.cs` — JWT + authorization registration
- `src/Infrastructure/Auth/JwtTokenService.cs` — `MembershipRoleClaimType`, `TenantIdClaimType`
- `src/Domain/Tenants/TenantMembershipRole.cs`
- `src/Api/Controllers/V1/*Controller.cs` — replace Authorize attributes
- `src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs` — do not regress
- New: policy constants + optional plan gate helper under `Api` or `Infrastructure/Auth` / `Application/Tenants`
- Tests: extend `JwtTokenServiceTests` patterns; new authz/plan matrix tests; harness like `AuthServiceMembershipGuardTests`

### Claim / auth design locks (avoid CR thrash)

1. **Dual claim systems stay dual.** Identity `ClaimTypes.Role` (`TenantAdmin`, `PlatformAdmin`) ≠ membership claim `"role"` (`TenantAdmin`, `TenantMember`).
2. **`MapInboundClaims = false` is mandatory.** Turning it on maps `"role"` → `ClaimTypes.Role` and undoes 12.2.
3. **Authorize Members with `RequireClaim("role", …)` policies**, not by changing `RoleClaimType` to `"role"`.
4. **Do not drop Identity role claims** from JWT emission — PlatformAdmin + legacy paths still need them; 12.4 may refine platform claim separately.
5. **Member users need not have Identity `TenantAdmin`.** Tests must prove Operator endpoints work with membership-only Member tokens.
6. **Stubs are intentional** until Epic 14 — same policy names must be reused when real Team/Billing land.

### Anti-patterns (will fail review)

- Setting `RoleClaimType = "role"` or re-enabling inbound claim mapping
- Leaving `[Authorize(Roles=TenantAdmin)]` on activities/clients so Members always 403
- Checking membership role only in Next.js / hiding nav without API 403
- Trusting `X-Tenant-Id` or body `plan` for plan gates
- Implementing Stripe, invites, UpgradePanel, or Epic 13 filters
- Treating PlatformAdmin Identity role as a TenantMember/Admin substitute on tenant stubs
- Collapsing Admin-only and Operator into one policy

### Previous story intelligence (12.1 / 12.2) — do not regress

- Bootstrap closes only on **confirmed** default TenantAdmin membership
- Orphan / membership denial **before** refresh `ConsumeAsync`
- Refresh JSON `{userId,tenantId}`; if membership gone → revoke + `no_tenant_membership` (never `binding.TenantId ?? session.TenantId`)
- Host allowlist: `{slug}.cohestra.app` / `{slug}.localhost`; nested multi-label rejected; Active tenants only
- Middleware skips anonymous auth paths; enforces Host↔JWT on `change-password`
- RoleExclusivity: PlatformAdmin ⊥ TenantAdmin (Identity)
- Deferred (not this story): access-token membership recheck every request; full Status∩Billing HTTP gate

### Testing standards

- xUnit in `Infrastructure.Tests` (and/or Api tests); no Moq — follow existing harnesses
- Build Member vs Admin tokens via `JwtTokenService` or login with Host header + seeded membership
- Assert ProblemDetails status **403** and stable codes where introduced (`plan_locked`)
- Keep Platform 0 Admin path green; do not delete Identity TenantAdmin tests — extend matrix

### Project Structure Notes

- Policy name constants: e.g. `TenantAuthPolicies.TenantAdminOnly` / `TenantOperator` in Api or Application
- Stub controllers stay under `src/Api/Controllers/V1/`
- Plan gate: prefer Application/Infrastructure service over fat controllers
- Web: no required UI work; if `web/lib/auth-api.ts` `ROLES` is touched for type honesty, keep minimal — Member nav gating is Epic 14

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 12 / Story 12.3]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-5]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-3, AD-7, AD-8]
- [Source: `_bmad-output/implementation-artifacts/12-2-jwt-tenant-id-and-tenant-scoped-login.md`]
- [Source: `_bmad-output/implementation-artifacts/12-1-tenantmembership-and-remove-single-operator-gate.md`]
- [Source: `_bmad-output/project-context.md`]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 12.2 CR deferrals]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

### Completion Notes List

- Added `TenantAdminOnly` / `TenantOperator` policies on membership claim `"role"` + `tenant_id`; kept `MapInboundClaims=false` and Identity `RoleClaimType`.
- Retargeted tenant admin controllers from Identity `Roles=TenantAdmin` to membership policies; appearance + email-delivery Admin-only; ops endpoints TenantOperator.
- Added Team/Billing Admin-only stubs (`GET api/v1/admin/team`, `GET api/v1/admin/billing`) for FR-5 matrix until Epic 14.
- Added `ITenantPlanGate` + `RequireProPlan` filter on campaigns/email-templates (Pro/Enterprise); Core/Basic → 403 `plan_locked`.
- Tests: policy allow/deny (Member vs Admin vs Identity-only), plan gate theory, filter ProblemDetails, controller attribute inventory. Infrastructure.Tests: **241** passed.

### File List

- `src/Application/Tenants/ITenantPlanGate.cs`
- `src/Infrastructure/Auth/TenantAuthPolicies.cs`
- `src/Infrastructure/Auth/TenantAuthorizationExtensions.cs`
- `src/Infrastructure/Auth/TenantPlanGate.cs`
- `src/Infrastructure/Auth/RequireProPlanFilter.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Program.cs`
- `src/Api/Controllers/V1/AdminController.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/Controllers/V1/AdminSiteController.cs`
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Api/Controllers/V1/BillingController.cs`
- `src/Api/Controllers/V1/CampaignsController.cs`
- `src/Api/Controllers/V1/CategoriesController.cs`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Api/Controllers/V1/CommunitiesController.cs`
- `src/Api/Controllers/V1/DashboardController.cs`
- `src/Api/Controllers/V1/EmailDeliveryController.cs`
- `src/Api/Controllers/V1/EmailTemplatesController.cs`
- `src/Api/Controllers/V1/ReportsController.cs`
- `src/Api/Controllers/V1/TeamController.cs`
- `src/Contracts/Billing/BillingStubResponse.cs`
- `src/Contracts/Team/TeamStubResponse.cs`
- `src/Infrastructure.Tests/Auth/TenantMembershipAuthorizationTests.cs`
- `src/Infrastructure.Tests/Auth/TenantPlanGateTests.cs`
- `src/Infrastructure.Tests/Auth/RequireProPlanFilterTests.cs`
- `src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs`
- `src/Infrastructure.Tests/Infrastructure.Tests.csproj`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/12-3-enforce-admin-vs-member-server-side.md`

### Change Log

- 2026-07-21: Implement Story 12.3 Admin vs Member server-side authz + campaign Pro plan gate; mark review.

### Review Findings

- [ ] [Review][Patch] Plan gate missing-tenant uses distinct errorCode (not `plan_locked`) [`src/Infrastructure/Auth/TenantPlanGate.cs`]
- [ ] [Review][Patch] Membership policies require parseable Guid `tenant_id` (not presence-only) [`src/Infrastructure/Auth/TenantAuthorizationExtensions.cs`]
- [ ] [Review][Patch] `GET admin/me` profile Roles include membership `"role"` claim for Members [`src/Api/Controllers/V1/AdminController.cs`]
- [ ] [Review][Patch] Controller inventory scans all V1 admin controllers for leftover Identity `Roles=TenantAdmin` [`src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs`]
- [ ] [Review][Patch] Assert malformed `tenant_id` fails TenantOperator / TenantAdminOnly policies [`src/Infrastructure.Tests/Auth/TenantMembershipAuthorizationTests.cs`]
- [x] [Review][Defer] Access-token path does not re-validate TenantMembership each request — deferred, pre-existing (12.2)
- [x] [Review][Defer] Full HTTP WebApplicationFactory Member→403 matrix — deferred; policy/filter unit coverage present; needs live stack
- [x] [Review][Defer] Infrastructure.Tests → Api project reference for reflection — deferred; move to Api.Tests later if desired
- [x] [Review][Defer] Assert `MapInboundClaims=false` via host boot — deferred; locked in Program.cs, no lightweight host fixture yet
