# ATDD Checklist - Epic 44, Story 44.3

**Date:** 2026-10-09
**Author:** Admin
**Primary Test Level:** Unit + integration + TenantIsolation + Playwright (gated)

## Story Summary

PlatformAdmin sees authenticated postgres/redis/default-tenant health. `/ready` stays frozen. Unchecked deps are `not_in_probe`. Overview uses the same health service (`actual` / `unavailable`). Directory banner only when overall ≠ Healthy.

## P0 mapping

| ID | Test | Assert |
| -- | ---- | ------ |
| P0-07 | `/ready` freeze + health not-in-probe | three public checks; outbox/Paddle/SendGrid/jobs never Healthy |
| P0-08 | Health DTO secrets | no connection string / Password= / redis:// / Bearer / stack |

## P1 mapping

| ID | Test | Assert |
| -- | ---- | ------ |
| P1-03 | Directory banner | shown iff overall not Healthy; directory still works if health fails |
| P1-04 | Overview health | actual from health service; unavailable on failure |
| P1-12 | `/platform/ops` | skip, one h1, one main |

## Red-phase targets

- `PlatformOpsHealthServiceTests` — Healthy/Degraded/Unhealthy, sanitize, not_in_probe
- `PlatformOpsOverviewServiceTests` — actual vs unavailable stack health
- `PlatformOpsHealthIntegrationTests` — 200/401, /ready freeze, no secrets
- `TenantAuthzIntegrationTests` — health 403
- Playwright `/platform/ops` 1440/390

## Out of scope

44.4 outbox APIs, 44.5 Paddle, `/ready` shape change, polling.
