---
baseline_commit: 3ddeb93
epic: 17
story: 4
---

# Story 17.4: P0 security hardening

Status: review

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
