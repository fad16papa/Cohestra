---
epic: 18
story: 1
status: ready-for-dev
---

# Story 18.1: Resend-OTP rate limiting

Status: ready-for-dev

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

- [ ] **Task 1 — Options + DI**
  - [ ] `PublicSignupResendRateLimitOptions` + `AuthResendOtpRateLimitOptions` (or shared base with separate sections)
  - [ ] Redis limiter implementations with distinct key prefixes

- [ ] **Task 2 — Wire endpoints**
  - [ ] `PublicSignupController.ResendOtp` — check/record before send
  - [ ] `AuthController.ResendOtp` — check/record before send
  - [ ] 429 + `Retry-After` header (match 17.4 pattern)

- [ ] **Task 3 — Tests**
  - [ ] Unit tests for limiter
  - [ ] Integration test (extend `PublicSignupAbuseWebApplicationFactory` or new factory)

## Dev Notes

- Endpoints today: `PublicSignupController.cs:96`, `AuthController.cs:126`
- Reuse sliding-window / Lua patterns from `RedisPublicSignupVerifyRateLimiter` and `RedisAuthOtpVerifyRateLimiter`
- Default integration factory uses high limits; abuse factory sets low limits (Epic 17 pattern)
- Coordinate Redis outage behavior with Story 18.4 if implemented in parallel

## File List (expected)

- `src/Infrastructure/Signup/PublicSignupResendRateLimitOptions.cs` (or similar)
- `src/Infrastructure/Auth/AuthResendOtpRateLimitOptions.cs` (or similar)
- `src/Infrastructure/Signup/RedisPublicSignupResendRateLimiter.cs`
- `src/Infrastructure/Auth/RedisAuthResendOtpRateLimiter.cs`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/appsettings.json`
- Tests in `Infrastructure.Tests` + `Api.IntegrationTests`
