# Traceability — Story 44.6 Tenant Diagnostic Timeline

Workflow: bmad-testarch-trace (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6
Baseline: 7f11f02f49b8bcf40d9dd68831c9e1cd94578968

Gate: **PASS** for Story 44.6 P0/P1. Not a production-cutover gate. DigitalOcean missing host remains Epic 19.

## FR / AC → implementation → test

| Requirement | Query | DTO | UI | Automated test |
|---|---|---|---|---|
| FR-44-12 timeline | `PlatformTenantTimelineService.GetAsync` | `PlatformTenantTimelineResponse` | `PlatformTenantTimeline` | unit + integration + Playwright |
| P0-16 tenant isolation | TenantId filters + support join | items/sources for requested tenant only | n/a (API) | `TenantIsolationApiTests.Platform_tenant_timeline_returns_only_requested_tenant` |
| P1-07 snapshot/recovery remain | existing ops/detail endpoints unchanged | unchanged | page still mounts ops + lifecycle + recent audit | `platform-44-6-source.test.ts`, Playwright |
| P1-01 1440/390 | n/a | n/a | Timeline list wraps | `platform-ops-44-6.spec.ts` |
| P1-12 a11y shell | n/a | n/a | one h1, skip, timeline h2, ol/time | Playwright + axe |
| Audit source | `PlatformAuditLogs` TenantId Take 25 | type audit, provenance platform_audit_logs | row | composer + integration sentinels |
| Support source | IgnoreTenantFilters issues + replies | type support, opened/reply only | row | service + isolation |
| Outbox source | `OutboxMessages` TenantId | 44.4 summary + lastErrorSanitized | row | composer + isolation |
| Paddle source | deliveries TenantId == requested | 44.5 fields, no EventId | row + missing_instrumentation | isolation + empty |
| Billing snapshot | current Tenant row | type billing_snapshot, observedAt | current snapshot row | unit + empty Playwright |
| Unknown tenant | tenant null | n/a | n/a | 404 integration |
| Authz | PlatformAdminOnly | n/a | route still Platform | TenantAuthz + timeline integration |

## Orphan ACs

Zero. Epic AC lines (merge, 403, UI states, no synthetic events) each have a test.

## Quality gate

**PASS** for implementation review. Draft PR only. STOP before merge.
