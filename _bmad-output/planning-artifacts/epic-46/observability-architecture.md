---
title: Epic 46 Observability Architecture
status: final
created: 2026-10-19
owner: Winston + Murat
production: NO-GO
---

# Observability architecture

Spine: AD-8, AD-9, AD-10. Platform Admin does not replace this plane.

## What already exists

| Signal | Status | Production-ready? |
| --- | --- | --- |
| `GET /health` | Liveness stub | Yes as liveness; not dependency health |
| `GET /ready` | postgres + redis + default-tenant | Yes for orchestration; frozen |
| `GET /api/v1/platform/ops/health` | Same ready checks + `not_in_probe` | Yes for support honesty |
| Outbox summary/list | Platform Admin read-only | Yes as DB read model |
| Paddle deliveries | Additive disposition table | Yes as billing diagnostic |
| `GIT_SHA` / ops/version | UAT deploy injects SHA | Yes once Production deploy sets `GIT_SHA` |
| `ILogger` | Default ASP.NET | Not production observability |
| Tenant log scopes | `tenantId` / `tenantSlug` | Keep |
| Email delivery checklist | Tenant Admin | Keep; not platform uptime |
| Serilog / OTel / Prometheus / Sentry | Missing | Must add in 46.6/46.7 |
| External uptime / alert routing | Missing | 46.7 |

## Target pipeline

```
web / api+jobs / nginx / postgres exporter / redis exporter / node exporter
        → OpenTelemetry Collector (OTLP)
        → Loki (logs) + Prometheus (metrics) + Tempo (traces)
        → Grafana OSS dashboards + alert rules
        → sanitized KPI projection (API job or scrape of selected gauges)
        → Platform Admin (Epic 44 envelope)
```

Default is self-hosted on the Production droplet (or the same docker network). Paid vendor = owner gate; still OTLP.

## Instrumentation (46.6)

OpenTelemetry.Extensions.Hosting 1.20.0:

- ASP.NET Core HTTP metrics and traces (latency, 5xx, route templates — not raw URLs with PII)
- HttpClient
- EF Core spans with parameter values off
- Redis spans without command payloads that contain tokens
- Custom spans: outbox dispatch (message type, status, duration — no PayloadJson), Paddle webhook (event type, disposition — no raw body), hosted jobs (job name, duration, success)

Logs: OTel logger provider or Collector filelog from docker json-file. Prefer structured JSON.

## Log-redaction rules

**Prohibit:** passwords, JWTs, refresh tokens, API keys, Paddle secrets, SendGrid secrets, reCAPTCHA secrets, database credentials, SSH keys, card data, OTP codes, webhook raw bodies, outbox PayloadJson, form answers.

**Avoid by default:** email, phone, name, IP if not needed. If an error log needs an identity, use user id / tenant id.

**Sanitize:** provider error text via existing sanitizer (max 200 chars, credential-pair redaction) before any Platform Admin projection.

**Fix known leak:** `SendGridEmailSender` must not log `{ToEmail}` or raw body in Production (46.6).

## Metrics (minimum)

- `http.server.request.duration` by route template + status
- 5xx rate
- `/ready` result (synthetic check, not a widened probe)
- postgres up, redis up
- process CPU/memory
- disk used percent
- outbox pending/failed/backlog age
- paddle webhook disposition counts (failed/invalid signature/retryable)
- email send failure count (from outbox handler, not SendGrid secret)
- cert expiry days
- backup last success timestamp
- runtime SHA info metric or label

## Tracing

Sample: 10% baseline, 100% on errors, 100% on `/api/v1/system/paddle/webhook` and outbox failures. Adjust after noise review. Never trace request bodies.

## Error tracking

Unhandled exceptions already hit `GlobalExceptionHandler`. Export to Tempo + Loki. Sentry only with owner approval.

## Uptime

External HTTPS GET `https://cohestra.app/` and `https://cohestra.app/ready` on a 60s interval. Until public DNS exists, probe the dark host by IP with Host header or a temporary monitoring name — owner DNS gate still required for public names.

## Alert matrix

| Alert | Class | Recommended threshold | Notes |
| --- | --- | --- | --- |
| `/ready` unhealthy | CRITICAL | 2 consecutive 60s checks | |
| Website unavailable | CRITICAL | 2 consecutive 60s checks | Apex or nginx 5xx |
| API 5xx spike | CRITICAL | 5xx ratio > 5% for 5 min AND volume > 20 | Avoid tiny-sample noise |
| API latency degradation | WARNING | p95 > 2× baseline for 10 min | Baseline from 46.12 |
| PostgreSQL unavailable | CRITICAL | health fail 60s | |
| Redis unavailable | CRITICAL | health fail 60s | Fail-closed 503 expected on limiters |
| Paddle webhook failures | WARNING then CRITICAL | >5 retryable/invalid in 15 min; CRITICAL if zero successes + incoming volume | |
| Outbox failures/backlog | WARNING then CRITICAL | Failed > 0 for 15 min WARNING; pending age > 30 min CRITICAL | |
| Email processing failures | WARNING | handler fail rate > 10% / 15 min | |
| Disk warning | WARNING | 80% | |
| Disk critical | CRITICAL | 90% | |
| Memory pressure | WARNING | 90% for 10 min | |
| CPU saturation | WARNING | 90% for 15 min | |
| Certificate expiry | WARNING / CRITICAL | 21 days / 7 days | |
| Backup failure | CRITICAL | missed window | |
| Restore verification failure | CRITICAL | scheduled test fail | |
| Production SHA mismatch | CRITICAL | runtime ≠ deploy target | |
| Deploy job failed after gate | WARNING | notify; not page unless runtime unhealthy | |

INFO is for deploy started/finished and restore test started — chat or log only, not page.

## Platform Admin projection

Publish only: service health rollup, runtime SHA, outbox counts, paddle delivery health, 5xx/latency freshness, last backup success. Freshness `missing_instrumentation` until 46.6 lands. Never copy raw log lines with PII into Platform Admin.
