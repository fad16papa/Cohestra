# ATDD Checklist - Epic 44, Story 44.2: Production overview with source-backed KPIs

**Date:** 2026-10-09
**Author:** Admin
**Primary Test Level:** Integration + component + Playwright (gated)

## Story Summary

PlatformAdmin sees `/platform/overview` fleet KPIs with AD-13 provenance. Health is `missing_instrumentation` until 44.3. `/platform` stays the tenant directory.

**As a** PlatformAdmin
**I want** source-backed Overview KPIs
**So that** missing instrumentation is never treated as live health

## P0 mapping

| ID | Test | Assert |
| -- | ---- | ------ |
| P0-05 | Overview HTTP + UI | provenance envelope; health missing_instrumentation; no fake Healthy |
| P0-06 | Directory + authz | `/platform` directory; TenantAdmin/Member 403; Overview aria-current vs Tenants |

## Red-phase targets

- `PlatformOpsOverviewServiceTests` — hideLoadTest parity, aggregates, health freshness, empty zero
- `PlatformOpsOverviewIntegrationTests` — 200 envelope, 401
- `TenantAuthzIntegrationTests` — overview 403
- `platform-overview.test.ts` / header source contract — nav, loading, labels
- `platform-overview-44-2.spec.ts` — 1440/390, skip link, aria-current (skip without `E2E_LIVE_STACK`)

## Out of scope

44.3 health probes, Operations/Audits, outbox, Paddle, version, `/ready` changes.
