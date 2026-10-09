---
id: 44.1
key: 44-1-platform-ops-http-gates-policy-recovery-rate-limits
title: Platform ops HTTP gates, policy coverage, and recovery rate limits
status: review
epic: 44
created: 2026-10-09
baseline_commit: c52873414479f2188a8682ee549c55ae2295a06b
---

# Story 44.1: Platform ops HTTP gates, policy coverage, and recovery rate limits

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE. Code review is repeating, not one-shot.

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a **PlatformAdmin**,
I want **existing ops and recovery APIs proven authorized, integration-tested, and rate-limited**,
so that **the console we already shipped cannot be abused before we add more production-support surface**.

## Acceptance Criteria

1. **Given** the Platform ops controller is deployed
   **When** `TenantAuthControllerPolicyTests` runs
   **Then** `PlatformOpsController` is included in the PlatformAdminOnly allow-list with Tenants, Support, Reports, and Me
   **And** no platform controller uses Identity role names as the gate

2. **Given** a PlatformAdmin session
   **When** the client calls `GET /api/v1/platform/search`, `GET .../tenants/{id}/snapshot`, `GET .../members`, `GET .../open-issues`, and recovery POSTs for a member of that tenant
   **Then** integration tests assert 200/409 as specified by current Epic 28 behavior (unverified member password-reset 409; remaining routes 200)
   **And** snapshot/search/members/open-issues responses match existing contracts

3. **Given** a TenantAdmin or TenantMember JWT
   **When** those same platform ops routes are called
   **Then** the response is 403
   **And** tests are tagged `TenantIsolation`

4. **Given** a PlatformAdmin who exceeds the recovery rate limit
   **When** they POST password-reset or resend-email-verification
   **Then** the API returns 429 with ProblemDetails
   **And** Redis-backed limiter uses `RedisRateLimiterOperations`
   **And** if Redis is unavailable the API returns 503 (`RateLimiterUnavailableException`) rather than sending mail

5. **Given** this story
   **When** implementation is reviewed
   **Then** no Overview, Operations, Audits, outbox, Paddle disposition, severity, or version features are added
   **And** no impersonation, SQL, webhook replay, or outbox requeue exists

## Tasks / Subtasks

