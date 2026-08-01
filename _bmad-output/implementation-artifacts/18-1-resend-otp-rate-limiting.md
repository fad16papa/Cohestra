---
epic: 18
story: 1
status: review
baseline_commit: daf822ffe118e34ae13e0eb377b14f6b6b2bab20
---

# Story 18.1: Resend-OTP rate limiting

Status: review

## Story

As a **platform operator**,
I want **rate limits on OTP resend endpoints**,
So that **attackers cannot spam SendGrid or harass users via unlimited resend requests**.

## Context

Deferred from Story 17.2 CR — `POST /api/v1/public/signup/resend-otp` and `POST /api/v1/auth/resend-otp` have no rate limits. Signup verify and auth OTP verify are already throttled (17.2 / 17.4).

## Acceptance Criteria

1. **Given** repeated signup resend for the same email and/or IP  
   **When** threshold exceeded within window  
   **Then** `POST /api/v1/public/signup/resend-otp` returns 429 (`resend_otp_rate_limited`)

2. **Given** repeated auth resend for the same email and/or IP  
   **When** threshold exceeded  
   **Then** `POST /api/v1/auth/resend-otp` returns 429 with separate Redis namespace

3. **Given** integration stack up  
   **When** abuse test runs  
   **Then** signup or auth resend 429 proven (low-limit factory acceptable)

4. **Given** rate-limited resend  
   **When** response returned  
   **Then** no email enumeration leak (match existing auth/signup messaging)

## Tasks / Subtasks

- [x] **Task 1 — Options + DI**
  - [x] `PublicSignupResendRateLimitOptions` + `AuthResendOtpRateLimitOptions`
  - [x] Redis limiter implementations with distinct key prefixes (`signup:resend:*`, `auth:otp:resend:*`)

- [x] **Task 2 — Wire endpoints**
  - [x] `PublicSignupController.ResendOtp` — check/record before send
  - [x] `AuthController.ResendOtp` — check/record before send
  - [x] 429 + `Retry-After` header (match 17.4 pattern)

- [x] **Task 3 — Tests**
  - [x] Unit tests for limiters (Redis-skippable)
  - [x] Integration test `Resend_otp_returns_429_after_threshold` in `PublicSignupAbuseIntegrationTests`

## Dev Notes

- Endpoints: `PublicSignupController.cs`, `AuthController.cs`
- Default limits: 5 resends / 15 min (appsettings); abuse factory uses 3
- Auth rate-limited response uses generic message (no enumeration)

## Dev Agent Record

### Completion Notes

- Added `IPublicSignupResendRateLimiter` / `IAuthResendOtpRateLimiter` with sliding-window Redis ZSET pattern matching Epic 17 verify limiters.
- Controllers check allow → record → service; 429 includes `Retry-After` and `resend_otp_rate_limited` error code.
- Integration test extends existing `PublicSignupAbuseWebApplicationFactory` with low resend limits.
- Abuse factory raises `AuthOtp:MaxSendAttemptsPerWindow` so legacy OTP send cap (default 3) does not block resend abuse test after signup's initial send.

## File List

- `src/Application/Signup/IPublicSignupResendRateLimiter.cs`
- `src/Application/Auth/IAuthResendOtpRateLimiter.cs`
- `src/Application/Auth/AuthErrorCodes.cs`
- `src/Infrastructure/Signup/PublicSignupResendRateLimitOptions.cs`
- `src/Infrastructure/Auth/AuthResendOtpRateLimitOptions.cs`
- `src/Infrastructure/Signup/RedisPublicSignupResendRateLimiter.cs`
- `src/Infrastructure/Auth/RedisAuthResendOtpRateLimiter.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/appsettings.json`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs`
- `src/Api.IntegrationTests/Infrastructure/PublicSignupAbuseWebApplicationFactory.cs`
- `src/Api.IntegrationTests/PublicSignupAbuseIntegrationTests.cs`
- `src/Infrastructure.Tests/Auth/AuthResendOtpRateLimiterTests.cs`
- `src/Infrastructure.Tests/Signup/PublicSignupResendRateLimiterTests.cs`

## Change Log

- 2026-08-01: Story 18.1 implemented — resend OTP rate limiting for signup and auth paths.
