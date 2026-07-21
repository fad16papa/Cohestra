---
baseline_commit: 61cfe2a1819f750b25ae3ea27b2455f9ef9e5c98
---

# Story 13.2: EF global query filters and Redis tenant namespaces

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a tenant Admin,
I want queries and caches automatically scoped to my tenant,
so that another tenant’s data cannot appear through a missed WHERE clause or shared cache key.

## Acceptance Criteria

1. **Given** entities implementing `ITenantScoped` from Epic 11  
   **When** EF global query filters are enabled  
   **Then** normal repository/query paths only return rows for the current Tenant Context  
   **And** bypasses exist only on explicitly marked Platform Admin audit/aggregate paths (`IgnoreQueryFilters` behind `PlatformAdminOnly` / equivalent — map spine `[RequiresPlatformAdmin]`)

2. **Given** Redis usage for public site, public activity, dashboard metrics, public registration rate-limit, and registration idempotency  
   **When** keys are written/read  
   **Then** keys follow `tenant:{tenantId}:…` (e.g. `tenant:{id}:public:site:published`, `tenant:{id}:dashboard:metrics`, `tenant:{id}:public:activity:{slug}`)  
   **And** invalidation on publish/update only affects that tenant’s keys

3. **Given** Tenant A context  
   **When** a service accidentally queries without an explicit tenant predicate  
   **Then** the global filter still excludes Tenant B rows

4. **Given** structured logging  
   **When** business operations run under a resolved tenant  
   **Then** logs include `tenantId` (NFR-5) via request scope / enricher

## Tasks / Subtasks

- [ ] EF global query filters (AC: 1, 3)
  - [ ] Inject ambient tenant into `CohestraDbContext` (prefer `ICurrentTenant` via ctor; keep design-time factory working)
  - [ ] In `OnModelCreating` (or convention over all `ITenantScoped` configs): `HasQueryFilter` fail-closed — only rows matching resolved `TenantId`; when tenant **unresolved**, filter matches **no** `ITenantScoped` rows (do **not** open the filter)
  - [ ] Evolve `ApplyDefaultTenantIds`: when ambient tenant resolved, stamp `TenantId` from context on `Added` empty Guid; when unresolved (seed/design-time), keep `TenantIds.Default` fallback
  - [ ] Document bypass convention: only Platform Admin aggregate/audit queries over tenant-owned tables may call `IgnoreQueryFilters()` — prefer a small helper e.g. `db.IgnoreTenantFilters()` used only from `PlatformTenantService` (or attribute-gated helper). Map spine `[RequiresPlatformAdmin]` → existing `PlatformAdminOnly` policy + this bypass
  - [ ] Update `PlatformTenantService` Activity/Client directory aggregates to `IgnoreQueryFilters()` (otherwise platform counts go to **zero** when context unresolved)

- [ ] Stamp + consume ambient tenant on remaining writers (AC: 1, 3) — close 13.1 deferrals in scope
  - [ ] `ClientDeduplicationService.FindOrCreateAsync`: scope match + create by `ICurrentTenant.TenantId` (no cross-tenant phone/email merge)
  - [ ] Admin SitePage path (`GetOrCreateSingletonAsync` / admin CRUD): use `ICurrentTenant` instead of hardcoding `TenantIds.Default` (admin middleware already sets context)
  - [ ] Ensure common create paths that leave `TenantId` empty rely on improved `ApplyDefaultTenantIds` (or set explicitly) under resolved context
  - [ ] Remove interim **Default-only** Redis guards from Story 13.1 once namespaced keys land (`ActivityService` / `SitePageService`)

