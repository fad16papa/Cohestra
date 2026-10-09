---
id: 44.2
key: 44-2-production-overview-source-backed-kpis
title: Production overview with source-backed KPIs
status: review
epic: 44
created: 2026-10-09
baseline_commit: e401d82427e183dfd650bead31cae45575c3ea1d
---

# Story 44.2: Production overview with source-backed KPIs

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE. Code review is repeating, not one-shot.

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a **PlatformAdmin**,
I want **a fleet Overview at `/platform/overview` that states where each number came from**,
so that **I can see tenant and support pulse without treating missing instrumentation as live health**.

## Acceptance Criteria

1. **Given** a PlatformAdmin
   **When** they open `/platform/overview`
   **Then** the page has one h1, skip-link still lands on `#main-content`, and Overview has `aria-current="page"`
   **And** nav order is Overview, Tenants, Support (Operations/Audits absent)

2. **Given** the same admin
   **When** they open `/platform`
   **Then** the tenant directory is unchanged as home (search, filters, create, omni-search)
   **And** Tenants has `aria-current="page"`
   **And** `/platform` is not redirected to `/platform/overview`

3. **Given** `GET /api/v1/platform/ops/overview`
   **When** a PlatformAdmin calls it
   **Then** each KPI is AD-13 `PlatformKpi<T> { value, source, observedAt, freshness }`
   **And** tenant Status and BillingStatus counts are `freshness=actual` from PostgreSQL `tenants`
   **And** open support count is `freshness=actual` from `support_issues` using the existing open-status set
   **And** stack health is `freshness=missing_instrumentation` (value null) — never Healthy/Green/OK/100%
   **And** default counts use the same hideLoadTest filter as the directory (UI default hidden)

4. **Given** a TenantAdmin or TenantMember JWT
   **When** they `GET /api/v1/platform/ops/overview` or open `/platform/overview`
   **Then** API 403 and the platform route guard redirects non-PlatformAdmin away
   **And** anonymous callers receive the current unauthenticated status (401)

5. **Given** empty, loading, or failed data
   **When** Overview renders
   **Then** loading never flashes 0 tenants / 0 support as if loaded
   **And** a legitimate 0 is an empty/zero state, not an error
   **And** a failed fetch is an error, not fake zeroes
   **And** missing instrumentation is a third distinct state
   **And** Playwright covers 1440×900 and 390×844 with no page overflow

## Tasks / Subtasks

- [x] Backend AD-13 DTO + aggregate query (AC: 3, 4)
  - [ ] `PlatformKpi<T>` + overview response in Contracts
  - [ ] Shared hideLoadTest predicate reused by directory list
  - [ ] GroupBy Status / BillingStatus; Count open support; no N+1
  - [ ] Health KPI `missing_instrumentation`; do not call `/ready`
  - [ ] `PlatformAdminOnly` on existing `PlatformOpsController`
- [x] Frontend Overview + nav (AC: 1, 2, 5)
  - [ ] `/platform/overview` in platform shell
  - [ ] Nav order Overview → Tenants → Support; aria-current
  - [ ] Visible provenance; loading/error/zero/missing states
- [x] Tests (AC: all)
  - [x] Policy, HTTP 200/403/401, hideLoadTest parity, provenance
  - [x] Vitest nav/loading/provenance/source contract
  - [x] Playwright 1440/390 Overview + directory regression
  - [x] 44.1 recovery/policy regression still present

### Review Findings

Review HEAD `532d58df` vs `e401d824`. Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (Grok 4.6). Owner loop authorized FIX of BLOCKER/MAJOR without per-finding confirmation.

- [x] [Review][Patch] Malformed named-count `value` must error, not render as actual zero [`web/lib/platform-api.ts`]
- [x] [Review][Patch] Reject fake/instrumented stack health in the client parser [`web/lib/platform-api.ts`]
- [x] [Review][Patch] TenantAdmin Playwright must wait until `/platform/overview` is left [`web/e2e/platform-overview-44-2.spec.ts`]
- [x] [Review][Patch] Invalidate in-flight overview fetches on retry/toggle [`web/app/(platform)/platform/overview/page.tsx`]
- [x] [Review][Patch] Wrap provenance text; cover WaitingOnOperator; 390 directory/nav [`web/components/platform/platform-kpi-tile.tsx`, tests]
- [x] [Review][Defer] Header support badge remains the unfiltered inbox count [`web/components/platform/platform-header.tsx`] — deferred, pre-existing inbox API; Overview KPI uses hideLoadTest parity by spec

