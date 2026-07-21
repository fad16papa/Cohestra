---
baseline_commit: f8659aa2fd51a591bc5d2fb3e40c96c950759476
---

# Story 13.1: TenantResolutionMiddleware on all API requests

Status: in-progress

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

- [x] Ambient Tenant Context (AC: 1–2)
  - [x] Add Application contract e.g. `ICurrentTenant` / `ITenantContextAccessor` with: `Guid? TenantId`, `string? Slug`, `bool IsResolved`, `bool IsMarketingHost` (names flexible — keep clear)
  - [x] Scoped implementation set once per request by middleware; readable from Infrastructure services
  - [x] Do **not** trust `X-Tenant-Id` to set context (may log/ignore only)
  - [x] Place types under `Application/Tenants` + `Infrastructure/Tenancy/` (spine: `TenantResolutionMiddleware.cs`)

- [x] `TenantResolutionMiddleware` (AC: 1–5)
  - [x] Register after `UseAuthentication`, before `UseAuthorization` (replace or absorb `UseTenantJwtHostAlignment`)
  - [x] **Reuse** `ITenantHostResolver` for slug/Host parsing (allowlist, Active-only, port/IPv6) — do not fork Host rules
  - [x] **Public** (`/api/v1/public/*`): require resolved Active tenant from Host → set context; failure → **404** ProblemDetails (stable `errorCode` e.g. `tenant_unresolved`)
  - [x] **Admin** (`/api/v1/admin/*` + `/api/v1/auth/change-password`): require authenticated user; require JWT `tenant_id` parseable non-empty Guid; Host resolve must match claim → set context; unauthenticated → **401**; mismatch/unresolved → **403** (`tenant_mismatch` / existing style)
  - [x] **Platform** (`/api/v1/platform/*`): do **not** require Tenant Context; leave unresolved / marketing-null; keep `PlatformAdminOnly`
  - [x] **System / health / openapi / anonymous auth** (login, register, refresh, …): skip tenant requirement (auth Host binding for login stays in `AuthService` as today)
  - [x] Preserve 12.4 lock: PlatformAdmin without `tenant_id` cannot pass **admin** paths

- [x] Apex / marketing Host classification (AC: 5) — **locked**
  - [x] Distinguish **marketing apex** (`cohestra.app`, `www.cohestra.app`, and optionally bare apex without subdomain) from **local Platform 0 fallback**
  - [x] **Locked local behavior:** plain `localhost` / `127.0.0.1` / `::1` with `DEV_TENANT_SLUG` or default slug still resolves to an Active tenant for local/UAT ops (Platform 0 continuity)
  - [x] **Locked apex behavior:** production apex/www → `IsMarketingHost=true`, **no** Tenant Context for SitePage/public site APIs (do not silently serve `default` tenant SitePage on apex)
  - [x] Extend `ITenantHostResolver` / resolution result if needed (e.g. `MarketingOnly` outcome) rather than overloading Fail
  - [x] Public site endpoints under marketing host → 404 or explicit marketing-empty response **without** loading tenant SitePage (prefer 404 for `/api/v1/public/site` on apex unless product already defines otherwise — document choice in completion notes)

- [x] Consume context on critical public path (AC: 1–2, 5)
  - [x] Update public site (and preferably public activity lookup) to read `ICurrentTenant` instead of hardcoding `TenantIds.Default` where Host-resolved tenant applies
  - [x] Do **not** enable EF `HasQueryFilter` (Story 13.2)
  - [x] Do **not** rename Redis keys to `tenant:{id}:…` (Story 13.2)

- [x] Retire narrow alignment middleware
  - [x] Remove or thin-wrap `TenantJwtHostAlignmentMiddleware` so one middleware owns resolve + admin JWT align
  - [x] Migrate existing alignment tests to the new middleware; keep behavioral locks (match/mismatch/missing claim/platform path skip/system skip)

- [x] Tests (AC: 1–5)
  - [x] Unit: marketing apex → no TenantId; `{slug}.localhost` Active → context set; Suspended/unknown → fail
  - [x] Unit: public unresolved → 404; admin mismatch → 403; admin unauthenticated → 401
  - [x] Unit: PlatformAdmin on `/admin/me` without `tenant_id` → 403; `/platform/me` skips tenant require
  - [x] Unit/integration: public site uses Host tenant (not Default) when subdomain Host provided — extend existing harnesses
  - [x] Regression: Auth Host login/refresh still works; PlatformAdminOnly + TenantOperator policies unchanged

- [x] Out of scope (do not implement)
  - [x] EF global query filters / `[RequiresPlatformAdmin]` filter bypass (13.2)
  - [x] Redis `tenant:{id}:…` namespaces (13.2)
  - [x] Export/report isolation proofs as release gate (13.3)
  - [x] `TenantIsolation` CI trait required on main (13.4) — may add a single helper test but do not mark SM-1 done
  - [x] Break-glass impersonation; schema-per-tenant; Status∩Billing HTTP gate productization beyond Active-only Host resolve (already in resolver)


### Review Follow-ups (AI)

- [x] [Review][Patch] Scope homepage upcoming activities by Host tenant [`SiteUpcomingActivitiesResolver.cs:42-49`] — `GetPublicAsync` scopes SitePage by `ICurrentTenant`, but `LoadAsync` still lists Published+ShowOnHomepage with no `TenantId` filter (cross-tenant bleed on public site).
- [x] [Review][Patch] Fail tenant-bound refresh on marketing apex [`AuthService.cs` ResolveSessionBinding] — `MarketingOnly` has `Succeeded=false`, so preferredTenantId refresh skips Host mismatch and can renew any tenant session from `cohestra.app`.
- [x] [Review][Patch] Scope public registration activity lookup by `ICurrentTenant` [`RegistrationService.cs:189-192`] — middleware sets context for `/api/v1/public/*`; slug-only Published lookup can bind another tenant's activity.
- [x] [Review][Patch] Do not write global public-activity Redis cache for non-default tenants [`ActivityService.SyncPublicActivityCacheAsync`] — publish/unpublish on tenant B can poison Default Host cache for shared slugs until 13.2 namespaces.

