---
baseline_commit: 84b22b6
---

# Story 3.2: Public Registration Rate Limiting and Idempotency

Status: done

## Story

As the platform,
I want rate limiting and idempotent registration submits,
So that public forms are protected from abuse and duplicate submits.

## Acceptance Criteria

1. **AC-3.2.1 — Rate limiting (NFR-6)**
   - **Given** Redis rate limiter is configured
   - **When** excessive POSTs arrive from one IP to public registration endpoint
   - **Then** requests are throttled

2. **AC-3.2.2 — Idempotent retries**
   - **Given** a valid `Idempotency-Key` header on retry
   - **When** the same submission is POSTed again
   - **Then** the API returns the original result without duplicate Registration

## Tasks / Subtasks

- [x] **Task 1: Redis sliding-window rate limiter** (AC: 3.2.1)
  - [x] `RedisPublicRegistrationRateLimiter` — per-IP sliding window via Redis sorted set + Lua
  - [x] `PublicRegistrationRateLimitMiddleware` on `POST /api/v1/public/registrations`
  - [x] `429 Too Many Requests` with ProblemDetails
  - [x] Configurable `PublicRegistrationRateLimit` (default 10 req / 60s)

- [x] **Task 2: Idempotency store** (AC: 3.2.2)
  - [x] `RedisRegistrationIdempotencyStore` — cache successful results + lock during processing
  - [x] Request fingerprint detects key reuse with different payload (`409 Conflict`)
  - [x] `RegistrationService` replays cached `201` without duplicate DB write

- [x] **Task 3: API + contract + web** (AC: all)
  - [x] Controller accepts optional `Idempotency-Key` header
  - [x] Updated `docs/contracts/public-registration-v1.md`
  - [x] Web client sends `Idempotency-Key` per submit
  - [x] `Api.http` exercises submit + idempotent replay

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build` succeeds

## Dev Notes

- Rate limit keyed by client IP (`X-Forwarded-For` first hop when present)
- Idempotency result TTL defaults to 24 hours; lock TTL 60 seconds
- Story 3.3 continues with E.164 dedup and merge-suspect handling

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Sliding-window Redis rate limiter protects public registration POST (429 on exceed)
- Optional Idempotency-Key replays cached 201 response; conflicting payload returns 409
- Web generates UUID idempotency key on each submit attempt

### File List

- `src/Application/Registrations/IPublicRegistrationRateLimiter.cs`
- `src/Application/Registrations/IRegistrationIdempotencyStore.cs`
- `src/Application/Registrations/IRegistrationService.cs`
- `src/Application/Registrations/PublicRegistrationSubmitResult.cs`
- `src/Infrastructure/Registrations/PublicRegistrationRateLimitOptions.cs`
- `src/Infrastructure/Registrations/RegistrationIdempotencyOptions.cs`
- `src/Infrastructure/Registrations/RedisPublicRegistrationRateLimiter.cs`
- `src/Infrastructure/Registrations/RedisRegistrationIdempotencyStore.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Infrastructure/PublicRegistrationRateLimitMiddleware.cs`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `src/Api/Program.cs`
- `src/Api/appsettings.json`
- `src/Api/Api.http`
- `docs/contracts/public-registration-v1.md`
- `web/lib/public-registration-api.ts`

### Change Log

- 2026-06-16: Story 3.2 implemented — Redis rate limiting and registration idempotency

### Review Findings

- [x] [Review][Patch] Form retry generates a new `Idempotency-Key` after failed submit, bypassing dedup [`web/lib/public-registration-api.ts:99`, `registration-form.tsx:91`]
- [x] [Review][Patch] `StoreAsync` has no retry — Redis failure after DB commit allows duplicate registration on retry [`RegistrationService.cs:99`]
- [x] [Review][Patch] Rate limit middleware uses exact path match — trailing slash may bypass limiter [`PublicRegistrationRateLimitMiddleware.cs:15`]
- [x] [Review][Defer] All clients with unknown IP share one rate-limit bucket [`PublicRegistrationRateLimitMiddleware.cs:62`] — deferred, edge case behind missing RemoteIpAddress
- [x] [Review][Defer] `X-Forwarded-For` trusted without ForwardedHeaders middleware [`PublicRegistrationRateLimitMiddleware.cs:50`] — deferred, production proxy hardening
- [x] [Review][Defer] Idempotent replays still consume rate-limit quota — deferred, acceptable for MVP
- [x] [Review][Defer] No integration tests for rate limit / idempotency paths — deferred, no test project yet

### Re-review patches (2026-06-16)

- Patch: `RegistrationForm` reuses `idempotencyKeyRef` until submit succeeds
- Patch: `StoreIdempotencyResultWithRetryAsync` retries Redis cache write up to 3 times
- Patch: rate limit middleware normalizes trailing slash on registration path

### Re-review (2026-06-16, pass 3)

✅ Clean review — all layers passed. Pass 2 patches verified; no new patch or decision-needed findings. Deferred items unchanged (Story 3.2/3.3 scope).

Verified:
- Form retries reuse the same `Idempotency-Key` until success; validation failures without cache still allow corrected resubmit
- Redis result cache write retries before returning success
- Rate limiter applies to trailing-slash registration path variants
