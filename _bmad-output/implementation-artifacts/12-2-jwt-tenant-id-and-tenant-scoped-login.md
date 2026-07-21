---
baseline_commit: 5eafb559cb638fa7519979f954ff2a4149e10472
---

# Story 12.2: JWT tenant_id and tenant-scoped login

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Tenant Admin or Member,
I want to sign in on my tenant host and receive a JWT bound to that tenant,
so that my session cannot accidentally operate another workspace.

## Acceptance Criteria

1. **Given** a user with a `TenantMembership` on tenant `{slug}`  
   **When** they log in via `{slug}.cohestra.app` (or local equivalent)  
   **Then** the access token includes `tenant_id` and membership `role` from that membership  
   **And** refresh preserves `tenant_id`

2. **Given** a user with no membership in the resolved tenant  
   **When** they attempt login on that host  
   **Then** login fails with a clear error (stable `errorCode`, not generic invalid credentials alone)

3. **Given** an admin API request  
   **When** JWT `tenant_id` is missing or does not align with the resolved tenant Host  
   **Then** the request is rejected (401/403 as appropriate)  
   **And** client-supplied `X-Tenant-Id` alone is never trusted to set tenant context

4. **Given** a user who belongs to multiple tenants  
   **When** they log in on tenant A’s host  
   **Then** the session is bound to tenant A only (no switcher in v1)

## Tasks / Subtasks

- [ ] Host → tenant resolver (AC: 1–4)
  - [ ] Add a small Infrastructure helper (e.g. `ITenantHostResolver` / `TenantHostResolver`) that maps request Host → `Tenant` (by `Slug`)
  - [ ] **Locked Host rules:**
    - `{slug}.cohestra.app` → slug
    - `{slug}.localhost` → slug
    - Plain `localhost` / `127.0.0.1` / apex without subdomain → `DEV_TENANT_SLUG` if set, else **`default`** (`TenantIds.DefaultSlug`) so Platform 0 local/UAT login keeps working
    - Unknown slug → treat as unresolved (login/admin alignment fail appropriately; do not invent tenants)
  - [ ] Never set tenant context from `X-Tenant-Id` alone (ignore header for tenancy decisions)

- [ ] Membership lookup for login (AC: 1, 2, 4)
  - [ ] Extend `ITenantMembershipService` with `GetMembershipAsync(userId, tenantId)` (or equivalent)
  - [ ] Login: resolve Host tenant → require membership for that tenant → mint JWT from that row
  - [ ] Multi-membership: bind **only** to Host tenant (ignore other memberships for this session)
  - [ ] Clear login error when no membership on resolved tenant — e.g. `errorCode = "no_tenant_membership"` (reuse/extend message to mention workspace/host)

- [ ] JWT claims (AC: 1)
  - [ ] Extend `IJwtTokenService.CreateAccessToken` to accept tenant binding (`tenantId`, `TenantMembershipRole`)
  - [ ] Emit claim **`tenant_id`** = tenant Guid string
  - [ ] Emit claim **`role`** = membership role name (`TenantAdmin` | `TenantMember`) — architecture claim name
  - [ ] **Preserve** existing claims: `sub`, `email`, `jti`, Identity `ClaimTypes.Role` (keeps `[Authorize(Roles = TenantAdmin)]` working until 12.3)
  - [ ] Do **not** add `platform_admin` claim here (Story 12.4)

- [ ] Refresh preserves `tenant_id` (AC: 1)
  - [ ] Extend refresh token store to persist `tenantId` with the refresh token (Redis payload or paired key) — today store is userId-only
  - [ ] On refresh: load stored `tenantId` → re-check membership still exists for that user+tenant → re-issue access token with same `tenant_id` + current membership `role`
  - [ ] If membership gone → clear refresh + return clear orphan/membership error (**check before ConsumeAsync** — preserve 12.1 CR order)
  - [ ] Optional Host re-alignment on refresh: if Host resolves a tenant, it must match stored `tenant_id` or reject; if Host cannot resolve (plain token refresh without Host), trust stored claim only

