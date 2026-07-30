---
baseline_commit: 8681274
epic: 17
story: 3
---

# Story 17.3: Member JWT 403 integration matrix

Status: done

## Story

As a **platform operator**,
I want **live-stack integration proof that Member and tenant JWTs cannot access forbidden routes**,
So that **Epic 12 authz policies are evidenced beyond unit tests before launch**.

## Acceptance Criteria

1. **Given** a TenantMember JWT on the tenant Host  
   **When** calling admin-only routes (Team invite create, Billing checkout session, Billing summary)  
   **Then** each returns **403** (ProblemDetails when response body is present)

2. **Given** a tenant-scoped JWT (Admin or Member)  
   **When** calling `/api/v1/platform/*` routes  
   **Then** each returns **403** (tenant JWT blocked from platform namespace)

3. **Given** a Platform Admin JWT  
   **When** calling a representative platform route  
   **Then** request succeeds (positive control)

4. **Given** CI integration job  
   **When** tests run  
   **Then** new cases use `[Trait("Category", "TenantIsolation")]` and are non-skipped when Postgres/Redis available

## Tasks / Subtasks

- [x] **Task 1 — Test helpers** (AC: 1, 2)
  - [x] 1.1 Add `CreateTenantMemberUserAsync` to integration helpers (mirrors admin helper)

- [x] **Task 2 — Integration matrix** (AC: 1–4)
  - [x] 2.1 `TenantAuthzIntegrationTests` — Member → 403 on team invite, billing GET, billing checkout
  - [x] 2.2 Tenant Admin + Member → 403 on `GET /api/v1/platform/tenants`
  - [x] 2.3 Platform Admin → 200 positive control on same route
  - [x] 2.4 Tag with `TenantIsolation` trait for SM-1 CI gate

- [x] **Task 3 — Docs + sprint hygiene**
  - [x] 3.1 Update integration test README helper table
  - [x] 3.2 Mark Epic 12 retro action #1 done in sprint-status

## Dev Agent Record

### Completion Notes List

- Added `TenantAuthzIntegrationTests` with four live-stack cases covering Member admin denial, tenant JWT platform denial, and platform admin positive control.
- Extended `IntegrationTestHelpers` with `CreateTenantMemberUserAsync`.

### File List

- `src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs`
- `src/Api.IntegrationTests/README.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/17-3-member-jwt-403-integration-matrix.md`

## Change Log

- 2026-07-30: Story 17.3 implemented — Member/platform authz integration matrix; status → review
