---
id: 46.9
key: 46-9-production-security-and-tenant-isolation-hardening
title: Production security and tenant-isolation hardening
status: in-progress
epic: 46
created: 2026-10-24
baseline_commit: e962c8c3eead953a1f56f2b397b3e9d4fc669041
depends_on:
  - 46.1
owner_gate: none for the review; secret rotation if audit demands owner action
production: NO-GO
---

# Story 46.9: Production security and tenant-isolation hardening

Status: in-progress

## Story

As an **owner**,
I want **a recorded Production threat review and the holes it finds closed**,
so that **launch does not depend on UAT luck**.

## Acceptance Criteria

1. **Given** `production-security-model.md`
   **When** 46.9 completes
   **Then** each row has PASS/FAIL/PENDING with evidence
   **And** Production Redis requires a password (compose + non-UAT validator)
   **And** Production compose still publishes no 5432/6379
   **And** Production reCAPTCHA bypass is empty; apex + open signup requires enabled recaptcha
   **And** CORS origins reject localhost/loopback in non-Development
   **And** nginx CSP allows live Paddle and a live-only snippet does not require sandbox Paddle
   **And** secret audit lists names and locations, zero values in git

2. **Given** TenantIsolation
   **When** CI runs
   **Then** the SM-1 gate remains required
   **And** no new Production support query bypasses tenant filters except documented PlatformAdmin IgnoreTenantFilters

3. **Given** negative regression
   **When** tests run
   **Then** cross-tenant access is denied
   **And** tenant impersonation (JWT↔Host and `X-Tenant-Id`) is rejected
   **And** TenantAdmin is blocked from Platform Admin, including support reports
   **And** Production auth session stores fail closed on Redis outage (503)
   **And** reCAPTCHA bypass and Google test keys are rejected in Production

4. **Given** CI/CD provenance
   **When** 46.3 artifacts are re-reviewed
   **Then** Production remains `workflow_dispatch` + exact SHA + Layer A/B
   **And** GitHub Environment and branch settings are not mutated
   **And** UAT deploy isolation remains

5. **Given** this story
   **When** evidence is reviewed
   **Then** no SSH or live Production probe was performed
   **And** live URL/header/firewall checks stay PENDING
   **And** Production remains **NO-GO**

## Non-goals

- Do not edit 46.4 runtime/secrets files (`docker-compose.production.yml`, `.env.production.example`, host `.env` wiring).
- Do not edit 46.6 instrumentation/redaction (`SendGridEmailSender`, OTel SDK).
- Do not change GitHub Environment or branch protection Settings.
- Do not SSH, deploy Production, run production migrations, or dispatch Deploy Production.
- Do not enable live Paddle or charge cards (46.10).
- Do not weaken `ProductionSecurityValidator` or `PaddleCredentialGuard`.

## Tasks / Subtasks

- [x] Task 1: Evidence-based threat review matrix (AC 1, 5)
- [x] Task 2: ProductionSecurityValidator hardening — PlatformAdminSeed, CORS, recaptcha, Redis password, JWT length (AC 1, 3)
- [x] Task 3: Auth session stores fail-closed in Production (AC 3)
- [x] Task 4: CSP live-Paddle contract + tests (AC 1)
- [x] Task 5: TenantIsolation negatives + bypass allowlist (AC 2, 3)
- [x] Task 6: Secret inventory names-only + CI contracts (AC 1, 4)
- [ ] Task 7: BUILD + TEST + BMAD code review on exact HEAD

## Dev Notes

- Spine: AD-3, AD-6, AD-7, AD-14, AD-15; FR-23–27
- 46.4 owns host secret values and recaptcha enablement on compose
- 46.6 owns PII/log redaction
- 46.3 already owns Layer A/B provenance
- UAT also runs `ASPNETCORE_ENVIRONMENT=Production` — do not reject UAT CORS/Redis passwordless

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.9
- `_bmad-output/planning-artifacts/epic-46/production-security-model.md`
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md`
- `_bmad/custom/mandatory-code-review-loop.md`

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- Baseline `e962c8c3eead953a1f56f2b397b3e9d4fc669041`
- In-repo validators + unit/integration negatives added in this story
- Live Production probes: not run (prohibited)

### Completion Notes List

- Recorded PASS/FAIL/PENDING matrix on the threat model.
- Hardened ProductionSecurityValidator and Redis-backed auth stores without editing 46.4/46.6 files.
- Added TenantIsolation negatives, CSP live-only contract, secret-name inventory, and CI contracts.
- PRODUCTION=NO-GO.

### File List

- src/Application/Auth/AuthSessionStoreUnavailableException.cs
- src/Application/Auth/AuthErrorCodes.cs
- src/Infrastructure/Auth/AuthSessionStorePolicy.cs
- src/Infrastructure/Auth/ProductionSecurityValidator.cs
- src/Infrastructure/Auth/ResilientRefreshTokenStore.cs
- src/Infrastructure/Auth/ResilientAuthHandoffStore.cs
- src/Infrastructure.Tests/Auth/ProductionSecurityValidatorTests.cs
- src/Infrastructure.Tests/Auth/ResilientAuthSessionStoreTests.cs
- src/Infrastructure.Tests/RateLimiting/RedisRateLimiterOperationsTests.cs
- src/Api/Infrastructure/GlobalExceptionHandler.cs
- src/Api.IntegrationTests/TenantIsolationApiTests.cs
- src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs
- web/content-security-policy.ts
- web/lib/content-security-policy.test.ts
- deploy/nginx/production-live-csp.snippet
- deploy/validate-production-csp.sh
- deploy/tenant-filter-bypass-allowlist.txt
- deploy/validate-tenant-filter-bypass-allowlist.sh
- deploy/validate-production-secret-inventory.sh
- docs/deploy/production-secret-inventory.md
- .github/workflows/ci.yml
- _bmad-output/planning-artifacts/epic-46/production-security-model.md
- _bmad-output/implementation-artifacts/46-9-production-security-and-tenant-isolation-hardening.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-10-24 — Story 46.9 implementation: security audit, fail-closed hardening, negative tests, evidence matrix. Production NO-GO.
