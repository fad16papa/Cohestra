# Story 13.4: TenantIsolation integration test gate (SM-1)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **release owner**,
I want **a CI category of cross-tenant negative tests that must pass on every PR to main**,
so that **we never ship a tenant-leak regression (SM-1 / NFR-11 / AD-10)**.

## Acceptance Criteria

1. **Given** `Api.IntegrationTests` (and supporting unit isolation proofs)  
   **When** category/trait `TenantIsolation` is defined  
   **Then** it includes **at least**:
   - Tenant A JWT **cannot** `GET /api/v1/admin/activities/{id}` for a Tenant B activity (returns **403 or 404** — never **200** with B’s payload)
   - Public `GET /api/v1/public/site` (and/or public activity list) under Host for slug A **does not** return Tenant B activities
   - Export/report negative case from Story 13.3 (CSV / report aggregates exclude B) — either as tagged `Infrastructure.Tests` proofs and/or an API-level export assertion under Tenant A Host+JWT

2. **Given** a PR targeting `main`  
   **When** CI runs (`.github/workflows/ci.yml`)  
   **Then** `TenantIsolation` tests are a **required** gate (job fails if any TenantIsolation test fails or if the filter matches zero tests — do not leave SM-1 optional)

3. **Given** a deliberate cross-tenant access attempt in the gate suite  
   **When** executed  
   **Then** the API returns **403/404 as designed** — never **200 with foreign data**

4. **Given** documentation  
   **When** developers add new tenant-scoped endpoints  
   **Then** README (and/or `_bmad-output/project-context.md` Testing Rules, already partially present) notes that a **TenantIsolation** case should be added or extended for the new surface

## Tasks / Subtasks

- [ ] Task 1: Define `TenantIsolation` trait + helpers (AC: 1, 3)
  - [ ] 1.1 Add `[Trait("Category", "TenantIsolation")]` to Story 13.3 `ReportDashboardTenantIsolationTests` (keep running under unit job; make SM-1 filterable)
  - [ ] 1.2 Extend `IntegrationTestHelpers` (or a dedicated helper type in `Api.IntegrationTests/Infrastructure/`) for dual-tenant fixtures:
        - Create Tenant B via `IPlatformTenantService` / platform API (or DB seed with `IgnoreTenantFilters` as needed)
        - Create Identity user + `ITenantMembershipService.EnsureMembershipAsync` for B (TenantAdmin)
        - Issue JWT bound to B (login with Host `{slug}.localhost` **or** `IJwtTokenService.CreateAccessToken(..., tenantId, membershipRole)`)
        - HTTP client `DefaultRequestHeaders.Host` = `{slug}.localhost` for tenant resolution
  - [ ] 1.3 Prefer **two real tenants in one test** over mocking away EF filters (`project-context.md` Testing Rules)

- [ ] Task 2: Minimum API isolation cases (AC: 1, 3) — **primary deliverable**
  - [ ] 2.1 New `TenantIsolationApiTests` (or similarly named) in `Api.IntegrationTests` with **both** `[Trait("Category", "Integration")]` and `[Trait("Category", "TenantIsolation")]`, `[Collection(IntegrationTestCollection.Name)]`, `SkippableFact` + `SkipIfUnavailable`
  - [ ] 2.2 **IDOR:** Authenticate as Tenant A; `GET /api/v1/admin/activities/{tenantBActivityId}` → assert status is 403 or 404; assert body is not B’s activity payload
  - [ ] 2.3 **Public site:** Seed published activities on A and B; call `GET /api/v1/public/site` with Host `tenant-a.localhost` (or A’s slug); assert B activity name/slug absent from response
  - [ ] 2.4 **Export/report:** Prefer tagging 13.3 service proofs with `TenantIsolation`. Optionally add API `GET /api/v1/admin/reports/export?preset=custom&from=&to=` as Tenant A and assert B markers absent (requires dual-tenant seed with distinguishable PII)

- [ ] Task 3: CI release gate (AC: 2)
  - [ ] 3.1 Update `.github/workflows/ci.yml`:
        - **Unit job:** add required step `dotnet test src/Infrastructure.Tests/... --filter "Category=TenantIsolation"` (after build; `--no-build -c Release`)
        - **Integration job:** add required step `dotnet test src/Api.IntegrationTests/... --filter "Category=TenantIsolation"` (Postgres+Redis services already present)
  - [ ] 3.2 Ensure gate fails if filter matches **zero** tests (xUnit exits non-zero when filter matches nothing **only if** configured — verify; if not, add an explicit assert/script or a sentinel test so empty trait cannot silently pass)
  - [ ] 3.3 Do **not** remove existing `Category=Integration` / `Category!=Integration` filters — TenantIsolation is additive

- [ ] Task 4: Documentation (AC: 4)
  - [ ] 4.1 Add a short **TenantIsolation (SM-1)** subsection to `README.md` (how to run locally + “new tenant-scoped endpoint → extend TenantIsolation suite”)
  - [ ] 4.2 Confirm `_bmad-output/project-context.md` Testing Rules still align (already mentions SM-1); tweak only if CI command paths diverge

- [ ] Task 5: Hygiene
  - [ ] 5.1 Do not implement Epic 14/15 stories here
  - [ ] 5.2 Do not weaken Platform counts-only / marketing-apex locks from Epics 11–13
  - [ ] 5.3 Leave `deploy/uat-bootstrap.sh` alone

## Dev Notes

