---
epic: 18
story: 4
status: done
baseline_commit: 5ff26ba
---

# Story 18.4: Redis outage policy for rate limiters

Status: done

## Story

As a **platform operator**,
I want **predictable behavior when Redis is unavailable during rate-limit checks**,
So that **auth and signup endpoints fail consistently instead of returning ambiguous 500s**.

## Policy decision

**Fail-closed (503)** — when Redis is unreachable during a rate-limit check or mutation, throw `RateLimiterUnavailableException` and return HTTP **503** with ProblemDetails (`errorCode: rate_limiter_unavailable`). Structured warning log includes limiter name. Tradeoff: legitimate users blocked during Redis outage; abuse protection preserved.

## Acceptance Criteria

1. **Given** Redis unreachable during a rate-limit check  
   **When** signup OTP verify, auth OTP verify, or resend is called  
   **Then** behavior matches **documented policy** (fail-closed: 503 with ProblemDetails + structured log)

2. **Given** chosen policy implemented  
   **When** reviewing all Redis limiters  
   **Then** signup verify, auth OTP verify, resend (18.1), signup IP limits use consistent semantics

3. **Given** tests with mocked Redis failure  
   **When** limiter invoked  
   **Then** unit test proves documented status code and no silent skip of protection

4. **Given** `/ready` when Redis down  
   **When** health check runs  
   **Then** remains Unhealthy (unchanged)

## Tasks / Subtasks

- [x] **Task 1 — Policy decision**
  - [x] Document fail-closed vs fail-open in story (default fail-closed 503)

- [x] **Task 2 — Implementation**
  - [x] Shared helper `RedisRateLimiterOperations` for Redis fault handling
  - [x] Update verify, resend, signup, registration Redis limiters
  - [x] Map to 503 ProblemDetails via `GlobalExceptionHandler`

- [x] **Task 3 — Tests**
  - [x] Unit tests for Redis fault → `RateLimiterUnavailableException` and 503 handler
  - [x] Optional integration test (skipped — unit coverage sufficient)

## Dev Agent Record

### Completion Notes

- All six Redis rate limiters route Redis faults through `RedisRateLimiterOperations` → `RateLimiterUnavailableException`.
- `GlobalExceptionHandler` returns 503 with `rate_limiter_unavailable` error code and logs at Warning level.
- Refresh token store unchanged per story scope.
- `/ready` redis health check unchanged.
- `RedisOtpStore` (OTP send cap INCR) now uses the same fail-closed Redis fault handling — fixes raw Redis errors leaking to the verify/resend UI.
- API never returns raw exception messages to clients (including Development).
- Web client sanitizes infrastructure error text as defense in depth.

## File List

- `src/Application/RateLimiting/RateLimiterUnavailableException.cs`
- `src/Application/RateLimiting/RateLimitErrorCodes.cs`
- `src/Infrastructure/RateLimiting/RedisRateLimiterOperations.cs`
- `src/Infrastructure/Auth/RedisAuthOtpVerifyRateLimiter.cs`
- `src/Infrastructure/Auth/RedisAuthResendOtpRateLimiter.cs`
- `src/Infrastructure/Signup/RedisPublicSignupVerifyRateLimiter.cs`
- `src/Infrastructure/Signup/RedisPublicSignupResendRateLimiter.cs`
- `src/Infrastructure/Signup/RedisPublicSignupRateLimiter.cs`
- `src/Infrastructure/Registrations/RedisPublicRegistrationRateLimiter.cs`
- `src/Api/Infrastructure/GlobalExceptionHandler.cs`
- `src/Infrastructure.Tests/RateLimiting/RedisRateLimiterOperationsTests.cs`
- `src/Infrastructure/Auth/RedisOtpStore.cs`
- `web/lib/api-error-message.ts`
- `web/lib/auth-api.ts`
- `web/lib/signup/signup-api.ts`

## Change Log

- 2026-08-01: Story 18.4 — fail-closed 503 when Redis unavailable during rate-limit operations.
