---
epic: 18
story: 4
status: ready-for-dev
---

# Story 18.4: Redis outage policy for rate limiters

Status: ready-for-dev

## Story

As a **platform operator**,
I want **predictable behavior when Redis is unavailable during rate-limit checks**,
So that **auth and signup endpoints fail consistently instead of returning ambiguous 500s**.

## Context

Story 17.4 CR decision item — `AllowVerifyAsync` throws on Redis failure → 500. Applies to signup verify, auth OTP verify, and future resend limiters (18.1).

## Acceptance Criteria

1. **Given** Redis unreachable during a rate-limit check  
   **When** signup OTP verify, auth OTP verify, or resend is called  
   **Then** behavior matches **documented policy** (recommend **fail-closed**: 503 with ProblemDetails + structured log; alternative fail-open requires explicit product sign-off in story)

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

- [ ] **Task 1 — Policy decision**
  - [ ] Document fail-closed vs fail-open in story (default fail-closed 503)
  - [ ] PM/operator ack if fail-open chosen

- [ ] **Task 2 — Implementation**
  - [ ] Shared helper or interface extension for Redis fault handling
  - [ ] Update `RedisPublicSignupVerifyRateLimiter`, `RedisAuthOtpVerifyRateLimiter`, resend limiters (18.1)
  - [ ] Map to ProblemDetails in controllers/services

- [ ] **Task 3 — Tests**
  - [ ] Unit tests with `IConnectionMultiplexer` mock throwing
  - [ ] Optional integration test if feasible

## Dev Notes

- Fail-open increases abuse risk during Redis outages; fail-closed blocks legitimate users — document tradeoff
- Do not change Redis refresh token store behavior in this story unless same policy applies
- `/ready` already tags redis check — ops uses that for routing

## File List (expected)

- `src/Infrastructure/Signup/RedisPublicSignupVerifyRateLimiter.cs`
- `src/Infrastructure/Auth/RedisAuthOtpVerifyRateLimiter.cs`
- Resend limiters from 18.1
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `Infrastructure.Tests` limiter tests
