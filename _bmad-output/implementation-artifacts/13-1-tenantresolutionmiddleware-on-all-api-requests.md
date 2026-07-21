---
baseline_commit: f8659aa2fd51a591bc5d2fb3e40c96c950759476
---

# Story 13.1: TenantResolutionMiddleware on all API requests

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a security-conscious operator,
I want every API request to resolve Tenant Context before business logic,
so that handlers never run ambiguously across tenants.

## Acceptance Criteria

1. **Given** a public or admin API request  
   **When** it enters the pipeline  
   **Then** `TenantResolutionMiddleware` (or equivalent) resolves **Tenant Context** before controllers/services execute

2. **Given** Host `{slug}.cohestra.app` (or local `{slug}.localhost` / `DEV_TENANT_SLUG` where applicable)  
   **When** the slug exists and tenant is **Active**  
   **Then** Tenant Context is set to that tenant

3. **Given** an unknown or missing tenant slug on **public** routes  
   **When** resolution fails  
   **Then** the response is **404**

4. **Given** an unknown/mismatched tenant on **admin** routes  
   **When** resolution fails or JWT `tenant_id` does not match Host  
   **Then** the response is **403** (or **401** if unauthenticated)

5. **Given** apex marketing host (`cohestra.app` / `www`)  
   **When** platform marketing/signup-style API surfaces are hit (or public site on apex)  
   **Then** **no tenant SitePage context** is applied (marketing-only — do not bind apex to `default` SitePage)

## Tasks / Subtasks

- [ ] Ambient Tenant Context (AC: 1–2)
  - [ ] Add Application contract e.g. `ICurrentTenant` / `ITenantContextAccessor` with: `Guid? TenantId`, `string? Slug`, `bool IsResolved`, `bool IsMarketingHost` (names flexible — keep clear)
  - [ ] Scoped implementation set once per request by middleware; readable from Infrastructure services
  - [ ] Do **not** trust `X-Tenant-Id` to set context (may log/ignore only)
  - [ ] Place types under `Application/Tenants` + `Infrastructure/Tenancy/` (spine: `TenantResolutionMiddleware.cs`)

- [ ] `TenantResolutionMiddleware` (AC: 1–5)
  - [ ] Register after `UseAuthentication`, before `UseAuthorization` (replace or absorb `UseTenantJwtHostAlignment`)
  - [ ] **Reuse** `ITenantHostResolver` for slug/Host parsing (allowlist, Active-only, port/IPv6) — do not fork Host rules
  - [ ] **Public** (`/api/v1/public/*`): require resolved Active tenant from Host → set context; failure → **404** ProblemDetails (stable `errorCode` e.g. `tenant_unresolved`)
  - [ ] **Admin** (`/api/v1/admin/*` + `/api/v1/auth/change-password`): require authenticated user; require JWT `tenant_id` parseable non-empty Guid; Host resolve must match claim → set context; unauthenticated → **401**; mismatch/unresolved → **403** (`tenant_mismatch` / existing style)
  - [ ] **Platform** (`/api/v1/platform/*`): do **not** require Tenant Context; leave unresolved / marketing-null; keep `PlatformAdminOnly`
  - [ ] **System / health / openapi / anonymous auth** (login, register, refresh, …): skip tenant requirement (auth Host binding for login stays in `AuthService` as today)
  - [ ] Preserve 12.4 lock: PlatformAdmin without `tenant_id` cannot pass **admin** paths

- [ ] Apex / marketing Host classification (AC: 5) — **locked**
  - [ ] Distinguish **marketing apex** (`cohestra.app`, `www.cohestra.app`, and optionally bare apex without subdomain) from **local Platform 0 fallback**
  - [ ] **Locked local behavior:** plain `localhost` / `127.0.0.1` / `::1` with `DEV_TENANT_SLUG` or default slug still resolves to an Active tenant for local/UAT ops (Platform 0 continuity)
  - [ ] **Locked apex behavior:** production apex/www → `IsMarketingHost=true`, **no** Tenant Context for SitePage/public site APIs (do not silently serve `default` tenant SitePage on apex)
  - [ ] Extend `ITenantHostResolver` / resolution result if needed (e.g. `MarketingOnly` outcome) rather than overloading Fail
  - [ ] Public site endpoints under marketing host → 404 or explicit marketing-empty response **without** loading tenant SitePage (prefer 404 for `/api/v1/public/site` on apex unless product already defines otherwise — document choice in completion notes)

- [ ] Consume context on critical public path (AC: 1–2, 5)
  - [ ] Update public site (and preferably public activity lookup) to read `ICurrentTenant` instead of hardcoding `TenantIds.Default` where Host-resolved tenant applies
  - [ ] Do **not** enable EF `HasQueryFilter` (Story 13.2)
  - [ ] Do **not** rename Redis keys to `tenant:{id}:…` (Story 13.2)

- [ ] Retire narrow alignment middleware
  - [ ] Remove or thin-wrap `TenantJwtHostAlignmentMiddleware` so one middleware owns resolve + admin JWT align
  - [ ] Migrate existing alignment tests to the new middleware; keep behavioral locks (match/mismatch/missing claim/platform path skip/system skip)

- [ ] Tests (AC: 1–5)
  - [ ] Unit: marketing apex → no TenantId; `{slug}.localhost` Active → context set; Suspended/unknown → fail
  - [ ] Unit: public unresolved → 404; admin mismatch → 403; admin unauthenticated → 401
  - [ ] Unit: PlatformAdmin on `/admin/me` without `tenant_id` → 403; `/platform/me` skips tenant require
  - [ ] Unit/integration: public site uses Host tenant (not Default) when subdomain Host provided — extend existing harnesses
  - [ ] Regression: Auth Host login/refresh still works; PlatformAdminOnly + TenantOperator policies unchanged

