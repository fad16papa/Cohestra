---
id: 46.4
key: 46-4-production-runtime-config-and-secrets-isolation
title: Production runtime, config, and secrets isolation
status: review
epic: 46
created: 2026-10-24
baseline_commit: e962c8c3eead953a1f56f2b397b3e9d4fc669041
depends_on:
  - 46.1
  - 46.2
  - 46.3
owner_gate: production_host_application_secrets
owner_gate_status: PENDING — OWNER-RUN CLASSIFIED VERIFICATION NOT PERFORMED
implementation_authorized: true
cutover_authorization: GRANTED
production_release_readiness: NOT_YET_COMPLETE
production: NO-GO
---

# Story 46.4: Production runtime, config, and secrets isolation

Status: review

<!-- Ultimate context engine analysis completed — comprehensive developer guide created. -->
<!-- DONE requires Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT ACCEPTANCE → CLOSE. Code review is repeating, not one-shot. -->

## Story

As a **platform operator**,
I want **Production `.env` and compose runtime isolated from UAT**,
so that **sandbox Paddle, UAT SendGrid, and UAT JWT material cannot boot the dedicated Production API**.

**FRs:** FR-3, FR-4, FR-5, FR-7  
**Track:** A + B  
**Depends on:** 46.2, 46.3  
**Owner gate:** production host application secrets (names filled by owner on host; classified UAT-vs-Production check)  
**Rollback:** leave host powered off; do not compose-up Production

## Acceptance Criteria

1. **Dedicated Production plane is fail-closed at API start**
   **Given** Production compose (`docker-compose.production.yml`, project `cohestra-production`)
   **When** the API starts
   **Then** `ASPNETCORE_ENVIRONMENT=Production`
   **And** `Cohestra:DeploymentPlane=Production` (locked in compose, not interpolatable)
   **And** demo / load-test / operator / platform-admin seeds are false
   **And** `DEV_TENANT_SLUG` and `Tenancy:DevTenantSlug` are unset
   **And** Redis requires a password (`requirepass` + `ConnectionStrings:Redis` password option)
   **And** PostgreSQL 16 remains internal-network only (no published 5432)
   **And** Redis 7 remains internal-network only (no published 6379)
   **And** `PaddleCredentialGuard` still refuses sandbox/live mix and live Paddle on UAT hosts
   **And** dedicated Production refuses UAT public hosts as `PUBLIC_BASE_URL` even with sandbox Paddle

2. **Critical secrets fail closed**
   **Given** missing, whitespace, or placeholder values for JWT signing key, Postgres password, Redis password, SendGrid API key, or SendGrid from-email
   **When** dedicated Production validation runs
   **Then** startup throws `InvalidOperationException` naming the setting
   **And** the exception / logs / evidence do not contain secret values
   **And** development placeholders (`DEV_ONLY_CHANGE_IN_PRODUCTION`, `crm`, `ci-contract`, `changeme`, `placeholder`) are rejected

3. **CORS and public origins are Production-only**
   **Given** dedicated Production plane
   **When** CORS and `PublicWeb:BaseUrl` are validated
   **Then** only `https://cohestra.app` and `https://{label}.cohestra.app` are allowed
   **And** `uat.cohestra.app`, `*.uat.cohestra.app`, localhost, loopback, and `http://` origins are refused
   **And** tenant hosts are allowed via origin pattern (not a static localhost list)

4. **SendGrid is independently configured for Production**
   **Given** dedicated Production plane
   **When** SendGrid settings are validated
   **Then** `SendGrid:ApiKey` and `SendGrid:FromEmail` are required
   **And** `SendGrid:UseSandbox` is false
   **And** UAT-looking from hosts (`uat.*`) and placeholder keys are refused
   **And** this story does not send live mail or mutate SendGrid DNS (46.11)

5. **UAT credentials stay isolated**
   **Given** UAT `.env` / Environment `uat` versus Production host `.env` / Environment `production`
   **When** compared
   **Then** no secret values are shared
   **And** a classified check (names + 4-character suffixes only) is recorded
   **And** repository fixtures are synthetic only
   **And** owner live classified verification remains an owner gate (not claimed PASS without owner-run evidence)

6. **Owner-controlled host `.env` procedure exists; no Production `.env` is created in-repo**
   **Given** this story
   **When** the host procedure is followed later
   **Then** `.env.production.example` remains names-only
   **And** `deploy/prepare-production-host-env.sh` refuses to write `.env` inside the git worktree
   **And** no Production `.env` is committed, printed, or attached to the PR
   **And** GitHub `PROD_*` deploy secrets remain 46.3's concern (not copied into app `.env`)