- [ ] Redis `tenant:{tenantId}:…` namespaces (AC: 2)
  - [ ] `RedisPublishedSiteCache` / `IPublishedSiteCache`: plumb `tenantId` into Get/Set/Invalidate; key `tenant:{id}:public:site:published`
  - [ ] `RedisPublicActivityCache`: key `tenant:{id}:public:activity:{slug}`
  - [ ] `RedisDashboardMetricsCache` + `DashboardService`: require resolved tenant; key `tenant:{id}:dashboard:metrics`
  - [ ] `RedisPublicRegistrationRateLimiter`: include tenant in key (Host-resolved tenant from context)
  - [ ] `RedisRegistrationIdempotencyStore`: include tenant in key + lock key
  - [ ] **Out of this story’s Redis rename (locked):** `RedisOtpStore` / `RedisRefreshTokenStore` remain user/token-hash keyed (refresh payload already carries `TenantId`). Do not churn auth session keys unless a leak is proven
  - [ ] Update seeders / integration helpers that warm or invalidate published-site cache to pass `TenantIds.Default` (or resolved id)

- [ ] Logging `tenantId` (AC: 4 / NFR-5)
  - [ ] After tenant resolution (or in middleware), `ILogger.BeginScope` / equivalent with `tenantId` (and slug if cheap) when `IsResolved`
  - [ ] Do not invent Serilog if not already in stack — use `Microsoft.Extensions.Logging` scopes
  - [ ] Unresolved / marketing / platform: omit or log `tenantId` as null explicitly — do not invent Default

- [ ] Tests (AC: 1–4)
  - [ ] Unit: two tenants in InMemory DB; under Tenant A context, query returns only A; B rows invisible without `IgnoreQueryFilters`
  - [ ] Unit: unresolved tenant context → `ITenantScoped` queries empty; Platform aggregates with `IgnoreQueryFilters` still see both
  - [ ] Unit: Redis key builders / caches assert `tenant:{guid}:…` prefix
  - [ ] Unit: Client dedup does not match other-tenant phone/email
  - [ ] Unit/integration: Dashboard metrics cache key is per-tenant
  - [ ] Update `TenantIdModelTests` for new stamp behavior
  - [ ] Regression: Platform directory counts still work; public site/activity under Host tenant; Auth login/refresh unchanged
  - [ ] Optional: one log-scope assertion if easy (otherwise manual/NFR note)

- [ ] Out of scope (do not implement)
  - [ ] Export/report isolation proofs as release gate (Story 13.3)
  - [ ] `TenantIsolation` CI trait required on main / SM-1 (Story 13.4) — may add helper unit tests but do not claim gate done
  - [ ] Schema-per-tenant; break-glass impersonation; per-tenant SendGrid keys
  - [ ] Renaming OTP/refresh Redis key prefixes (locked out unless leak found)
  - [ ] Full multi-tenant SitePage seed for every tenant (admin path using ambient tenant is enough)

## Dev Notes

### Epic context

Epic 13 = Guaranteed Tenant Isolation (FR-9, FR-10). **13.1 done** = Host resolve + ambient `ICurrentTenant`. **13.2** = EF filters + Redis namespaces + stamp/dedup/admin SitePage + log scope. **13.3** = export/report proofs. **13.4** = TenantIsolation CI gate (SM-1).

[Source: `epics-cohestra-enterprise.md` Epic 13 / Story 13.2]

### Architecture compliance (must follow)

| Source | Implication |
|--------|-------------|
| AD-1 | Shared DB + `TenantId`; EF global filter on `ITenantScoped`; bypass only Platform Admin marked paths |
| AD-6 | Redis `tenant:{tenantId}:…`; invalidate only that tenant |
| AD-2/AD-3 | Do not regress Host resolve / JWT alignment from 13.1 |
| NFR-5 | Logs include `tenantId` |
| Spine | Filters + Redis — not schema-per-tenant |

[Source: `ARCHITECTURE-SPINE.md` AD-1, AD-6]

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| EF filters | **None** (`ITenantScoped` marker only) | `HasQueryFilter` fail-closed via `ICurrentTenant` |
| `ApplyDefaultTenantIds` | Always `TenantIds.Default` when empty | Prefer ambient tenant when resolved |
| Redis site/activity/dashboard | Global keys; 13.1 Default-only guards | `tenant:{id}:…`; remove Default-only guards |
| Rate limit / idempotency | Global | Tenant-prefixed |
| OTP / refresh | User/token hash keys | **Unchanged** (locked) |
| Platform aggregates | Explicit `TenantId` in Where; no Ignore | Must `IgnoreQueryFilters` |
| Client dedup | Global phone/email | Tenant-scoped (13.1 defer) |
| Admin SitePage | Hardcodes Default | Ambient tenant (13.1 defer) |
| Logging | No tenant scope | BeginScope when resolved |