- [x] [Review][Defer] Admin SitePage still hardcodes `TenantIds.Default` while admin middleware sets ambient context — deferred, public-path scope for 13.1; admin consume in later isolation stories
- [x] [Review][Defer] Marketing apex hostnames hardcoded to `cohestra.app`/`www` — deferred, ops/config allowlist; matches existing Host allowlist pattern
- [x] [Review][Defer] Redis `tenant:{id}:…` namespaces + full cache isolation — deferred to Story 13.2 (explicit out of scope)
- [x] [Review][Defer] Multi-tenant Host integration assertion for public SitePage (non-default subdomain) — deferred, middleware unit coverage present; optional WebApplicationFactory matrix


- [ ] [Review][Patch] Stamp `Registration.TenantId` from Host `ICurrentTenant` on public submit create [`RegistrationService.cs` SubmitCoreAsync] — lookup is tenant-scoped but new rows still rely on `ApplyDefaultTenantIds` → wrong ownership on non-default Host.
- [ ] [Review][Patch] Non-default `SyncPublicActivityCacheAsync` should no-op (no Invalidate) [`ActivityService.cs`] — Invalidate on shared slug thrashing Default Host Redis entry; defer full namespaces to 13.2.

- [x] [Review][Defer] Client dedup `FindOrCreateAsync` still global / Default-stamped — deferred to Story 13.2 (+ explicit non-goal cross-tenant client dedup); registration TenantId stamp is the minimal 13.1 fix

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

Cursor Grok 4.5

### Debug Log References

- Infrastructure.Tests Tenancy filter: 39 passed
- Full Infrastructure.Tests: 281 passed

### Completion Notes List

- CR patches applied (2026-07-21): upcoming activities tenant filter; MarketingOnly refresh fail; registration ICurrentTenant; non-default Redis cache invalidate-only.

- Added ambient `ICurrentTenant` / `CurrentTenant` (scoped) set by `TenantResolutionMiddleware` after auth, before authorization.
- Absorbed `TenantJwtHostAlignmentMiddleware` into resolution middleware; obsolete shim retained for path helpers.
- Public `/api/v1/public/*`: Host resolve required; failure/marketing → **404** `tenant_unresolved` (apex choice: 404, not empty SitePage).
- Admin + change-password: unauthenticated → **401**; mismatch/missing claim → **403** `tenant_mismatch`; sets context on success.
- Platform/system/health/openapi/anonymous auth skip tenant require; PlatformAdmin without `tenant_id` still blocked on admin.
- Marketing apex (`cohestra.app` / `www`) → `TenantHostResolution.MarketingOnly()`; localhost/`DEV_TENANT_SLUG` Platform 0 fallback preserved.
- `SitePageService.GetPublicAsync` / `GetPreviewAsync` and `ActivityService.GetPublicBySlugAsync` consume `ICurrentTenant` (no EF filters / no Redis key rename).
- Redis global caches only used when serving `TenantIds.Default` to avoid cross-tenant bleed until 13.2.

### File List

- src/Application/Tenants/ICurrentTenant.cs
- src/Application/Tenants/ITenantHostResolver.cs
- src/Infrastructure/Tenancy/CurrentTenant.cs
- src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs
- src/Infrastructure/Tenancy/TenantHostResolver.cs
- src/Infrastructure/Tenancy/TenantJwtHostAlignmentMiddleware.cs
- src/Infrastructure/DependencyInjection.cs
- src/Infrastructure/Site/SitePageService.cs
- src/Infrastructure/Activities/ActivityService.cs
- src/Api/Program.cs
- src/Infrastructure.Tests/Tenancy/TenantResolutionMiddlewareTests.cs
- src/Infrastructure.Tests/Tenancy/TenantJwtHostAlignmentMiddlewareTests.cs
- src/Infrastructure.Tests/Tenancy/TenantHostResolverTests.cs
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/Infrastructure/Site/SiteUpcomingActivitiesResolver.cs
- src/Infrastructure/Auth/AuthService.cs
- src/Infrastructure/Registrations/RegistrationService.cs
- src/Infrastructure.Tests/Site/SiteUpcomingActivitiesResolverTests.cs
- src/Infrastructure.Tests/Auth/AuthServiceMembershipGuardTests.cs
- _bmad-output/implementation-artifacts/13-1-tenantresolutionmiddleware-on-all-api-requests.md


## Senior Developer Review (AI)

### Review Date

2026-07-21

### Outcome

Changes Requested (re-review #2)

### Re-review Date

2026-07-21

### Re-review Summary

Prior 4 patches verified fixed. ACs still met. Two residual patches: stamp `Registration.TenantId` from Host context on create; non-default public-activity cache sync should no-op (not Invalidate) to avoid thrashing Default Redis keys. Client dedup tenant scope deferred to 13.2.

### Summary

ACs and design locks for ambient context, middleware order, public 404 / admin 401·403, and marketing apex vs localhost are met. Four patches remain on public-path consumers and MarketingOnly auth refresh interaction. Admin SitePage Default and Redis namespaces deferred per 13.1/13.2 scope.

### Action Items

See Tasks → Review Follow-ups (AI).

## Change Log

- 2026-07-21: Addressed code review findings — 4 patch items resolved.

- 2026-07-21: Story 13.1 implemented — TenantResolutionMiddleware + ambient context + marketing apex split; status → review.