### Epic / PRD / Architecture anchors

| Source | Requirement |
|--------|-------------|
| Epics Story 13.4 | Trait `TenantIsolation`; CI required on PRs to main; 403/404 never 200+foreign; docs for new endpoints |
| NFR-11 / SM-1 | Zero cross-tenant leakage; isolation matrix 100% pass on negative cases |
| Architecture AD-10 | `Api.IntegrationTests` category `TenantIsolation` must pass on every PR to `main`. Minimum: A JWT cannot GET B activity; public site slug A does not return B activities |
| FR28 / NFR-S4 | Export isolation already proven in 13.3 — fold into gate via trait and/or API case |
| `project-context.md` | Extend `IntegrationTestHelpers`; two tenants preferred; CI must add TenantIsolation as required gate |

### Brownfield CI today

```yaml
# .github/workflows/ci.yml (current)
dotnet job:     dotnet test Cohestra.sln --filter "Category!=Integration"
integration:    dotnet test Api.IntegrationTests --filter "Category=Integration"  # needs Postgres+Redis
```

**Gap:** No `TenantIsolation` trait yet; no dedicated SM-1 step; Story 13.3 proofs live only in `Infrastructure.Tests` without the trait.

### Host / JWT dual-tenant facts (critical for DS)

| Concern | Fact |
|---------|------|
| Default Host | Tests use `http://localhost` → `TenantHostResolver` → Platform 0 / `default` slug |
| Non-default tenant | Set `HttpClient.DefaultRequestHeaders.Host` to `{slug}.localhost` |
| Login binds tenant | `AuthController` passes `Request.Host` into `IAuthService.LoginAsync` |
| Platform create tenant | `POST /api/v1/platform/tenants` — creates **Tenant row only** (no admin user/membership) |
| Membership | `ITenantMembershipService.EnsureMembershipAsync(userId, tenantId, role)` |
| Activity GET | `GET /api/v1/admin/activities/{id}` — `TenantOperator` policy; EF filter → typically **404** if wrong tenant |
| Public site | `GET /api/v1/public/site` — ambient Host tenant; activities filtered by `TenantId` |
| Export | `GET /api/v1/admin/reports/export?preset=…` — `TenantOperator` |

### Implementation sketch

```csharp
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantIsolationApiTests(IntegrationTestFixture fixture)
{
    [SkippableFact]
    public async Task Admin_GetActivity_ByForeignTenantId_Returns404Or403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);
        // seed A+B activities, auth as A with Host a.localhost, GET B id → NotFound/Forbidden
    }
}
```

```yaml
# ci.yml additions (illustrative)
- name: TenantIsolation gate (SM-1)
  run: dotnet test src/Api.IntegrationTests/Api.IntegrationTests.csproj --no-build -c Release --filter "Category=TenantIsolation" --verbosity normal
```

### Anti-patterns (do NOT)

- Soften SM-1 to optional / allow-failure CI step
- Trust `X-Tenant-Id` header for isolation tests (AD-3 — Host + JWT only)
- Mock away `ICurrentTenant` / EF filters for the **API** gate cases (service-level 13.3 proofs are fine tagged separately)
- Delete Platform 0 tests to go green (SM-4)
- Implement Story 14.x billing/marketing here
- Reopen Stories 13.1–13.3 unless a regression appears

### Previous story intelligence (13.1–13.3)

- Ambient tenant via `TenantResolutionMiddleware` + `ICurrentTenant`
- EF global filters + Redis `tenant:{id}:…` (13.2)
- Report/Dashboard explicit `TenantId` + `ReportDashboardTenantIsolationTests` (13.3, clean CR #2)
- Marketing apex ≠ tenant SitePage; tenant identity on `{slug}.cohestra.app` / `{slug}.localhost`
- Integration pattern: `SkippableFact` + `SkipIfUnavailable` when Postgres/Redis down locally
- Latest clean CR: Story 13.3 re-review #2

### Project Structure Notes

| Path | Role |
|------|------|
| `.github/workflows/ci.yml` | **Required** SM-1 gate steps |
| `src/Api.IntegrationTests/TenantIsolationApiTests.cs` (new) | HTTP IDOR + public site cases |
| `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs` | Extend multi-tenant helpers |
| `src/Infrastructure.Tests/Tenancy/ReportDashboardTenantIsolationTests.cs` | Tag `TenantIsolation` (13.3 proofs) |
| `README.md` | Contributor note for SM-1 |
| `_bmad-output/project-context.md` | Align Testing Rules if needed |

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 13 Story 13.4]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-10]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — SM-1]
- [Source: `_bmad-output/project-context.md` — Testing Rules]
- [Source: `_bmad-output/implementation-artifacts/13-3-export-and-report-queries-always-filter-by-tenantid.md`]
- [Source: `.github/workflows/ci.yml`]
- [Source: `_bmad-output/implementation-artifacts/7-2-ci-pipeline-and-sendgrid-sandbox-gate.md`]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Ultimate context engineering tip

Story 13.4 = **make SM-1 a hard CI gate**: trait `Category=TenantIsolation`, minimum API cases (A JWT ↛ B activity; public site A ↛ B activities), fold 13.3 export proofs into the trait, required CI steps on PRs to `main`, README note for new endpoints. Prefer extending `IntegrationTestHelpers` + Host `{slug}.localhost` over one-off bootstraps.

### Story completion status

ready-for-dev — analyze complete; developer can implement the CI gate without inventing isolation scope.
