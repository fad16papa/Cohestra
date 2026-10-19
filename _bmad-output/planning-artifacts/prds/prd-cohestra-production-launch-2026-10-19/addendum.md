---
title: Epic 46 PRD addendum — architecture overflow
status: final
created: 2026-10-19
updated: 2026-10-19
---

# Addendum: mechanisms, options, rejected alternatives

This file holds technical-how and option matrices that must not bloat the PRD. Architecture spine is authoritative for invariants.

## Rejected alternatives

| Idea | Why rejected |
| --- | --- |
| Put Production on the existing UAT/CRM droplet | Owner lock: Production must be separate |
| Auto-deploy Production from `main` like UAT | Owner lock: owner release gate |
| Reuse Environment `uat` with extra secrets | Secret and approval mixing |
| Widen anonymous `/ready` to outbox/Paddle/SendGrid | Epic 44 AD-14 frozen |
| Rebuild Platform Admin as an observability product | Epic 44 is the console; telemetry is a separate plane |
| Separate worker container for outbox | Jobs already run as API hosted services; no evidence they need splitting |
| Hangfire / second frontend | Project-context brownfield extend-only |
| Reuse UAT Paddle sandbox or UAT SendGrid identity in Production | Owner lock |
| Point `cohestra.app` at UAT | Owner lock |
| Claim backups ready because `pg_dump` is documented | Restore unproven |
| Paid observability chosen in planning | Requires owner approval |

## PostgreSQL OPTION A vs OPTION B

List prices retrieved 2026-10-19 from DigitalOcean public pricing. Tax extra. Do not purchase in this pass.

| | OPTION A self-hosted on droplet | OPTION B DigitalOcean managed PostgreSQL |
| --- | --- | --- |
| Fit | Matches one-droplet launch topology | Extra network hop; droplet still needed for API/web/redis/nginx |
| Cost (illustrative) | Included in droplet (recommend 8 GiB Basic $48/mo) | 1 GiB $15.15 / 2 GiB $30.45 / 4 GiB $60.90 / 8 GiB $122.10 plus droplet |
| Backups | We must build WAL + object storage + restore tests | Vendor automated backups; restore tests still required |
| HA | Single node unless we add replicas | Standby nodes extra (HA 2 GiB starts ~$60/mo pair-class cost) |
| Exposure | Bind to docker network only | Must firewall to Production droplet; never public |
| Operations | We own vacuum, disk, upgrades | Vendor owns engine patching |
| Recommendation | **Default for launch** | Owner decision if they want to buy operational offload |

**OWNER DECISION:** remain OPTION A unless the owner accepts OPTION B cost.

## Observability default vs paid

| | Default OSS | Paid vendor |
| --- | --- | --- |
| Path | OpenTelemetry SDK 1.20.x → OTel Collector → Prometheus + Loki + Tempo + Grafana OSS | Any OTLP backend (Grafana Cloud, Honeycomb, Datadog, etc.) |
| Cost | Included on droplet (watch disk) | Subscription — owner gate |
| Lock-in | OTLP keeps an exit | Avoid vendor SDK |

Error tracking: Loki/Tempo first. Sentry = owner gate.

Uptime: Grafana synthetic or a free external checker. Paid status page = owner gate.

## UAT vs Production deploy shape

```
main merge
  → CI
  → Deploy UAT (automatic, Environment uat)     [UNCHANGED]
  → Production candidate
       → owner release gate (Environment production)
       → deploy Production
       → SHA verify + smoke
       → still NO-GO until PRODUCTION CUTOVER: AUTHORIZED
```

## Background jobs (current)

Registered in API DI: BillingJobs, FollowUpDigest (default off), OutboxDispatcher, ActivityExpiration. Production topology keeps them in `cohestra-prod-api`.

## SendGrid independence

UAT runbook currently names `noreply@creativorare.com`. Production requires its own key and authenticated domain. Planning assumption: `cohestra.app`. Do not subscribe/change SendGrid during planning.

## Paddle live

Existing `PaddleCredentialGuard` already refuses live keys on UAT hosts and requires `AllowLive` for `Paddle:Environment=production`. Epic 46 uses that guard; it does not weaken it. Story 19.4 is not live acceptance.