- [x] Task 1: Authorization-policy coverage (AC: #1, FR-44-1)
  - [x] Add `typeof(PlatformOpsController)` to `Platform_controllers_use_PlatformAdminOnly_policy`
  - [x] Keep the existing Identity-role leftover scan — do not introduce `Roles=PlatformAdmin`
- [x] Task 2: ATDD HTTP + TenantIsolation coverage (AC: #2, #3, FR-44-3, NFR-44-9)
  - [x] PlatformAdmin HTTP: search, snapshot, members, open-issues 200; recovery 200/409 as Epic 28
  - [x] Assert existing DTO contracts (no new fields required; do not rename)
  - [x] TenantAdmin + TenantMember 403 on the same routes, `Category=TenantIsolation`
- [x] Task 3: Redis per-actor recovery limiter (AC: #4, FR-44-2, AD-17, NFR-44-8)
  - [x] `IPlatformRecoveryRateLimiter` + `RedisPlatformRecoveryRateLimiter` via `RedisRateLimiterOperations`
  - [x] Shared sliding window across both recovery POSTs, key per PlatformAdmin actor
  - [x] Config `PlatformRecoveryRateLimit` (default 5 / 15 minutes)
  - [x] Consume **before** service/email/audit; 429 ProblemDetails + `platform_recovery_rate_limited`
  - [x] Redis fault → `RateLimiterUnavailableException` → existing 503 handler; no email
- [x] Task 4: Limiter unit + 429/503 HTTP tests (AC: #4, TEA P0-04)
  - [x] Unit: allow until threshold, then deny; shared bucket across both action types
  - [x] HTTP: 429 after limit; 503 when limiter unavailable; FakeEmailSender count unchanged
- [x] Task 5: Build, unit, integration, TenantIsolation; no 44.2–44.9 files
- [x] Task 6: Story record + sprint status → review after tests pass

## Dev Notes

### Mandatory Code Review Loop

This story is not DONE until the **final HEAD** passes IMPLEMENT → BUILD → TEST → repeating `bmad-code-review` (no unresolved BLOCKER/MAJOR) → product acceptance. Do not mark done from implementation alone.

### Scope lock — do not implement

Stories 44.2–44.9. No Overview/Operations/Audits/Paddle disposition/outbox/severity/version screens or APIs. Do not change billing processing, payment states, webhook semantics, anonymous `/ready`, production credentials, or deploy infra. No impersonation, SQL console, webhook replay, or outbox requeue.

### Current code (read before editing)

- `src/Api/Controllers/V1/PlatformOpsController.cs` — class-level `[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]`. Recovery POSTs parse actor then call `IPlatformTenantOpsService`. **No limiter today.**
- `src/Infrastructure/Platform/PlatformTenantOpsService.cs`
  - Password reset: member missing → 404; `!EmailConfirmed` → 409 `"This member must verify their email before a password reset can be sent."`; else `ForgotPasswordAsync` + audit `PasswordResetSent`; response `"If an account exists, a reset code was sent."`
  - Resend verify: missing → 404; `EmailConfirmed` → 409 `"This email is already verified."`; else `ResendOtpAsync` + audit `EmailVerificationResent`
- `src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs` — Platform list is Me, Tenants, Support, Reports. **Ops missing.**
- `src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs` — TenantIsolation 403 only on `GET /api/v1/platform/tenants`.
- Reuse limiter: `RedisRateLimiterOperations` + Lua ZSET sliding window (`RedisSupportSubmissionRateLimiter` / `RedisPublicRegistrationRateLimiter`). Fail-closed via `RateLimiterUnavailableException` → `GlobalExceptionHandler` 503 + `rate_limiter_unavailable`.
- 429 convention: controller returns ProblemDetails (`SupportIssuesController.RateLimitedProblem`, `AuthController.TooManyRequestsProblem`) with `errorCode`.
- DI: `src/Infrastructure/DependencyInjection.cs` `Configure<>` + `AddSingleton<I*RateLimiter, Redis*>`.
- Tests: `IntegrationTestHelpers.LoginAsPlatformAdminAsync`, `CreateTenantMemberUserAsync`, `MintTenantAccessToken`, `FakeEmailSender`. Raise default test limit to 1000 like other limiters. Dedicated factory for low recovery limits. Unique PlatformAdmin actor (new user + `CreateAccessToken(user, [PlatformAdmin])`) so Redis keys do not collide with the seeded admin.

### Implementation contract

1. **Interface** `src/Application/Platform/IPlatformRecoveryRateLimiter.cs`

```csharp
Task<bool> TryConsumeAsync(Guid actorUserId, CancellationToken cancellationToken = default);
```

Atomic reserve (Lua ZADD if under limit). `false` = over limit. Redis fault throws `RateLimiterUnavailableException`. `MaxActionsPerWindow <= 0` or `WindowMinutes <= 0` → allow (disabled).

2. **Options** `src/Infrastructure/Platform/PlatformRecoveryRateLimitOptions.cs`

- Section: `PlatformRecoveryRateLimit`
- `MaxActionsPerWindow` default **5**
- `WindowMinutes` default **15** (clamp 1–1440)

3. **Redis limiter** `src/Infrastructure/Platform/RedisPlatformRecoveryRateLimiter.cs`

- `LimiterName = "PlatformRecovery"`
- Key: `platform:recovery:actor:{HashIdentifier(actorUserId:D)}` using `RedisPublicRegistrationRateLimiter.HashIdentifier`
- Shared bucket for both POSTs
- Reuse Support/Registration Lua (ZREMRANGEBYSCORE / ZCARD / ZADD / PEXPIRE)

4. **Controller** — inject limiter + `IOptions<PlatformRecoveryRateLimitOptions>`. After `TryGetActor`, `TryConsumeAsync`. Deny → 429 ProblemDetails:

- Title: `Too many recovery requests`
- Detail: generic window copy only — **no email, member id, tenant id, or existence leak**
- `errorCode`: `platform_recovery_rate_limited` (add on `RateLimitErrorCodes`)
- Content-Type `application/problem+json`
- Do not call the ops service (no eligibility, email, or audit)

5. **Preserve** Epic 28 response bodies, status mapping, audit actions, and eligibility. Do not change `ForgotPasswordAsync` / `ResendOtpAsync`.

6. **appsettings.json** add:

```json
"PlatformRecoveryRateLimit": {
  "MaxActionsPerWindow": 5,
  "WindowMinutes": 15
}
```

7. **IntegrationTestWebApplicationFactory** set `PlatformRecoveryRateLimit:MaxActionsPerWindow` = `1000`.

### Tests required (TEA P0-01–P0-04)

| ID | Kind | Assert |
| --- | --- | --- |
| P0-01 | unit | `PlatformOpsController` in PlatformAdminOnly list; no Identity role gates |
| P0-02 | HTTP Integration | PlatformAdmin search/snapshot/members/open-issues 200; reset unverified 409; reset verified 200; resend unverified 200; resend verified 409; contracts unchanged |
| P0-03 | TenantIsolation | TenantAdmin + TenantMember 403 on those routes |
| P0-04 | unit + HTTP | limiter denies after N; shared across both POSTs; HTTP 429 + errorCode; HTTP 503 when limiter throws `RateLimiterUnavailableException`; FakeEmailSender unchanged on 429/503 |

No Playwright. No frontend.

### Architecture compliance

- AD-12: same plane; existing `PlatformOpsController`; `PlatformAdminOnly`
- AD-17: Redis ops + fail-closed 503; per PlatformAdmin actor
- AD-7 / AD-3: no `tenant_id` on platform JWT; tenant JWT 403
- AD-10 / NFR-44-9: TenantIsolation on tenant-JWT denial
- AD-14 / AD-18: do not touch `/ready`, billing, outbox execution
- Config name locked: `PlatformRecoveryRateLimit`
- Errors: ProblemDetails + existing 401/403/404/409 + new 429 + existing 503 mapper

### Library / framework

- .NET 9 / existing StackExchange.Redis / xUnit + `SkippableFact`
- No new NuGet packages. No Moq — use real Redis for limiter unit tests (`RedisTestConnection`) and a throwing stub `IPlatformRecoveryRateLimiter` for HTTP 503.

### File structure

```
src/Application/Platform/IPlatformRecoveryRateLimiter.cs          NEW
src/Application/RateLimiting/RateLimitErrorCodes.cs              UPDATE
src/Infrastructure/Platform/PlatformRecoveryRateLimitOptions.cs  NEW
src/Infrastructure/Platform/RedisPlatformRecoveryRateLimiter.cs  NEW
src/Infrastructure/DependencyInjection.cs                        UPDATE
src/Api/Controllers/V1/PlatformOpsController.cs                  UPDATE
src/Api/appsettings.json                                         UPDATE
src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs UPDATE
src/Infrastructure.Tests/Platform/RedisPlatformRecoveryRateLimiterTests.cs NEW
src/Api.IntegrationTests/PlatformOpsHttpIntegrationTests.cs      NEW
src/Api.IntegrationTests/PlatformOpsRecoveryRateLimitIntegrationTests.cs NEW
src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs          UPDATE
src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs UPDATE
src/Api.IntegrationTests/Infrastructure/FakeEmailSender.cs       UPDATE (record sent)
src/Api.IntegrationTests/Infrastructure/PlatformRecoveryRateLimitWebApplicationFactory.cs NEW
src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs UPDATE (platform mint helper if needed)
```

Do **not** add files under `web/`, billing, outbox, or `Program.cs` `/ready`.

### Testing standards

- Unit: `dotnet test Cohestra.sln --filter "Category!=Integration"`
- Integration: fresh `cohestra_test`, `CI=true`, Postgres + Redis
- Tag new 403 ops cases `TenantIsolation` (class already tagged — add methods there or new class with both traits)
- Never weaken production behavior to make tests green
- Do not mark unexecuted tests as passed

### Previous story intelligence

First story in Epic 44. Planning merged on `c52873414479f2188a8682ee549c55ae2295a06b` (PR #411). No prior 44.x implementation. Epic 28 ops + Epic 18.4 fail-closed limiter are the patterns to extend.

### Git intelligence

Base: `origin/main` @ `c52873414479f2188a8682ee549c55ae2295a06b`. Post-merge CI success; Deploy failure is pre-existing Epic 19 droplet and is not this story's gate.

### Latest tech information

Reuse existing Redis Lua sliding-window + `RedisRateLimiterOperations` fail-closed wrap. Do not introduce ASP.NET `Microsoft.AspNetCore.RateLimiting` middleware or a second Redis client.

### Project context reference

[Source: `_bmad-output/project-context.md`] brownfield extend; ProblemDetails; DTOs in Contracts only; TenantIsolation on tenantId/platform gates; Redis fail-closed 503.

[Source: `_bmad-output/planning-artifacts/epics-platform-production-support.md` Story 44.1 / FR-44-1, FR-44-2, FR-44-3, FR-44-17, FR-44-18]

[Source: `_bmad-output/planning-artifacts/architecture/architecture-epic-44-platform-production-support/ARCHITECTURE-SPINE.md` AD-12, AD-17]

[Source: `_bmad-output/planning-artifacts/test-design-epic-44-platform-production-support.md` P0-01–P0-04]

[Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

First integration pass skipped when `/ready` was not yet healthy after a same-shell DROP DATABASE. Re-run against migrated `cohestra_test` + `127.0.0.1` passed. Full Integration category 156/157; the AuthOtpAbuse 429 leftover-Redis failure cleared after `FLUSHDB` (pre-existing shared-key flake, not 44.1).

CI HEAD `06ebdd0b` skipped 429/503 (and 146 collection tests) because dedicated recovery hosts started in parallel with the shared fixture and raced Identity `RoleNameIndex` seed. Factory startup is now serialized; seed-race skip reasons fail the recovery tests instead of skipping.

### Completion Notes List

- Policy list includes `PlatformOpsController`; leftover Identity-role scan unchanged.
- Epic 28 HTTP contracts covered; TenantAdmin/Member 403s added on ops routes under TenantIsolation.
- Recovery POSTs consume a shared Redis actor bucket before service/email/audit.
- 429 ProblemDetails `platform_recovery_rate_limited`; 503 via existing `RateLimiterUnavailableException` handler.
- No 44.2–44.9 files. No `/ready`, billing, outbox, or web UI changes.

### File List

- `_bmad-output/implementation-artifacts/44-1-platform-ops-http-gates-policy-recovery-rate-limits.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/test-artifacts/atdd-checklist-44-1-platform-ops-http-gates-policy-recovery-rate-limits.md`
- `_bmad-output/test-artifacts/traceability/44-1-platform-ops-http-gates-policy-recovery-rate-limits.md`
- `_bmad-output/test-artifacts/nfr-assessment-44-1-2026-10-09.md`
- `_bmad-output/implementation-artifacts/44-1-code-review-2026-10-09.md`
- `src/Application/Platform/IPlatformRecoveryRateLimiter.cs`
- `src/Application/RateLimiting/RateLimitErrorCodes.cs`
- `src/Infrastructure/Platform/PlatformRecoveryRateLimitOptions.cs`
- `src/Infrastructure/Platform/RedisPlatformRecoveryRateLimiter.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/PlatformOpsController.cs`
- `src/Api/appsettings.json`
- `src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs`
- `src/Infrastructure.Tests/Platform/RedisPlatformRecoveryRateLimiterTests.cs`
- `src/Api.IntegrationTests/PlatformOpsHttpIntegrationTests.cs`
- `src/Api.IntegrationTests/PlatformOpsRecoveryRateLimitIntegrationTests.cs`
- `src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/FakeEmailSender.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs`
- `src/Api.IntegrationTests/Infrastructure/PlatformRecoveryRateLimitWebApplicationFactory.cs`

## Change Log

- 2026-10-09: Story context created from Epic 44 + spine AD-17 + TEA P0-01–P0-04.
- 2026-10-09: Implemented policy coverage, Epic 28 HTTP + TenantIsolation tests, Redis recovery limiter (429/503).
