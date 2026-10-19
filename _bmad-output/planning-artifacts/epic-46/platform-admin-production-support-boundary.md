---
title: Epic 46 Platform Admin production-support boundary
status: final
created: 2026-10-19
owner: John + Winston; Sally only if 46.8 invents a new room
production: NO-GO
---

# Platform Admin production-support boundary

Epic 44 remains the console. Epic 46 must not rebuild it.

## Purpose (locked)

Platform Admin is **Cohestra internal production-support admin only**.

It is not: a customer workspace, a tenant admin replacement, a deployment console, a server-management console, a database console, a secrets manager, or a general engineering control plane.

TenantAdmin and PlatformAdmin remain strictly separated.

## Consume vs collect

```
production services → telemetry system → sanitized support signals → Platform Admin
```

Plus existing DB read models (tenants, outbox, paddle deliveries, audits, support issues, `GIT_SHA`).

## Signals already supported (keep)

- Fleet KPIs with provenance envelope
- Authenticated ops health (ready-tagged + honest `not_in_probe`)
- Outbox summary/list (no payload)
- Paddle config (no secrets) and deliveries
- Tenant diagnostic timeline
- Audits search
- Support severity
- Deployment version SHA

## Production-support gaps (46.8 only)

| Gap | Action |
| --- | --- |
| 5xx / latency | Add KPI from telemetry; freshness `missing_instrumentation` until 46.6 |
| Uptime / website unavailable | Sanitized boolean + observedAt |
| Last backup success | KPI from backup reporter, not a restore button |
| Alert state | Latest CRITICAL/WARNING names, no raw log dumps |
| Certificate expiry | Days remaining if exporter exists |
| Disk/memory | Host gauges sanitized |

No new privileged mutations. Failed-outbox requeue stays forbidden (Epic 44 AD-18) unless a future security-reviewed story is authorized.

## UX

Inherit Epic 43.4 / 44: Overview and Operations rooms, KPI cards, skip-link, one h1, 1440×900 and 390×844, light-only. Sally is not required unless 46.8 proposes a new nav room — default is extend Operations.

## Identity in Production

`/platform/login` on `https://cohestra.app` only. Tenant hosts 307 to apex. Dedicated Production PlatformAdmin identity, not the UAT automation user. Seed disabled; owner creates the account through the existing controlled bootstrap path (not Cursor SSH).