- [ ] Admin JWT ↔ Host alignment (AC: 3)
  - [ ] Add middleware or endpoint filter for **authenticated admin** routes (not necessarily full Story 13.1 productization)
  - [ ] **Locked behavior:**
    - Requests with Identity **PlatformAdmin** role and **no** `tenant_id`: allow platform routes; do **not** require Host tenant bind for platform console
    - Requests that are tenant-scoped admin (have or need tenant context): require JWT `tenant_id`; require Host-resolved tenant Guid == claim; mismatch → 401/403
    - Missing `tenant_id` on a tenant-scoped admin call → 401/403
  - [ ] Do **not** mark Story 13.1 done — keep resolver thin; Epic 13 owns full pipeline + EF filters

- [ ] PlatformAdmin login path (preserve 12.1)
  - [ ] PlatformAdmin-only users continue to login **without** membership and **without** forced `tenant_id`
  - [ ] TenantAdmin Identity users still subject to Host membership + orphan rules
  - [ ] Preserve RoleExclusivity; do not put PlatformAdmin in `TenantMembershipRole`

- [ ] Wire AuthController / IssueTokens paths (AC: 1–2)
  - [ ] `LoginAsync` / `VerifyEmailAsync` / `RefreshAsync` receive Host (or pre-resolved tenant id) from controller via `HttpContext.Request.Host`
  - [ ] Bootstrap register/verify on `default` still works; first confirmed admin tokens must include `tenant_id` = `TenantIds.Default`

- [ ] Tests (AC: 1–4)
  - [ ] Unit: JwtTokenService emits `tenant_id` + membership `role`; Identity roles still present
  - [ ] Unit/integration: login on tenant A Host with membership → claim matches A; membership on B only → login on A fails clear error
  - [ ] Refresh preserves `tenant_id`; membership removed mid-session → refresh denied
  - [ ] Admin request with wrong/missing `tenant_id` vs Host → rejected; `X-Tenant-Id` alone does not authorize
  - [ ] PlatformAdmin login without membership still succeeds (no `tenant_id` required)
  - [ ] Existing Infrastructure.Tests / integration login helpers updated for Host / default slug as needed

- [ ] Out of scope (do not implement)
  - [ ] Admin vs Member endpoint matrix / replace all `[Authorize(Roles=…)]` (12.3)
  - [ ] Distinct `platform_admin` claim hardening beyond Identity role (12.4)
  - [ ] Full `TenantResolutionMiddleware` + EF global filters + TenantIsolation release gate (Epic 13)
  - [ ] Tenant switcher UI; Team invite/seats (14.x)
  - [ ] Production nginx/subdomain productization as Epic 15 deliverable (Host parsing for login/alignment is in scope; shipping public DNS is not)

## Dev Notes

### Epic context

Epic 12 = Secure Tenant Sign-In & Roles (FR-4, FR-5, FR-7). **12.1** introduced membership + killed single-operator lock. **12.2** binds JWT to Host-resolved tenant. **12.3** enforces Admin vs Member. **12.4** hardens platform claim separation.

[Source: `epics-cohestra-enterprise.md` Epic 12 / Story 12.2]

### Architecture compliance (must follow)

| Source | Implication |
|--------|-------------|
| AD-3 | Access token includes `tenant_id` from active membership; Host alignment on admin; refresh preserves claim; never trust `X-Tenant-Id` alone |
| AD-2 | Host `{slug}.cohestra.app` → `Tenants.Slug`; local `{slug}.localhost` / `DEV_TENANT_SLUG` |
| AD-7 | Membership Role ∈ TenantAdmin, TenantMember only — Platform Admin is not a membership role |
| Consistency | JWT claims: `sub`, `tenant_id`, `role`, optional `platform_admin` (optional → 12.4) |
| NFR-1 | JWT `tenant_id` validated on every admin request |
| project-context | Forward Host; do not reintroduce `GetExistingOperatorAsync` |

