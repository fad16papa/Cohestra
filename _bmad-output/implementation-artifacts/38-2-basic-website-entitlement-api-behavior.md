---
id: 38.2
key: 38-2-basic-website-entitlement-api-behavior
title: Basic Website entitlement API behavior
status: in-progress
epic: 38
created: 2026-09-22
baseline_commit: 42b5b7dc192f6bcf46859648b300ba2ee67d969a
readiness: ready
---

# Story 38.2: Basic Website entitlement API behavior

Status: in-progress

## Story

As a Basic TenantAdmin,
I want Website to present an expected Core-or-higher upgrade state,
so that a known plan lock is not shown as an internal 500 and the editor stays closed.

## Acceptance Criteria

1. **Basic TenantAdmin + Website route:** `/dashboard/website` renders a stable, accessible `UpgradePanel`. No generic error toast, no error-page flash, no unhandled console error, no retry loop, no Website editor controls.
2. **Basic + direct API:** `GET /api/v1/admin/site` (and related admin site mutations) never return 500 for the plan lock. Response is an intentional non-500 ProblemDetails with machine-readable `errorCode: plan_locked`.
3. **Server remains authoritative:** Frontend gating must not grant Website access. Direct API calls stay denied with the typed entitlement response.
4. **Error taxonomy is distinct:**
   - plan entitlement denial → 403 + `plan_locked`
   - role/authorization denial → 401/403 without `plan_locked`
   - missing resource / initialization for an entitled tenant → existing contract (GET creates the singleton; not plan denial)
   - unexpected server failure → 500, never converted to UpgradePanel
5. **Core and Pro TenantAdmin:** Website API and editor continue to work.
6. **TenantMember:** Role authorization remains distinct from plan entitlement. Site stays `TenantOperator` (Member may call it); Basic Member is still `plan_locked`.
7. **Preserved:** Basic has no tenant-URL option; Core/Pro keep entitled URL behavior; tenant isolation; Suspended/OnHold; Epic 35–37; Story 38.1 billing-sync.
8. **Only explicit plan-entitlement errors render UpgradePanel.** Genuine 5xx / unrelated 4xx stay real errors.

## Readiness

Phase 1 ACCEPTED (`docs/DESIGN.md` §14.1 / §15: Basic Website must speak `403` / `plan_locked`, not `500`). Story 38.1 ACCEPTED/CLOSED at `42b5b7dc`. **Ready to implement.** No open PO decision.

## Investigation

### Root cause

`SitePageService.EnsureSitePlanAllowedAsync` throws `InvalidOperationException("Site pages require a Core plan or higher.")`. `GET /api/v1/admin/site` has no try/catch. `GlobalExceptionHandler` maps unhandled exceptions to **500**. Mutations catch `InvalidOperationException` as **400**, which is also the wrong class for a plan lock.

The Website page already shows `UpgradePanel` when `isBasicPlan(shell.plan)`, but `useEffect(() => void loadSite())` always calls `GET /admin/site`, so Basic still produces the 500 (PX2-ENT-004).

### Established contract (do not invent 402)

Repository convention is **HTTP 403** ProblemDetails with `errorCode: plan_locked` (`FormTemplatesController`, `CommunitiesController`, `ActivitiesController`, `RequireProPlanFilter`, `ITenantPlanGate.Locked`, `PublicWebsiteInquiriesController`). HTTP 402 is unused. Story prompt’s `plan_upgrade_required` is rejected as a new code.

### Chosen model

1. Add reusable `PlanEntitlementException` in `Application.Tenants` (`Feature`, `RequiredPlan`, `ErrorCode = plan_locked`). Do **not** inherit `InvalidOperationException` (mutations would become 400).
2. `GlobalExceptionHandler` maps it to 403 + `errorCode` / `feature` / `requiredPlan`. Log as information, not error.
3. `SitePageService` throws that exception for Basic on every admin site operation (GET + mutations + preview-token). Public GET remains unchanged.
4. Frontend: skip `GET /admin/site` when the authenticated shell says Basic. If a fetch still happens and returns `plan_locked`, show UpgradePanel only. Other failures stay `loadError`.
5. Do not restyle Website Studio. Do not redesign nav (39.3). Do not change 38.1.

### Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| HTTP 402 | Not used in this repo |
| New `plan_upgrade_required` code | Breaks established `plan_locked` clients/tests |
| Frontend-only skip, keep 500 | Direct API still looks like a crash |
| Catch `InvalidOperationException` in GET as 400 | Wrong class; mutations already misuse 400 for this message |
| Convert any 403/500 to UpgradePanel | Would hide role denials and real failures |

## Tasks / Subtasks

- [ ] Add `PlanEntitlementException` + GlobalExceptionHandler 403 mapping; unit-test mapping and 500 preservation
- [ ] SitePageService throws entitlement exception for Basic on all admin site operations
- [ ] Frontend: typed plan-lock parse; skip Basic Website fetch; UpgradePanel only on explicit lock
- [ ] API integration: Basic / Core / Pro / unauthenticated / PlatformAdmin / TenantMember / isolation
- [ ] Playwright: Basic UpgradePanel + entitled editor; no 500; console/network review
- [ ] Run affected suites, tsc, build, targeted lint

## Non-goals

Do not begin 38.3. Do not redesign Website Studio or global nav. Do not modify 38.1 billing-sync. Do not unlock Basic writes. Do not add a production Basic seeder. Do not change public SitePage entitlements or tenant-URL rules.

## Dev Notes

- Backend: `src/Application/Tenants/PlanEntitlementException.cs` (new), `GlobalExceptionHandler.cs`, `SitePageService.EnsureSitePlanAllowedAsync`
- Frontend: `web/lib/plan-entitlement.ts` (new), `problem-details.ts`, `site-admin-api.ts`, `website-builder-page.tsx`
- Tests: handler unit; `AdminSiteEntitlementIntegrationTests`; vitest `lib/plan-entitlement.test.ts` + `site-admin-api.test.ts`; Playwright `e2e/website-entitlement-38-2.spec.ts`
- Role matrix: see completion report. Site policy stays `TenantOperator`.

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

### Completion Notes List

### File List

### Change Log
