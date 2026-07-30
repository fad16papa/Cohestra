---
baseline_commit: 019db3b
epic: 17
story: 2
---

# Story 17.2: OTP verify brute-force throttling and signup abuse tests

Status: review

## Story

As a **platform operator**,
I want **signup OTP verify brute-force protection and CI abuse coverage**,
So that **attackers cannot guess verification codes and regressions are caught before launch**.

## Acceptance Criteria

1. **Given** repeated failed OTP verify attempts for the same email (and/or client IP)  
   **When** attempts exceed configured threshold within the window  
   **Then** further verify attempts return 429 with ProblemDetails (`errorCode`: `signup_verify_rate_limited`)  
   **And** successful verify clears failure counters for that email/IP

2. **Given** integration test stack (Postgres + Redis)  
   **When** abuse tests run in CI  
   **Then** cases cover at minimum:
   - Invalid/missing CAPTCHA token → signup rejected
   - Signup IP rate limit → 429 after threshold
   - `registrationClosed=true` → signup 403
   - OTP verify brute-force → 429 after threshold

3. **Given** existing successful-signup-only IP counter (Story 14.3)  
   **When** verify throttling ships  
   **Then** verify failures count toward abuse limits independently (separate Redis keys from successful signup counters)

## Tasks / Subtasks

- [x] **Task 1 — Verify rate limiter** (AC: 1, 3)
  - [x] 1.1 Add `IPublicSignupVerifyRateLimiter` (Allow, RecordFailed, Clear)
  - [x] 1.2 Implement `RedisPublicSignupVerifyRateLimiter` with sliding-window ZSET keys `signup:verify:fail:email:{hash}` and `signup:verify:fail:ip:{hash}`
  - [x] 1.3 Add `PublicSignupVerifyRateLimitOptions` (default 10 attempts / 15 min) + appsettings section
  - [x] 1.4 Register in `DependencyInjection.cs`

- [x] **Task 2 — Service + controller wiring** (AC: 1)
  - [x] 2.1 Extend `VerifyEmailAsync` with `clientIp` parameter
  - [x] 2.2 Check rate limit at verify entry; record failed OTP; clear on success
  - [x] 2.3 Map `RateLimited` → 429 with `errorCode: signup_verify_rate_limited` in `PublicSignupController`

- [x] **Task 3 — Tests** (AC: 2)
  - [x] 3.1 Unit test: verify limiter threshold + clear
  - [x] 3.2 Integration abuse tests: captcha, signup 429, registrationClosed 403, OTP 429

- [x] **Task 4 — Docs + sprint hygiene**
  - [x] 4.1 Update enterprise launch checklist P1 OTP row
  - [x] 4.2 Mark Epic 14 retro action #3 (OTP throttling) done in sprint-status

## Dev Notes

### Independent counters (AC3)

| Counter | Redis key prefix | Trigger |
|---------|------------------|---------|
| Successful signup IP (14.3) | `signup:success:ip:{hash}:hour/day` | After 201 Created signup |
| Failed verify email/IP (17.2) | `signup:verify:fail:email:{hash}` / `signup:verify:fail:ip:{hash}` | Wrong OTP only |

Verify throttling does **not** increment successful-signup counters and vice versa.

### Failure recording scope

Only failed OTP validation (`ValidateAndConsumeAsync` returns false) increments verify failure counters. Early validation errors (malformed email, wrong slug) do not count toward brute-force limits.

## Dev Agent Record

### Agent Model Used

Cursor Composer (cloud agent — dev-story)

### Completion Notes List

- Added Redis-backed verify failure rate limiter with email + IP sliding windows.
- Wired into `SelfServeSignupService.VerifyEmailAsync` with client IP from controller.
- Public verify endpoint returns 429 + `signup_verify_rate_limited` when blocked.
- Added `PublicSignupAbuseIntegrationTests` covering all four abuse scenarios.
- Added unit test for verify rate limiter threshold and clear.

### File List

- `src/Application/Signup/IPublicSignupVerifyRateLimiter.cs`
- `src/Infrastructure/Signup/PublicSignupVerifyRateLimitOptions.cs`
- `src/Infrastructure/Signup/RedisPublicSignupVerifyRateLimiter.cs`
- `src/Application/Signup/ISelfServeSignupService.cs`
- `src/Infrastructure/Signup/SelfServeSignupService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/appsettings.json`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs`
- `src/Api.IntegrationTests/PublicSignupAbuseIntegrationTests.cs`
- `src/Infrastructure.Tests/Signup/PublicSignupVerifyRateLimiterTests.cs`
- `docs/deploy/enterprise-launch-checklist.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/17-2-otp-verify-brute-force-throttling.md`

## Change Log

- 2026-07-30: Story 17.2 implemented — OTP verify throttling + abuse integration tests; status → review