[Source: `ARCHITECTURE-SPINE.md` AD-2/AD-3/AD-7; `addendum.md`; `project-context.md`]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| `JwtTokenService.CreateAccessToken` | `sub`, `email`, `jti`, Identity roles only | Add `tenant_id` + membership `role`; keep Identity roles |
| `AuthService.LoginAsync` / `IssueTokensAsync` | Global email login; orphan = zero memberships anywhere | Host-scoped membership; bind session to that tenant |
| `IRefreshTokenStore` | Stores `userId` only | Persist `tenantId` with refresh; preserve on rotate |
| Host / tenancy middleware | **None** | Thin Host resolver + admin JWT/Host alignment (not full 13.1) |
| `ITenantMembershipService` | create/ensure/count/bootstrap | Add get-by-(user, tenant) |
| Controllers | `[Authorize(Roles = TenantAdmin)]` | **Unchanged** authorization attributes (12.3) |
| PlatformAdmin | Login OK without membership | Keep; tokens may omit `tenant_id` |

Key paths:
- `src/Infrastructure/Auth/JwtTokenService.cs`
- `src/Infrastructure/Auth/AuthService.cs`
- `src/Infrastructure/Auth/IRefreshTokenStore.cs` / `RedisRefreshTokenStore.cs`
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Api/Program.cs`
- `src/Application/Tenants/ITenantMembershipService.cs`
- `src/Infrastructure/Tenants/TenantMembershipService.cs`
- `src/Domain/Tenants/TenantIds.cs` — `Default` / `DefaultSlug`
- Tests: `AuthServiceMembershipGuardTests.cs`, new JWT/Host tests; `IntegrationTestHelpers.cs` if login Host required

### Previous story intelligence (12.1) — do not regress

- Bootstrap closes only when **confirmed** TenantAdmin exists on `default` (EmailConfirmed join).
- Orphan / membership denial **before** refresh `ConsumeAsync`.
- Ensure membership **before** OTP consume on verify; Ensure before EmailConfirmed.
- Register resume blocked when bootstrap closed; create-path never treats Ensure failure as success.
- `EnsureMembership` role mismatch → Conflict; detach entity on unique violation.
- RoleExclusivity PlatformAdmin ⊥ TenantAdmin.
- Identity role string remains `TenantAdmin` (not `Admin`).

### Claim / auth design locks (avoid CR thrash)

1. **Membership `role` claim** uses claim type `"role"` with value `TenantAdmin` or `TenantMember`. Identity roles remain `ClaimTypes.Role` for existing `[Authorize]`.
2. **PlatformAdmin tokens** omit `tenant_id`. Alignment middleware skips Host/`tenant_id` match when user is PlatformAdmin **and** route is platform-scoped; tenant admin APIs still require a tenant-bound JWT (PlatformAdmin cannot impersonate TenantAdmin — 12.4 deepens this).
3. **Local Host fallback** to `default` when no subdomain and no `DEV_TENANT_SLUG` — required for Platform 0 continuity.
4. **Refresh** must store `tenantId` server-side; do not accept client-supplied tenant on refresh body.

### Anti-patterns (will fail review)

- Trusting `X-Tenant-Id` (or query `?tenant=`) as sole tenant authority
- Issuing `tenant_id` from “first membership” without Host resolution
- Dropping Identity role claims (breaks change-password / admin controllers)
- Implementing full Epic 13 EF filters / TenantIsolation gate as this story
- Replacing every `[Authorize(Roles=TenantAdmin)]` with membership policies (12.3)
- Adding `platform_admin` claim work beyond keeping Identity PlatformAdmin login (12.4)
- Reintroducing single-operator Identity headcount lock

### Testing standards

- xUnit in `Infrastructure.Tests`; prefer harness pattern from `AuthServiceMembershipGuardTests`
- Integration: `WebApplicationFactory`, Host header on login client when asserting tenant bind
- Decode JWT in unit tests (handler) to assert claim values — no Moq package; use real/stub services as in 12.1

### Project Structure Notes

- Prefer `src/Infrastructure/Tenancy/` for Host resolver + alignment middleware (spine seed name) — or `Infrastructure/Tenants/` if thinner; do not put business logic in controllers
- Application contracts for membership stay in `Application/Tenants`
- Web Host forwarding (`web/middleware.ts`) is nice-to-have if login already hits API with correct Host via nginx; do not block API story on Next middleware if nginx already forwards Host

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 12 / Story 12.2]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-4, NFR-1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/addendum.md` — claims, local Host]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-2, AD-3, AD-7]
- [Source: `_bmad-output/implementation-artifacts/12-1-tenantmembership-and-remove-single-operator-gate.md`]
- [Source: `_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
