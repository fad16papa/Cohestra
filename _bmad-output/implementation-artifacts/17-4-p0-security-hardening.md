---
baseline_commit: 3ddeb93
epic: 17
story: 4
---

# Story 17.4: P0 security hardening

Status: done

## Story

As a **platform operator**,
I want **critical auth abuse controls and production guardrails**,
So that **operator OTP endpoints cannot be brute-forced and misconfigured production secrets fail fast at startup**.

## Acceptance Criteria

1. **Given** repeated failed OTP verify attempts on `/api/v1/auth/verify-email` or `/api/v1/auth/reset-password`  
   **When** attempts exceed configured threshold within the window  
   **Then** further attempts return 429 with ProblemDetails (`errorCode`: `otp_verify_rate_limited`)

2. **Given** a successful email verify, password reset, or authenticated password change  
   **When** the operation completes  
   **Then** all refresh tokens for that user are revoked

3. **Given** a non-Development/non-Testing environment  
   **When** the API starts  
   **Then** placeholder JWT secrets, enabled operator seed, or dev DB credentials cause startup failure

4. **Given** production-like deployment  
   **When** responses are served  
   **Then** baseline security headers are present (nginx + Next.js)  
   **And** OpenAPI is Development-only  
   **And** HtmlSanitizer is patched (≥ 9.0.892)

## Tasks / Subtasks

- [x] **Task 1 — Auth OTP rate limiting** (AC: 1)
  - [x] `IAuthOtpVerifyRateLimiter` + Redis implementation (`auth:otp:verify:fail:*`)
  - [x] Wire into `AuthService.VerifyEmailAsync` / `ResetPasswordAsync`
  - [x] Map 429 in `AuthController` with `traceId`

- [x] **Task 2 — Session invalidation** (AC: 2)
  - [x] `RevokeAllForUserAsync` on refresh token store
  - [x] Revoke on verify success, reset password, change password

- [x] **Task 3 — Production guardrails** (AC: 3, 4)
  - [x] `ProductionSecurityValidator` in `Program.cs`
  - [x] OpenAPI dev-only
  - [x] HtmlSanitizer 9.0.892
  - [x] Security headers in `deploy/nginx/app.conf` + `web/next.config.ts`

- [x] **Task 4 — Tests**
  - [x] Unit: `AuthOtpVerifyRateLimiterTests`, `ProductionSecurityValidatorTests`
  - [x] Service: verify-email rate limit in `AuthServiceMembershipGuardTests`
  - [x] Integration: `AuthOtpAbuseIntegrationTests` (reset-password brute force)

## Dev Notes

- Signup OTP throttling remains separate (Story 17.2 keys: `signup:verify:fail:*`).
- Auth OTP throttling uses `auth:otp:verify:fail:email:{hash}` and `auth:otp:verify:fail:ip:{hash}`.
- Integration verify-email brute force is covered at service layer because bootstrap-closed DB state blocks the HTTP path when operator seed exists.

## File List

- `src/Application/Auth/IAuthOtpVerifyRateLimiter.cs`
- `src/Application/Auth/AuthErrorCodes.cs`
- `src/Infrastructure/Auth/AuthOtpVerifyRateLimitOptions.cs`
- `src/Infrastructure/Auth/RedisAuthOtpVerifyRateLimiter.cs`
- `src/Infrastructure/Auth/ProductionSecurityValidator.cs`
- `src/Infrastructure/Auth/IRefreshTokenStore.cs`
- `src/Infrastructure/Auth/RedisRefreshTokenStore.cs`
- `src/Infrastructure/Auth/AuthService.cs`
- `src/Application/Auth/IAuthService.cs`
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Program.cs`
- `src/Api/appsettings.json`
- `src/Infrastructure/Infrastructure.csproj`
- `deploy/nginx/app.conf`
- `web/next.config.ts`
- `src/Infrastructure.Tests/Auth/AuthOtpVerifyRateLimiterTests.cs`
- `src/Infrastructure.Tests/Auth/ProductionSecurityValidatorTests.cs`
- `src/Infrastructure.Tests/Auth/AuthServiceMembershipGuardTests.cs`
- `src/Api.IntegrationTests/AuthOtpAbuseIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/AuthOtpAbuseWebApplicationFactory.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs`

### Review Findings

- [ ] [Review][Decision] **CSP header policy** — Adding `Content-Security-Policy` can break Next.js inline scripts/styles. Should we add a permissive starter CSP now, defer CSP to a dedicated hardening story, or skip?
- [ ] [Review][Decision] **Duplicate security headers (nginx + Next.js)** — Both layers set the same four headers; production responses may carry duplicates. Should nginx own headers in prod (remove from `next.config.ts`) or keep Next.js for local dev-without-nginx and strip nginx duplicates?
- [ ] [Review][Decision] **Redis outage during OTP verify** — `AllowVerifyAsync` throws on Redis failure → 500 on auth endpoints. Fail-open (allow verify, log warning) or fail-closed (503/429)?

- [x] [Review][Patch] Security headers missing from production HTTPS template [`deploy/nginx/app-ssl.conf.template`] — AC4 partial; only pre-TLS `app.conf` was updated
- [x] [Review][Patch] Add HSTS to HTTPS nginx template [`deploy/nginx/app-ssl.conf.template:52`]
- [x] [Review][Patch] Remove stale `/openapi/` proxy from HTTPS template [`deploy/nginx/app-ssl.conf.template:76-80`]
- [x] [Review][Patch] User-index TTL shortened by later short-TTL token — `RevokeAllForUserAsync` can miss tokens [`RedisRefreshTokenStore.cs:31`]
- [x] [Review][Patch] `ClearFailuresAsync` missing on already-confirmed verify success path [`AuthService.cs:348-354`]
- [x] [Review][Patch] `ClearFailuresAsync` missing after OTP consumed but before password reset succeeds [`AuthService.cs:485-496`]
- [x] [Review][Patch] Add `Retry-After` header on 429 responses [`AuthController.cs:TooManyRequestsProblem`]
- [x] [Review][Patch] DB credential guard uses `&&` — fail if either dev username OR password present [`ProductionSecurityValidator.cs:45-46`]
- [x] [Review][Patch] Add unit test for dev DB credential rejection [`ProductionSecurityValidatorTests.cs`]

- [x] [Review][Defer] Rate-limit check/record TOCTOU burst [`RedisAuthOtpVerifyRateLimiter.cs`] — deferred, same Lua split pattern as Story 17.2 signup limiter
- [x] [Review][Defer] Wrong-length OTP codes skip failure counter [`AuthService.cs:335`] — deferred, not brute-force exploitable
- [x] [Review][Defer] `RevokeAllForUserAsync` non-atomic read-then-delete race [`RedisRefreshTokenStore.cs:70-82`] — deferred, low-traffic auth path
- [x] [Review][Defer] Non-atomic email+IP failure record [`RedisAuthOtpVerifyRateLimiter.cs:92-97`] — deferred, mirrors signup limiter
- [x] [Review][Defer] JWT min-length in ProductionSecurityValidator [`ProductionSecurityValidator.cs`] — deferred, `Program.cs` already enforces ≥32 chars at startup