## Dev Notes

### AD-13 KPI envelope (do not invent a second contract)

```text
PlatformKpi<T> { value, source, observedAt, freshness }
freshness ∈ actual | missing_instrumentation | unavailable | stale
observedAt = DateTimeOffset UTC of the query
```

Sources (staff-facing, not SQL):
- Tenant / billing counts: `PostgreSQL tenants`
- Open support: `PostgreSQL support_issues`
- Stack health: `Not instrumented`

Open support statuses (existing ops/header convention): `Open`, `InProgress`, `WaitingOnOperator`.

### hideLoadTest (directory parity)

Reuse `PlatformTenantService` filter when hide is on:

- slug does not start with `load-` (case-insensitive)
- tenant id is not `TenantIds.Default`
- slug is not `default`

Directory **UI** defaults hide=true; directory **API** query default is false. Overview **API and UI** default hide=true so the home pulse matches the directory home view. Query `hideLoadTest=false` must include fixtures. Support open count uses the same tenant visibility set.

### Health hard rule

Do not inspect postgres/redis, do not call anonymous `/ready`, do not show Healthy/Green/Operational/100%/OK. 44.2 is independently shippable: Overview shows “Instrumentation not available yet”.

### Files to UPDATE

- `PlatformOpsController` — add GET `ops/overview` only; preserve recovery limiter and Epic 28 routes
- `PlatformTenantService` — call shared visibility helper (behavior unchanged)
- `platform-header.tsx` — Overview first; Tenants current only for `/platform` and `/platform/tenants*`
- `platform-api.ts` — `getPlatformOpsOverview`
- `TenantAuthControllerPolicyTests` — still lists `PlatformOpsController` (no new controller)
- `TenantAuthzIntegrationTests` — 403 on overview
- `platform-43-4-source.test.ts` — nav order + no tenant chrome

### Files to ADD

- `src/Contracts/Platform/PlatformKpiContracts.cs`
- `src/Application/Platform/IPlatformOpsOverviewService.cs`
- `src/Infrastructure/Platform/PlatformTenantVisibility.cs`
- `src/Infrastructure/Platform/PlatformOpsOverviewService.cs`
- `src/Infrastructure.Tests/Platform/PlatformOpsOverviewServiceTests.cs`
- `src/Api.IntegrationTests/PlatformOpsOverviewIntegrationTests.cs`
- `web/app/(platform)/platform/overview/page.tsx`
- `web/components/platform/platform-kpi-tile.tsx`
- `web/lib/platform-overview.ts` + tests
- `web/e2e/platform-overview-44-2.spec.ts`

### Preserve (44.1 / 43.4)

PlatformAdminOnly identity; recovery 429/503; no tenant sidebar/PlanBadge/Follow-up; `max-w-5xl` shell; skip link; 44px targets; `--plat-*` tokens; no impersonation.

### Strict exclusions

44.3–44.9. No ops/health endpoint, Operations/Audits nav, outbox, Paddle, timeline, severity, version, `/ready` change, billing processor, webhooks, deploy, SQL, replay, requeue.

### Project Structure Notes

Align with spine: Contracts/Platform KPI envelope; Application query interface; Infrastructure aggregate; UI under `web/app/(platform)/platform/overview/`. Extend `platform-api.ts`; do not fork.

### References

- [Source: `_bmad-output/planning-artifacts/epics-platform-production-support.md` Story 44.2]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-epic-44-platform-production-support/ARCHITECTURE-SPINE.md` AD-12, AD-13, AD-14]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-epic-44-platform-production-support/DESIGN.md`]
- [Source: `_bmad-output/planning-artifacts/test-design-epic-44-platform-production-support.md` P0-05, P0-06]
- [Source: `_bmad-output/implementation-artifacts/44-1-platform-ops-http-gates-policy-recovery-rate-limits.md`]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

### Completion Notes List

### File List

See git diff vs `e401d824`. Includes Contracts KPI envelope, overview service/controller, `/platform/overview`, header nav, tests, ATDD/trace/NFR/review artifacts.

## Change Log

- 2026-10-09: Story context created from Epic 44, AD-13, TEA P0-05/P0-06, and 44.1 contracts.
- 2026-10-09: Implemented overview API/UI; first review patched parser honesty, health rejection, fetch races, and test gaps.
