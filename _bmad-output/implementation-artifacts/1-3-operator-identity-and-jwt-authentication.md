# Story 1.3: Operator Identity and JWT Authentication

Status: done

## Story

As an operator (Marco),
I want to sign in with email and password and receive JWT tokens,
So that I can access protected admin features securely.

## Acceptance Criteria

1. **AC-1.3.1 — Login returns JWT pair**
   - **Given** ASP.NET Core Identity is configured with a seeded operator account
   - **When** I POST valid credentials to `POST /api/v1/auth/login`
   - **Then** I receive an access token and refresh token
   - **And** refresh tokens are stored in Redis with TTL and revocation support

2. **AC-1.3.2 — Protected admin endpoints**
   - **Given** I have a valid access token
   - **When** I call an admin endpoint with `Authorization: Bearer {token}`
   - **Then** the request succeeds
   - **And** unauthenticated admin requests return 401

3. **AC-1.3.3 — Refresh without re-login**
   - **Given** my access token is expired but refresh token is valid
   - **When** I POST to `POST /api/v1/auth/refresh`
   - **Then** I receive a new access token without re-entering password

4. **AC-1.3.4 — Refresh token expiry**
   - **Given** 24 hours of inactivity per PRD assumption
   - **When** my refresh token expires
   - **Then** I must sign in again (FR-16)

## Tasks / Subtasks

- [x] **Task 1: Identity and operator seed** (AC: 1.3.1)
  - [x] Add `ApplicationUser` and Identity EF migration
  - [x] Seed `Admin` role and operator account on startup
  - [x] Use `AddIdentityCore` (API-only — no cookie redirect)

- [x] **Task 2: JWT auth endpoints** (AC: 1.3.1, 1.3.3, 1.3.4)
  - [x] `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`
  - [x] Redis refresh token store (24h TTL, consume-on-refresh rotation)

- [x] **Task 3: Protected admin route** (AC: 1.3.2)
  - [x] `GET /api/v1/admin/me` with `[Authorize(Roles = "Admin")]`
  - [x] JWT Bearer as default auth scheme; 401 for unauthenticated requests

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Identity migration `AddIdentity` applied; operator seeded as `operator@leadgenerationcrm.local`
- Access tokens expire in 15 minutes; refresh tokens stored in Redis for 24 hours
- Fixed admin 404 bug: `AddIdentity` cookie auth redirected challenges to `/Account/Login`; replaced with `AddIdentityCore` + JWT default policy
- Code review patches applied (refresh race, validation, claim fallbacks, JWT TTL guards)
- Identity lockout enabled: 5 failed attempts → 15-minute lockout per account

### File List

- `src/Infrastructure/Identity/ApplicationUser.cs`
- `src/Infrastructure/Auth/` (AuthService, JwtTokenService, RedisRefreshTokenStore, OperatorSeeder, settings)
- `src/Infrastructure/Persistence/LeadGenerationCrmDbContext.cs`
- `src/Infrastructure/Persistence/Migrations/20260617155722_AddIdentity.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Application/Auth/IAuthService.cs`
- `src/Contracts/Auth/` (LoginRequest, RefreshTokenRequest, AuthTokenResponse)
- `src/Api/Controllers/V1/AuthController.cs`
- `src/Api/Controllers/V1/AdminController.cs`
- `src/Api/Program.cs`
- `src/Api/appsettings.json`
- `src/Api/Api.http`
- `docker-compose.yml`
- `.env.example`
- `README.md`

### Change Log

- 2026-06-17: Story 1.3 implemented — Identity, JWT login/refresh, Redis refresh store, protected admin endpoint

### Review Findings

- [x] [Review][Decision] Enable Identity lockout on failed login — enabled: 5 failed attempts, 15-minute lockout

- [x] [Review][Patch] Refresh consume race allows duplicate sessions [src/Infrastructure/Auth/RedisRefreshTokenStore.cs:17-30]
- [x] [Review][Patch] Refresh token deleted before new tokens issued — failed issuance strands the session [src/Infrastructure/Auth/AuthService.cs:41-53]
- [x] [Review][Patch] Login accepts null/empty credentials without validation — can throw instead of 401 [src/Api/Controllers/V1/AuthController.cs:15-19]
- [x] [Review][Patch] Admin profile may miss JWT short claim names (`email`, `sub`) [src/Api/Controllers/V1/AdminController.cs:19-26]
- [x] [Review][Patch] JWT TTL settings not validated (zero/negative values) [src/Api/Program.cs:33-36]
- [x] [Review][Patch] Login email not trimmed — accidental whitespace causes false 401 [src/Infrastructure/Auth/AuthService.cs:19]
- [x] [Review][Patch] Auth 401 responses omit `application/problem+json` content type [src/Api/Controllers/V1/AuthController.cs:44-52]

- [x] [Review][Defer] Dev JWT/operator secrets in appsettings and compose [appsettings.json, docker-compose.yml] — deferred, acceptable for local dev with env overrides documented
- [x] [Review][Defer] No login/refresh rate limiting [AuthController] — deferred, NFR / future hardening story
- [x] [Review][Defer] No logout or revoke-all-sessions endpoint — deferred, not in Story 1.3 AC; consume-on-refresh covers rotation
- [x] [Review][Defer] Multiple concurrent refresh tokens per user — deferred, standard for MVP JWT refresh
- [x] [Review][Defer] Refresh does not re-check password/security stamp — deferred, refresh-by-design uses Redis token only
- [x] [Review][Defer] Operator seeder skips existing user (no password/role sync) [OperatorSeeder.cs:27-31] — deferred, seed-once bootstrap pattern
- [x] [Review][Defer] HTTP-only compose binding, Redis/Postgres without auth — deferred, local dev compose scope
