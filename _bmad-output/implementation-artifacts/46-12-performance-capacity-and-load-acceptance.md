---
id: 46.12
key: 46-12-performance-capacity-and-load-acceptance
title: Performance, capacity, and load acceptance
status: review
epic: 46
created: 2026-11-18
baseline_commit: a784ddf70ad5c8e6059d2c50496fadb72cdd7f98
depends_on:
  - 46.1
owner_gate: none
production: NO-GO
implementation_authorized: true
---

# Story 46.12: Performance, capacity, and load acceptance

Status: review

## Story

As an **owner**,
I want **measured p95 and host headroom**,
So that **we do not launch on a 4 GiB host because UAT happened to work**.

## Acceptance Criteria

1. **Given** a production-like stack  
   **When** load tests run  
   **Then** they do not target customer DNS  
   **And** `deploy/production-like-load.sh` refuses public hosts and inventory droplet IPs  
   **And** absent `BASE_URL`, CI can prove refusal logic without a server (self-check).

2. **Given** Production compose  
   **When** inspected  
   **Then** `LoadTestSeed__Enabled` remains locked `false` in `docker-compose.production.yml`.

3. **Given** local Postgres and Redis  
   **When** `ProductionLikeLoadIntegrationTests` runs  
   **Then** a bounded load hits `GET /health` with LoadTestSeed disabled  
   **And** p95/p99 and error rate are recorded under `_bmad-output/implementation-artifacts/evidence/46-12/`.

4. **Given** measured p95  
   **When** the load report is written  
   **Then** future 46.7 latency WARNING is recorded as 2× p95 only (no alerting built).

5. **Given** the planning 8 GiB droplet seed  
   **When** sizing is recommended  
   **Then** recommendation is NO-GO below that seed and does not claim the droplet was tested.

## Tasks / Subtasks

- [x] `deploy/production-like-load.sh` loopback guard + optional bounded load
- [x] `deploy/production-like-load.test.sh` guard contract + LoadTestSeed compose assertion
- [x] `ProductionLikeLoadIntegrationTests` + dedicated factory (LoadTestSeed off)
- [x] `docs/deploy/production-like-load-report.md` with executed numbers
- [x] CI: `deploy/production-like-load.test.sh`
- [ ] Mandatory code review on final HEAD

## Dev Notes

- Does **not** implement Story 46.7 (no Grafana/Prometheus/alerts).
- Does **not** boot `ASPNETCORE_ENVIRONMENT=Production` against localhost Postgres (validator fail-closed).
- Does **not** run `docker compose` or contact the production droplet.

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.12
- `docs/deploy/production-like-load-report.md`

## Dev Agent Record

### Agent Model Used

Cursor Composer

### Debug Log References

- `bash deploy/production-like-load.test.sh` — pass
- `bash deploy/production-like-load.sh` — `RESULT=SELF_CHECK`
- `dotnet test ... ProductionLikeLoadIntegrationTests` — 1 passed

### Completion Notes List

- Loopback-only load guard ships with self-check default for CI.
- Integration load: p95 **1.979 ms**, p99 **9.483 ms**, error rate **0%** on `/health`.
- 46.7 WARNING threshold recorded: **3.958 ms** (2× p95).
- Size: **NO-GO** below **8 GiB** planning seed; droplet not measured.

### File List

- `deploy/production-like-load.sh`
- `deploy/production-like-load.test.sh`
- `docs/deploy/production-like-load-report.md`
- `src/Api.IntegrationTests/ProductionLikeLoadIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/ProductionLikeLoadWebApplicationFactory.cs`
- `src/Api.IntegrationTests/Infrastructure/ProductionLikeLoadFixture.cs`
- `_bmad-output/implementation-artifacts/evidence/46-12/load-metrics.json`
- `.github/workflows/ci.yml`