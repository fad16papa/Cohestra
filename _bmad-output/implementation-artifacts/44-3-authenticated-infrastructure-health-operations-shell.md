---
id: 44.3
key: 44-3-authenticated-infrastructure-health-operations-shell
title: Authenticated infrastructure health and Operations shell
status: review
epic: 44
created: 2026-10-09
baseline_commit: 2b4371d6ff4a07255c9de3e954e6ccc4cad4d38c
---

# Story 44.3: Authenticated infrastructure health and Operations shell

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a **PlatformAdmin**,
I want **authenticated postgres/redis/default-tenant health in Operations, Overview, and a directory banner**,
so that **I never confuse anonymous `/ready` with outbox, Paddle, or email health**.

## Acceptance Criteria

1. **Given** anonymous `/ready`
   **When** this story ships
   **Then** checks remain postgres, redis, default-tenant only
   **And** JSON shape stays `{ status, checks: { name: { status } } }` — no duration/description/not-in-probe

2. **Given** `GET /api/v1/platform/ops/health`
   **When** PlatformAdmin calls it
   **Then** 200 with overall status from `HealthCheckService` (Healthy/Degraded/Unhealthy)
   **And** the three ready-tagged checks include name, status, duration, sanitized description
   **And** outbox, Paddle, SendGrid, hosted jobs are `not_in_probe` — never Healthy
   **And** no connection strings, passwords, Redis URLs, stacks, Bearer/API keys
   **And** TenantAdmin/Member 403; anonymous 401

3. **Given** Overview
   **When** health succeeds
   **Then** stack health KPI is AD-13 `freshness=actual` from the same health service (not a second probe engine)
   **When** the health request fails
   **Then** Overview still loads tenant KPIs; stack health is `unavailable` — not Healthy, not cached green, not 0

4. **Given** `/platform/ops`
   **When** PlatformAdmin opens it
   **Then** nav is Overview, Tenants, Operations, Support; Operations `aria-current="page"`
   **And** Health section shows real checks; Outbox and Billing/Paddle are missing-instrumentation placeholders with no queries
   **And** `/platform` and `/platform/overview` are not redirected

5. **Given** authenticated overall status is not Healthy
   **When** on `/platform`
   **Then** a perceivable banner lists which real checks are Degraded/Unhealthy and that `/ready` does not prove outbox/Paddle/email
   **And** missing-instrumentation alone does not show a degraded banner
   **And** health fetch failure does not block directory search/create/filters

## Tasks / Subtasks

- [x] Backend health DTO + HealthCheckService wrapper (AC: 1–3)
- [x] Sanitization + /ready freeze tests (AC: 1–2)
- [x] Overview consumes health service (AC: 3)
- [x] Operations route + nav + directory banner (AC: 4–5)
- [x] Authz/TenantIsolation/Playwright/44.1/44.2 regression (AC: all)

## Dev Notes

### AD-14 `/ready` frozen
Do not edit `Program.cs` MapHealthChecks `/ready` writer. Authenticated diagnostics only at `GET /api/v1/platform/ops/health`.

### Health source
Reuse `HealthCheckService` ready-tagged checks registered in `Program.cs`: `postgres`, `redis`, `default-tenant`. Overall status = `HealthReport.Status`. Never invent green because HTTP 200.

### DTO
```
PlatformOpsHealthResponse { overallStatus, observedAt, checks[], notInProbe[] }
PlatformHealthCheckResult { name, status, durationMs, description }
```
Real check status ∈ Healthy | Degraded | Unhealthy. Unchecked status = `not_in_probe`. Description sanitized ≤ 200 chars; never copy Exception.

### Overview KPI
Same `PlatformKpi<string?>` envelope. Success: value=overallStatus, source=staff-facing HealthCheckService label, freshness=actual. Failure: value=null, freshness=unavailable.

### Strict exclusions
No 44.4–44.9. No outbox/Paddle queries. No /ready widening. No polling, history, cron, impersonation, SQL, replay, requeue, deploy.

## References

- Epic 44 Story 44.3; AD-13, AD-14, AD-15; TEA P0-07, P0-08, P1-03, P1-04, P1-12
- Story 44.2 KPI envelope and `/platform/overview`

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

### Completion Notes List

### File List

- src/Contracts/Platform/PlatformHealthContracts.cs
- src/Contracts/Platform/PlatformKpiContracts.cs
- src/Application/Platform/IPlatformOpsHealthService.cs
- src/Infrastructure/Platform/PlatformHealthDescriptionSanitizer.cs
- src/Infrastructure/Platform/PlatformOpsHealthService.cs
- src/Infrastructure/Platform/PlatformOpsOverviewService.cs
- src/Infrastructure/DependencyInjection.cs
- src/Api/Controllers/V1/PlatformOpsController.cs
- src/Infrastructure.Tests/Platform/PlatformHealthDescriptionSanitizerTests.cs
- src/Infrastructure.Tests/Platform/PlatformOpsHealthServiceTests.cs
- src/Infrastructure.Tests/Platform/PlatformOpsOverviewServiceTests.cs
- src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs
- src/Api.IntegrationTests/PlatformOpsHealthIntegrationTests.cs
- src/Api.IntegrationTests/PlatformOpsOverviewIntegrationTests.cs
- src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs
- src/Api.IntegrationTests/TenantIsolationApiTests.cs
- web/lib/platform-api.ts
- web/lib/platform-health.ts
- web/lib/platform-health.test.ts
- web/lib/platform-overview.test.ts
- web/lib/platform-43-4-source.test.ts
- web/lib/platform-44-3-source.test.ts
- web/components/platform/platform-header.tsx
- web/components/platform/platform-directory-health-banner.tsx
- web/app/(platform)/platform/ops/page.tsx
- web/app/(platform)/platform/overview/page.tsx
- web/app/(platform)/platform/page.tsx
- web/e2e/platform-ops-44-3.spec.ts
- web/e2e/platform-overview-44-2.spec.ts

## Change Log

- 2026-10-09: Story context from Epic 44, AD-14, TEA P0-07/P0-08, and 44.2 contracts.
