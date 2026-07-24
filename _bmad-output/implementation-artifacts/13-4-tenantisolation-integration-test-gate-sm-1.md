---
baseline_commit: 95c5ec47d63168c77b94d1f290e6c08ceba4ffd5
---

# Story 13.4: TenantIsolation integration test gate (SM-1)

Status: done

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

- [x] Task 1: Define `TenantIsolation` trait + helpers (AC: 1, 3)
  - [x] 1.1 Add `[Trait("Category", "TenantIsolation")]` to Story 13.3 `ReportDashboardTenantIsolationTests` (keep running under unit job; make SM-1 filterable)
  - [x] 1.2 Extend `IntegrationTestHelpers` (or a dedicated helper type in `Api.IntegrationTests/Infrastructure/`) for dual-tenant fixtures:
        - Create Tenant B via `IPlatformTenantService` / platform API (or DB seed with `IgnoreTenantFilters` as needed)
        - Create Identity user + `ITenantMembershipService.EnsureMembershipAsync` for B (TenantAdmin)
        - Issue JWT bound to B (login with Host `{slug}.localhost` **or** `IJwtTokenService.CreateAccessToken(..., tenantId, membershipRole)`)
        - HTTP client `DefaultRequestHeaders.Host` = `{slug}.localhost` for tenant resolution
  - [x] 1.3 Prefer **two real tenants in one test** over mocking away EF filters (`project-context.md` Testing Rules)

- [x] Task 2: Minimum API isolation cases (AC: 1, 3) — **primary deliverable**
  - [x] 2.1 New `TenantIsolationApiTests` (or similarly named) in `Api.IntegrationTests` with **both** `[Trait("Category", "Integration")]` and `[Trait("Category", "TenantIsolation")]`, `[Collection(IntegrationTestCollection.Name)]`, `SkippableFact` + `SkipIfUnavailable`
  - [x] 2.2 **IDOR:** Authenticate as Tenant A; `GET /api/v1/admin/activities/{tenantBActivityId}` → assert status is 403 or 404; assert body is not B’s activity payload
  - [x] 2.3 **Public site:** Seed published activities on A and B; call `GET /api/v1/public/site` with Host for A; assert B activity name/slug absent from response (+ public activity by slug 404)
  - [x] 2.4 **Export/report:** Tagged 13.3 service proofs with `TenantIsolation` + API export assertion excluding B markers

- [x] Task 3: CI release gate (AC: 2)
  - [x] 3.1 Update `.github/workflows/ci.yml` with required TenantIsolation unit + API steps
  - [x] 3.2 Gate fails if filter matches zero tests (`--list-tests` + grep before run)
  - [x] 3.3 Existing `Category=Integration` / `Category!=Integration` filters preserved

- [x] Task 4: Documentation (AC: 4)
  - [x] 4.1 README TenantIsolation (SM-1) subsection
  - [x] 4.2 `project-context.md` Testing Rules / PR CI note updated

- [x] Task 5: Hygiene
  - [x] 5.1 Do not implement Epic 14/15 stories here
  - [x] 5.2 Do not weaken Platform counts-only / marketing-apex locks from Epics 11–13
  - [x] 5.3 Leave `deploy/uat-bootstrap.sh` alone

### Review Findings

- [x] [Review][Patch] CI SM-1 can pass when all `SkippableFact`s skip — require `Passed: [1-9]` and reject any `Skipped:` in TenantIsolation gate steps [`.github/workflows/ci.yml`]
- [x] [Review][Patch] Vacuous negatives — assert own activity GET 200, `visibleSlug` in public site, and Tenant A export marker present [`TenantIsolationApiTests.cs`]
- [x] [Review][Patch] Remove unreachable `IsSuccessStatusCode` branch after 403/404 assert [`TenantIsolationApiTests.cs`]
- [x] [Review][Patch] Zero-match canary: fail on `No test matches` / require listed count ≥ 1 rather than brittle class-name-only grep [`.github/workflows/ci.yml`]
- [x] [Review][Defer] Host `{slug}.localhost` + Tenant B JWT helpers unused in minimum cases — deferred, AC met via default operator as A; helpers remain for later surfaces
- [x] [Review][Defer] One-directional A→B only (no B↛A matrix) — deferred, epic minimum is A JWT ↛ B activity
- [x] [Review][Defer] Shared IntegrationTestCollection pollution / double-run Integration then TenantIsolation — deferred, pre-existing collection pattern
- [x] [Review][Defer] GitHub branch-protection required-check wiring — deferred, ops; workflow steps exist

### Senior Developer Review (AI) — Re-review #2 (2026-07-21)