Key paths:
- `src/Infrastructure/Persistence/CohestraDbContext.cs`
- `src/Domain/Tenants/ITenantScoped.cs` (+ 12 implementers)
- `src/Infrastructure/Platform/PlatformTenantService.cs`
- `src/Infrastructure/Site/RedisPublishedSiteCache.cs`, `IPublishedSiteCache.cs`, `SitePageService.cs`
- `src/Infrastructure/Activities/RedisPublicActivityCache.cs`, `ActivityService.cs`
- `src/Infrastructure/Dashboard/RedisDashboardMetricsCache.cs`, `DashboardService.cs`
- `src/Infrastructure/Registrations/RedisPublicRegistrationRateLimiter.cs`, `RedisRegistrationIdempotencyStore.cs`, `ClientDeduplicationService.cs`
- `src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs`, `CurrentTenant.cs`
- Tests: `TenantIdModelTests`, `PlatformTenantServiceTests`, Tenancy/*, PublicSite integration helpers

### Design locks (avoid CR thrash)

1. **Fail-closed filters** when tenant unresolved — never “show all rows” if `ICurrentTenant` missing.
2. **One bypass channel** for Platform Admin aggregates — `IgnoreQueryFilters` only there; do not sprinkle bypasses in tenant services.
3. **Stamp from ambient tenant** on add when resolved; Default only for seed/design-time unresolved.
4. **Redis rename** covers site, activity, dashboard, public rate-limit, idempotency — **not** OTP/refresh keys.
5. **Remove 13.1 Default-only cache guards** after namespacing (they become wrong/incomplete).
6. Do **not** claim SM-1 / 13.4 done.
7. Keep `MapInboundClaims=false` and Epic 12 policies untouched.

### Anti-patterns (will fail review)

- Filter that returns all tenants when context unresolved
- Enabling filters without Platform `IgnoreQueryFilters` (directory counts → 0)
- Leaving global Redis keys for site/dashboard while claiming AC2 done
- Cross-tenant client dedup still matching after this story
- Admin SitePage still hardcoded Default under resolved Host tenant
- Renaming auth OTP/refresh Redis keys “for completeness”
- Trusting `X-Tenant-Id` for filter identity

### Previous story intelligence (13.1) — do not regress

- Ambient `ICurrentTenant` set by `TenantResolutionMiddleware` after auth / before authz
- Public 404 / admin 401·403; marketing apex ≠ Default SitePage; localhost Platform 0 fallback
- Registration create already stamps `TenantId`; upcoming activities filtered; preview tokens `site-preview-v2` bind tenant
- Deferred into **this** story: Client dedup tenant scope, Admin SitePage Default, Redis namespaces, EF filters
- Platform/system/auth paths leave tenant unresolved — filters must fail-closed; platform counts use bypass

### Testing standards

- xUnit `Infrastructure.Tests`; InMemory DbContext with injectable/fake `ICurrentTenant`
- Prefer two-tenant fixtures for filter proofs
- Redis: unit-test key string builders or fake multiplexer assertions where existing harness allows
- Do not delete Platform 0 tests — adapt stamp/cache expectations
- Integration SkippableFact optional

### Project Structure Notes

- Prefer configuring filters in `CohestraDbContext.OnModelCreating` once for all `ITenantScoped`
- Cache interfaces may gain `Guid tenantId` parameters — update all call sites
- Logging enricher can live under `Infrastructure/Tenancy/` or `Api` middleware next to resolution

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 13 / Story 13.2]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-1, AD-6]
- [Source: `_bmad-output/project-context.md`]
- [Source: `_bmad-output/implementation-artifacts/13-1-tenantresolutionmiddleware-on-all-api-requests.md`]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