7. **UAT path and later stories stay isolated**
   **Given** this story
   **When** it lands
   **Then** `.github/workflows/deploy.yml` remains Environment `uat` / `deploy-uat`
   **And** `docker-compose.uat.yml` Redis stays passwordless
   **And** TenantIsolation CI remains required and is not weakened
   **And** 46.6 telemetry instrumentation files are not edited
   **And** 46.9 security-audit artifacts are not edited
   **And** no Production compose-up, SSH, DNS, TLS, migration, live Paddle, or live SendGrid transaction occurs
   **And** Production remains **NO-GO / NOT YET COMPLETE**

## Non-goals

- Do not SSH Production or UAT.
- Do not create or populate a real Production `.env`.
- Do not `docker compose up` Production.
- Do not run EF migrations or mutate any database.
- Do not change firewall / DNS / TLS.
- Do not dispatch Deploy Production.
- Do not enable live Paddle (`Paddle:AllowLive` stays false; 46.10).
- Do not claim live UAT-vs-Production isolation without owner-run classified verification.
- Do not implement OpenTelemetry SDK / Grafana (46.6 / 46.7).
- Do not perform the independent security audit (46.9).
- Do not implement backup/restore (46.5).
- Do not treat this story as Production GO.

## Owner gates

| Gate | Who | When | Blocks |
| --- | --- | --- | --- |
| `production_host_application_secrets` | Owner on dedicated host | Before first authorized dark compose-up | Missing host `.env`; shared UAT values. **This story implements the procedure and synthetic contract only.** Live classified verification is PENDING. |
| Live classified UAT-vs-Production suffix check | Owner | After host `.env` exists | Claiming isolation proven |
| Each Production deploy approval | Owner | 46.3 Environment `production` | Unapproved deploy |
| `PRODUCTION CUTOVER: AUTHORIZED` | Owner | 46.15 | Public GO |

## Tasks / Subtasks

- [x] Task 1: Story + sprint-status + dedicated Production plane marker (AC 1, 7)
- [x] Task 2: Fail-closed ProductionSecurityValidator (seeds, DEV_TENANT_SLUG, secrets, Redis, Postgres, Paddle, CORS, SendGrid) (AC 1–4)
- [x] Task 3: Production CORS origin policy on dedicated plane (AC 3)
- [x] Task 4: Compose / env-example / launch-program contract updates (AC 1, 6, 7)
- [x] Task 5: Owner host-env procedure + classified isolation scripts with synthetic fixtures (AC 5, 6)
- [x] Task 6: Deterministic validators + CI + unit tests; UAT / TenantIsolation freeze (AC 2, 5, 7)
- [ ] Task 7: Exact-HEAD BMAD code review PASS (BLOCKER=0, MAJOR=0)

### Review Follow-ups (AI)

- [x] [AI-Review][BLOCKER] Limit PlatformAdminSeed reject to dedicated Production plane (UAT one-shot)
- [x] [AI-Review][MAJOR] Require classified names on both inventories
- [x] [AI-Review][MAJOR] Scan all Redis endpoints for loopback
- [x] [AI-Review][MAJOR] Apex-only PUBLIC_BASE_URL + tighter host `--check-names`
- [x] [AI-Review][MAJOR] Do not treat tenant hosts as Production public base URL
- [x] [AI-Review][BLOCKER] Clear leftover appsettings CORS localhost slots in Production compose

## Dev Notes