- [ ] Out of scope (do not implement)
  - [ ] EF global query filters / `[RequiresPlatformAdmin]` filter bypass (13.2)
  - [ ] Redis `tenant:{id}:…` namespaces (13.2)
  - [ ] Export/report isolation proofs as release gate (13.3)
  - [ ] `TenantIsolation` CI trait required on main (13.4) — may add a single helper test but do not mark SM-1 done
  - [ ] Break-glass impersonation; schema-per-tenant; Status∩Billing HTTP gate productization beyond Active-only Host resolve (already in resolver)

## Dev Notes

### Epic context

Epic 13 = Guaranteed Tenant Isolation (FR-9, FR-10). **13.1** = resolve + ambient context on every relevant API request. **13.2** = EF filters + Redis namespaces. **13.3** = export/report. **13.4** = TenantIsolation CI gate (SM-1). Epic **12** (auth/membership/JWT/platform claim) is done — do not regress.

[Source: `epics-cohestra-enterprise.md` Epic 13 / Story 13.1]

### Architecture compliance (must follow)

| Source | Implication |
|--------|-------------|
| AD-2 | Public Host `{slug}.cohestra.app` → tenant; missing → 404; apex marketing ≠ tenant SitePage |
| AD-3 | Admin JWT `tenant_id` + Host alignment; never trust `X-Tenant-Id` alone |
| AD-1 | Shared DB + TenantId (filters land in 13.2) |
| Spine | `Tenancy/TenantResolutionMiddleware.cs` |
| project-context | Public unauthenticated but **tenant from Host**; TenantIsolation gate is later story |

[Source: `ARCHITECTURE-SPINE.md` AD-2/AD-3; `project-context.md`]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| Ambient tenant | **None** | `ICurrentTenant` (or equiv) scoped per request |
| Middleware | `TenantJwtHostAlignmentMiddleware` — admin + change-password only | Full `TenantResolutionMiddleware` for public + admin |
| Host resolve | `ITenantHostResolver` — apex/localhost → default slug | Split marketing apex vs local default fallback |
| Public site | Hardcodes `TenantIds.Default` | Use resolved Tenant Context when present |
| EF filters | `ITenantScoped` marker only | **Unchanged** (13.2) |
| Redis keys | Global Platform 0 keys | **Unchanged** (13.2) |

Key paths:
- `src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs` — replace/absorb
- `src/Infrastructure/Tenancy/TenantHostResolver.cs` — extend classification
- `src/Application/Tenants/ITenantHostResolver.cs`
- `src/Api/Program.cs` — pipeline order
- Public: `PublicSiteController` / `SitePageService` / related
- Tests: `TenantHostResolverTests`, `TenantJwtHostAlignmentMiddlewareTests` → evolve

### Design locks (avoid CR thrash)

1. **One middleware** owns Host resolve + admin JWT align + context set — do not keep two competing middlewares.
2. **Public fail = 404; admin fail = 403/401** — do not collapse both to 403.
3. **Apex marketing ≠ `default` tenant SitePage.** Localhost default fallback remains for Platform 0.
4. **Active-only** tenants from Host (already in resolver) — Suspended/Archived unresolved.
5. **Platform routes** never require tenant context.
6. Setting context ≠ isolation complete — services may still miss `WHERE` until 13.2; still wire public site off Default hardcoded path for Host tenants.
7. Keep `MapInboundClaims=false` and Epic 12 policies untouched.

### Anti-patterns (will fail review)

- Renaming alignment middleware without ambient context + public 404 behavior
- Enabling EF filters / Redis tenant keys in this story
- Trusting `X-Tenant-Id` / query `?tenant=` as authority
- Binding apex/www to `default` SitePage
- Skipping admin JWT↔Host match for PlatformAdmin on `/admin`
- Claiming TenantIsolation SM-1 / 13.4 done

### Previous story intelligence (12.x) — do not regress

- Membership policies `TenantAdminOnly` / `TenantOperator`; `PlatformAdminOnly` rejects hybrid tenant claims
- JWT `tenant_id` + membership `"role"` + `platform_admin=true` (PlatformOnly mint)
- Host allowlist: `{slug}.cohestra.app` / `{slug}.localhost`; nested multi-label rejected
- Refresh JSON `{userId,tenantId}`; membership check before consume
- RoleExclusivity PlatformAdmin ⊥ TenantAdmin

### Testing standards

- xUnit `Infrastructure.Tests`; middleware harness like current alignment tests
- Prefer Host header + path assertions; ProblemDetails status + `errorCode`
- Do not delete Platform 0 default-tenant tests — adapt to marketing vs local classification
- Integration SkippableFact optional if helpers already exist

### Project Structure Notes

- Spine seed: `Infrastructure/Tenancy/TenantResolutionMiddleware.cs`
- Accessor interface in Application so Infrastructure services depend inward
- Web Host forwarding unchanged unless required for tests

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 13 / Story 13.1]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-2, AD-3]
- [Source: `_bmad-output/project-context.md`]
- [Source: `_bmad-output/implementation-artifacts/12-4-platform-admin-role-claim.md`]
- [Source: `_bmad-output/implementation-artifacts/12-2-jwt-tenant-id-and-tenant-scoped-login.md`]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