**Outcome:** Approve (clean)

**Layers:** Blind Hunter — no remaining substantive issues; Edge Case Hunter — 2 low residual notes only; Acceptance Auditor — Clean vs ACs 1–4.

**Notes:** Prior CR patches verified (CI skip/pass guards, positive isolation asserts, list-tests canary). Residual lows deferred — `UseTenantHost` Host header restricted-header risk (helpers unused in minimum gate); `ShowOnHomepage=true` on seed helpers (test fixture convention); optional null-guard on `UpcomingActivities`; shared collection site-publish mutation (pre-existing IntegrationTestCollection pattern).

CR patches applied (2026-07-21): CI skip/pass guards, positive isolation asserts, dead branch removed, list-tests count canary.

## Dev Notes

### Epic / PRD / Architecture anchors

| Source | Requirement |
|--------|-------------|
| Epics Story 13.4 | Trait `TenantIsolation`; CI required on PRs to main; 403/404 never 200+foreign; docs for new endpoints |
| NFR-11 / SM-1 | Zero cross-tenant leakage; isolation matrix 100% pass on negative cases |
| Architecture AD-10 | `Api.IntegrationTests` category `TenantIsolation` must pass on every PR to `main` |
| FR28 / NFR-S4 | Export isolation from 13.3 folded into gate via trait + API case |

### Previous story intelligence (13.1–13.3)

- Ambient tenant via `TenantResolutionMiddleware` + `ICurrentTenant`
- EF global filters + Redis `tenant:{id}:…` (13.2)
- Report/Dashboard explicit `TenantId` + `ReportDashboardTenantIsolationTests` (13.3, clean CR #2)
- Marketing apex ≠ tenant SitePage; tenant identity on `{slug}.cohestra.app` / `{slug}.localhost`

### Project Structure Notes

| Path | Role |
|------|------|
| `.github/workflows/ci.yml` | Required SM-1 gate steps |
| `src/Api.IntegrationTests/TenantIsolationApiTests.cs` | HTTP IDOR + public site + export |
| `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs` | Multi-tenant helpers |
| `src/Infrastructure.Tests/Tenancy/ReportDashboardTenantIsolationTests.cs` | Tagged TenantIsolation |
| `README.md` | Contributor note for SM-1 |
| `_bmad-output/project-context.md` | CI / Testing Rules aligned |

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 13 Story 13.4]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-10]
- [Source: `.github/workflows/ci.yml`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- `Infrastructure.Tests` Category=TenantIsolation: 7 passed
- Full `Infrastructure.Tests`: 300 passed
- `Api.IntegrationTests` TenantIsolation: listed 3 tests; skipped locally (no Postgres/Redis / ready deps) — same SkippableFact pattern as existing suite; CI integration job runs them with services

### Completion Notes List

- Tagged Story 13.3 report/dashboard isolation tests with `Category=TenantIsolation`.
- Extended `IntegrationTestHelpers` with Host binding, platform create-tenant, tenant admin user/membership, JWT mint, tenant-scoped activity seed, default site publish helper.
- Added `TenantIsolationApiTests`: cross-tenant activity GET, public site / public activity isolation, report export CSV excludes B markers.
- CI: required SM-1 steps on unit + integration jobs; list-tests count ≥ 1 + `No test matches` guard; run must show Passed ≥ 1 and Skipped = 0.
- CR patches: positive isolation asserts (own GET 200, visibleSlug, Tenant A export marker); removed dead branch; hardened CI skip detection.
- README + project-context document the gate and contributor expectation.

### File List

- `.github/workflows/ci.yml`
- `src/Api.IntegrationTests/TenantIsolationApiTests.cs` (new)
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs`
- `src/Infrastructure.Tests/Tenancy/ReportDashboardTenantIsolationTests.cs`
- `README.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/13-4-tenantisolation-integration-test-gate-sm-1.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-21: DS 13.4 — TenantIsolation trait, API cases, CI SM-1 gate, docs; status → review.
- 2026-07-21: CR 13.4 — applied 4 patches (CI skip/pass guards, positive asserts, list-tests canary); status → done.
- 2026-07-21: Re-review #2 clean — no new patches; story remains done.

## Ultimate context engineering tip

Story 13.4 = **make SM-1 a hard CI gate**: trait `Category=TenantIsolation`, minimum API cases (A JWT ↛ B activity; public site A ↛ B activities), fold 13.3 export proofs into the trait, required CI steps on PRs to `main`, README note for new endpoints.

### Story completion status

done — CR patches applied; Epic 13 tenant isolation complete (optional retro).
