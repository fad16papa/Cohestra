---
id: 44.9
key: 44-9-deployment-version-health-read-only
title: Deployment Version Health
status: done
epic: 44
created: 2026-10-10
baseline_commit: 3fc6151517a4cd15a83e2d5c47a845c08b3b38a7
---

# Story 44.9: Deployment Version Health (read-only)

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD. Epic 44 stays in-progress. PlatformAdmin light-only correction PR #431 is separate.

## Story

As a **PlatformAdmin**,
I want **to see the running Git SHA, runtime environment, and API version with truthful provenance**,
so that **I can identify what build is serving Cohestra without SSH and without mutation controls**.

## Source audit

- `GET /api/v1/system/info` remains `{ Name: Cohestra, ApiVersion: v1 }` anonymous. Frozen.
- `/ready` unchanged. No SHA.
- `PlatformOpsController` already owns `/api/v1/platform/ops/*`.
- `docker-compose.uat.yml` API sets `ASPNETCORE_ENVIRONMENT=Production` and now passes `GIT_SHA: ${GIT_SHA:-}`.
- `deploy/remote-deploy.sh` resets to `origin/$DEPLOY_BRANCH`, sources `.env`, then `GIT_SHA="$(git rev-parse HEAD)"; export GIT_SHA`.

## Locked semantics

**Endpoint:** `GET /api/v1/platform/ops/version` — PlatformAdminOnly. GET only. No audit.

**Envelope:** existing `PlatformKpi<T>` (`value`, `source`, `observedAt`, `freshness`). Freshness vocabulary: `actual` / `missing_instrumentation` / `unavailable` / `stale`. `observedAt` is request observation time, not deploy time.

**gitSha**
- Source env/config key: `GIT_SHA`
- Valid full hex object id (40 or 64) → value = that SHA, freshness `actual`, source `GIT_SHA`
- unset/blank → value null, freshness `missing_instrumentation`, source `Not instrumented`
- present but malformed → value null, freshness `unavailable`, source `GIT_SHA malformed`
- Never echo malformed text. Never substitute `v1` / `latest` / `main`.

**environmentName**
- Authoritative source: `IHostEnvironment.EnvironmentName`
- UAT compose sets Production, so UAT may truthfully report `Production`
- This is runtime environment, not deployment stage. No extra UAT label variable.

**apiVersion**
- `v1` — same contract as `SystemInfoResponse.ApiVersion`
- freshness `actual`, source `API contract v1`

**Deploy injection:** after `git reset --hard` and after sourcing `.env`, `GIT_SHA="$(git rev-parse HEAD)"; export GIT_SHA`. Compose `GIT_SHA: ${GIT_SHA:-}` on API only. No hardcoded SHA, no `.env` write.

**Index / schema:** none.

## Acceptance Criteria

1. PlatformAdmin 200; TenantAdmin/Member 403; anonymous 401
2. Valid GIT_SHA → actual full SHA
3. Missing/blank → missing_instrumentation
4. Malformed → unavailable, no fake SHA
5. Public `/system/info` and `/ready` unchanged
6. Overview + Operations additive Version UI; missing vs error distinct; no Rollback/Redeploy/SSH
7. Deploy script + compose inject SHA after reset; UAT isolation unchanged
8. Epic 44 remains in-progress; no 44 retrospective in this PR

## Tasks / Subtasks

- [x] Story + environment/SHA/apiVersion lock
- [x] Version service + endpoint
- [x] Deploy/compose injection
- [x] Overview + Operations UI
- [x] Tests + review + draft PR

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Completion Notes List

- Merged PR #430. Accepted HEAD `31da0413491080f13251165f939bee961d2e2f5a`. Main merge `4128294427fff1c062d8bf93f7e7ac6c7e0e9e0b`. Exact-head CI `38024230632` green. Post-merge main CI `38028740025` green. Deploy remains pre-existing Epic 19. Epic 44 stays in-progress. PR #431 PlatformAdmin light-only remains HOLD.

## Exclusions

Epic 44 close. Retrospective. Production/UAT deploy. DigitalOcean. Rollback/Redeploy/SSH. Public SHA. Host fingerprint. Incident. Severity changes.

## File List

- `_bmad-output/implementation-artifacts/44-9-deployment-version-health.md`
- `_bmad-output/test-artifacts/atdd-checklist-44-9-deployment-version-health.md`
- `src/Application/Platform/IPlatformOpsVersionService.cs`
- `src/Infrastructure/Platform/PlatformOpsVersionService.cs`
- `src/Contracts/Platform/PlatformKpiContracts.cs`
- `src/Api/Controllers/V1/PlatformOpsController.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `deploy/remote-deploy.sh`
- `docker-compose.uat.yml`
- `deploy/validate-uat-isolation.sh`
- `web/lib/platform-api.ts`
- `web/components/platform/platform-ops-version.tsx`
- `web/app/(platform)/platform/overview/page.tsx`
- `web/app/(platform)/platform/ops/page.tsx`
- tests: version unit/integration/authz/frontend/Playwright/deploy-contract
