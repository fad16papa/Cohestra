---
id: 46.1
key: 46-1-production-architecture-and-infrastructure-baseline
title: Production architecture and infrastructure baseline
status: in-progress
epic: 46
created: 2026-10-19
baseline_commit: 01773c1eca0eff14ffb524d707d2fb01dfefd2b4
planning_pr: 480
owner_gate: none
production: NO-GO
---

# Story 46.1: Production architecture and infrastructure baseline

Status: in-progress

## Story

As a **platform operator**,
I want **the Production topology, compose contract, and repository runtime names locked in-repo**,
so that **later Epic 46 stories cannot invent a second Production architecture**.

## Acceptance Criteria

1. **Given** this story lands
   **When** engineers inspect the repo
   **Then** `docker-compose.production.yml` exists with project `cohestra-production`
   **And** services/containers are `cohestra-prod-web`, `cohestra-prod-api`, `cohestra-prod-postgres`, `cohestra-prod-redis`, `cohestra-prod-nginx`, `cohestra-prod-otelcol`
   **And** postgres and redis have no public host ports
   **And** API still hosts outbox and billing/expiration/follow-up jobs (no worker service)
   **And** `docker-compose.prod.yml` remains a local overlay only
   **And** `.env.production.example` lists secret **names** only

2. **Given** the UAT path
   **When** this story is merged
   **Then** `.github/workflows/deploy.yml` still uses Environment `uat` and concurrency `deploy-uat`
   **And** no workflow auto-deploys Production

3. **Given** documentation
   **When** `docs/deploy/production-launch-program.md` is read
   **Then** it states Production uses a dedicated droplet, `docker-compose.production.yml`, project `cohestra-production`
   **And** the UAT shared host is forbidden for Production
   **And** PRODUCTION=NO-GO

4. **Given** Production Redis
   **When** the compose contract is inspected
   **Then** Redis authentication is required via a Production secret variable
   **And** the password is not hardcoded
   **And** UAT Redis remains unchanged (no password required)

5. **Given** OPTION A
   **When** postgres is defined
   **Then** it is self-hosted PostgreSQL 16 on the compose network
   **And** OPTION B is not implemented or purchased

6. **Given** this story
   **When** implementation is reviewed
   **Then** no Production CD workflow, GitHub Environment creation, SSH, DNS, TLS, live Paddle, or Platform Admin changes exist
   **And** OTel collector is a container contract only (no Grafana/Prometheus/Loki/Tempo/alerts, no app SDK)

## Tasks / Subtasks

- [x] Task 1: `docker-compose.production.yml` + internal network (AC 1, 4, 5, 6)
- [x] Task 2: `.env.production.example` names only (AC 1)
- [x] Task 3: OTel collector config contract (AC 6)
- [x] Task 4: Document local overlay vs Production + launch program (AC 1, 3)
- [x] Task 5: Deterministic `deploy/validate-production-compose.sh` + CI (AC 1–6)
- [x] Task 6: Prove UAT deploy.yml / uat compose unchanged in behavior (AC 2, 4)
- [ ] Task 7: Exact-HEAD code review PASS

## Dev Notes

- Spine: AD-1, AD-3, AD-4, AD-5, AD-6 (names only), AD-8 collector only, AD-12 Paddle not live, AD-13 NO-GO, AD-15 Redis password
- Reuse `deploy/nginx/app.conf` HTTP reverse proxy. TLS is 46.13.
- Jobs stay registered in `src/Infrastructure/DependencyInjection.cs`
- Do not edit Platform Admin, `deploy.yml`, or `docker-compose.uat.yml`
- Do not create `.github/workflows/deploy-production.yml`

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.1
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md`
- `docker-compose.uat.yml` (UAT isolation pattern; do not copy shared-host edge)

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- `bash deploy/validate-production-compose.sh` — 62/0 PASS (docker compose config parse deferred to CI; Docker not in this snapshot)
- `bash deploy/validate-uat-isolation.sh` — 56/0 PASS
- `bash deploy/validate-deploy-uat-workflow.sh` — 34/0 PASS
- `git diff -- .github/workflows/deploy.yml docker-compose.uat.yml` — empty

### Completion Notes List

- Locked Production topology in `docker-compose.production.yml` (project `cohestra-production`, dedicated internal network, OPTION A Postgres 16, Redis requirepass via `${REDIS_PASSWORD}`, no worker, jobs remain in API).
- `.env.production.example` is names-only (no assignments, no credentials).
- OTel collector is an OTLP→debug contract container only.
- `docker-compose.prod.yml` remains a local overlay.
- No Production CD workflow. UAT `deploy.yml` / `docker-compose.uat.yml` unchanged.
- PRODUCTION=NO-GO. Next owner gate is `droplet_purchase` (Story 46.2) — not started.

### File List

- docker-compose.production.yml
- .env.production.example
- deploy/otel/production-collector.yaml
- deploy/production-compose.sh
- deploy/validate-production-compose.sh
- docker-compose.prod.yml
- docs/deploy/production-launch-program.md
- .github/workflows/ci.yml
- .gitignore
- _bmad-output/implementation-artifacts/46-1-production-architecture-and-infrastructure-baseline.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