- Spine: AD-3 compose project, AD-5 OPTION A Postgres 16, AD-9 no secrets in logs, AD-12 Paddle/SendGrid independence, AD-13 NO-GO, AD-15 Redis password.
- UAT continues to run `ASPNETCORE_ENVIRONMENT=Production` with sandbox Paddle. Distinguish the **dedicated Production plane** with locked `Cohestra__DeploymentPlane=Production`. Do not break UAT by applying Redis-password / DEV_TENANT_SLUG / apex-only CORS rules to every Production environment name.
- Reuse `PaddleCredentialGuard`. Do not weaken it.
- Reuse `SendGridSettingsValidator.ValidateForProduction` and add dedicated-plane extras.
- Cross-story: 46.6 owns telemetry SDK; 46.9 owns the security audit; 46.11 owns live SendGrid DNS. Record dependency only — do not edit those owned artifacts.
- Synthetic secrets only in tests and fixtures.

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.4
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/epic-46/production-security-model.md`
- `_bmad-output/planning-artifacts/epic-46/story-dependency-graph.md`
- `docker-compose.production.yml`
- `.env.production.example`
- `deploy/production-compose.sh`
- `src/Infrastructure/Auth/ProductionSecurityValidator.cs`
- `src/Infrastructure/Billing/PaddleCredentialGuard.cs`

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- `dotnet test` Infrastructure.Tests filter ProductionSecurityValidator / ProductionCorsOrigins / SendGridSettingsValidator / PaddleCredentialGuard — 89 passed after review fixes
- `dotnet test Cohestra.sln --filter Category!=Integration` — 1289 passed / 10 skipped
- `dotnet test --filter Category=TenantIsolation` — 9 passed
- `bash deploy/validate-production-runtime-secrets.test.sh` — PASS
- `bash deploy/validate-production-compose.sh` — 67/0 PASS
- `bash deploy/validate-uat-isolation.sh` — 56/0 PASS
- No Production `.env` created. No compose-up. No SSH.

### Completion Notes List

- Dedicated Production plane is `Cohestra__DeploymentPlane=Production` (compose-locked). UAT may still use `ASPNETCORE_ENVIRONMENT=Production` without this marker.
- API start fail-closes missing/placeholder JWT, Postgres, Redis, and SendGrid secrets; seeds; `DEV_TENANT_SLUG`; UAT/localhost/http CORS and public URLs; shared-host flag; recaptcha test bypass.
- `PaddleCredentialGuard` is unchanged. Compose still locks sandbox / AllowLive=false.
- Owner host `.env` procedure and classified suffix comparison are in-repo. Live owner classified verification is PENDING. Synthetic fixtures only.
- 46.6 telemetry and 46.9 audit artifacts were not edited.
- PRODUCTION=NO-GO. Owner secret gate pending.

### File List

- src/Infrastructure/Auth/DeploymentPlane.cs
- src/Infrastructure/Auth/SecretPlaceholders.cs
- src/Infrastructure/Auth/ProductionCorsOrigins.cs
- src/Infrastructure/Auth/ProductionSecurityValidator.cs
- src/Infrastructure/Email/SendGridSettings.cs
- src/Infrastructure/DependencyInjection.cs
- src/Api/Program.cs
- src/Infrastructure.Tests/Auth/ProductionSecurityValidatorTests.cs
- src/Infrastructure.Tests/Auth/ProductionCorsOriginsTests.cs
- src/Infrastructure.Tests/Email/SendGridSettingsValidatorTests.cs
- docker-compose.production.yml
- .env.production.example
- deploy/validate-production-compose.sh
- deploy/validate-production-runtime-secrets.sh
- deploy/validate-production-runtime-secrets.test.sh
- deploy/compare-classified-secrets.sh
- deploy/compare-classified-secrets.test.sh
- deploy/prepare-production-host-env.sh
- deploy/prepare-production-host-env.test.sh
- deploy/fixtures/46-4/classified-uat.synthetic.txt
- deploy/fixtures/46-4/classified-production.synthetic.txt
- deploy/fixtures/46-4/classified-shared.synthetic.txt
- docs/deploy/production-runtime-secrets.md
- docs/deploy/production-launch-program.md
- .github/workflows/ci.yml
- _bmad-output/implementation-artifacts/46-4-production-runtime-config-and-secrets-isolation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/evidence/46-4/code-review-1.md
- _bmad-output/implementation-artifacts/evidence/46-4/product-acceptance.md

### Change Log

- 2026-10-24: Implemented repository-side Story 46.4 fail-closed Production runtime, CORS, Redis auth, SendGrid independence, and owner-controlled classified secret isolation. Live owner secret gate pending. Production NO-GO.
- 2026-10-24: Addressed code review findings — 5 items resolved (1 BLOCKER, 4 MAJOR). UAT PlatformAdmin one-shot preserved. Classified compare requires names. Redis loopback scans all endpoints. PUBLIC_BASE_URL is apex-only.

## Senior Developer Review (AI)

**Review 1 HEAD:** `5bca15f0` — Changes Requested (1 BLOCKER, 4 MAJOR). Patched.

**Review 2:** required on the successor HEAD after this patch commit. Story cannot close until that review is BLOCKER=0 / MAJOR=0.

### Action Items

- [x] Limit PlatformAdminSeed reject to dedicated Production plane
- [x] Required classified names
- [x] Redis multi-endpoint loopback
- [x] Host `--check-names` apex + sender
- [x] Apex-only Production public base URL
