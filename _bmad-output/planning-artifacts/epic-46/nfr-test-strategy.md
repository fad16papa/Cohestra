---
title: Epic 46 NFR and production test strategy
status: final
created: 2026-10-19
owner: Murat (TEA)
production: NO-GO
---

# Test / NFR strategy (Murat)

This is a planning strategy, not an evidence audit of Production (Production does not exist). `bmad-testarch-nfr` evidence audit runs after implementation stories produce artifacts.

## Quality attributes

| Attribute | Target | Evidence |
| --- | --- | --- |
| Security | Threat model in `production-security-model.md`; TenantIsolation still required | 46.9 review record + existing CI |
| Reliability | `/ready` frozen; fail-closed limiters; deploy SHA chain | Tests + deploy evidence JSON |
| Observability | OTLP + redaction deny-list | Unit tests for redaction; collector config review |
| DR | Isolated restore test | 46.5 evidence; until then DR = FAIL |
| Performance | Baselines from 46.12, not invented SLOs | Load report |
| Scalability | Single 8 GiB droplet launch | Capacity sheet |
| Operability | Runbooks for every CRITICAL alert | 46.14 checklist |
| Accessibility | AA regression | 46.14 / 46.8 Playwright + axe on Platform Admin |
| Evidence honesty | Missing = FAIL | NFR-12 |

## Performance / load

- Do not load-test the public Production URL while customers could exist.
- Run against a Production-like compose (dark host or CI-sized soak).
- Scenarios: public registration submit, anonymous homepage, authenticated dashboard poll.
- Load-test seed remains Development-only (`LoadTestSeed` blocked in Production).
- Record p95/p99, error rate, CPU/RAM/disk. Set WARNING latency at 2× measured p95.

## Security tests

- Existing: TenantIsolation, PlatformAdmin 403 for tenant JWT, Paddle signature, recaptcha Production bypass denial, ProductionSecurityValidator, PaddleCredentialGuard.
- New: compose publish-port tests for Production (postgres/redis unpublished); Redis password required; log-redaction tests; workflow concurrency/environment name tests analogous to `validate-deploy-uat-workflow.sh`.

## Resilience

- Redis down → 503 on limited routes (already).
- Postgres down → `/ready` unhealthy → CRITICAL.
- Collector down → app still serves; freshness `unavailable` on telemetry KPIs — must not crash API.

## Production smoke (46.13 / 46.14)

Anonymous: HTTPS, `/ready` Healthy, security headers, apex, signup recaptcha widget present (no live solve required if dual-layer pattern from Epic 45 is reused against Production keys' negative tests).

Authenticated: PlatformAdmin SHA match, tenant login on a dedicated smoke tenant (not customer data).

Paddle: webhook URL returns 400 missing signature (proves routing) — no live charge.

## Browser / a11y

Viewports 1440×900 and 390×844. Reuse UAT Playwright harness against Production base URL only after owner network exposure. Dark host may use `PROD_PUBLIC_BASE_URL` with TLS.

## Cutover tests

46.15 refuses to run public DNS steps unless the owner phrase is present in the release record. Automated test: script exits non-zero without `PRODUCTION_CUTOVER_AUTHORIZED=true` from a protected variable that the owner sets — still not the same as the written phrase, which 46.15 runbook requires in the PR/issue.

## Independent of UAT

UAT Playwright jobs must not be retargeted to `cohestra.app`. Production has its own workflow and evidence names.
