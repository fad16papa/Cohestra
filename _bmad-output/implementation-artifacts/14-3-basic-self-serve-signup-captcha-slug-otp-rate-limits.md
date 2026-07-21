---
baseline_commit: 0353c97ac3cfb2838321ac943a84cf78cf64ea00
---

# Story 14.3: Basic self-serve signup (CAPTCHA, slug, OTP, rate limits)

Status: review

## Story

As a **prospect (Priya)**,
I want to **Start free on Basic without a card**,
So that **I can open a workspace and verify email before any payment**.

## Acceptance Criteria

1. **Given** `/signup` Start free  
   **When** Priya submits org name, slug, email, password with valid CAPTCHA + ToS acceptance  
   **Then** a Tenant is created with `Plan=Basic`, `BillingStatus=Free`, no Stripe customer  
   **And** she is the Tenant Admin (1 seat)  
   **And** no SitePage row is created

2. **Given** Google reCAPTCHA on signup  
   **When** token is missing/invalid  
   **Then** signup is rejected  
   **And** an accessible challenge path is available (not invisible-only)

3. **Given** slug rules (FR-1 / P10)  
   **When** slug is invalid, reserved, or colliding  
   **Then** validation fails with clear errors and collision suggestions

4. **Given** email verification  
   **When** OTP/verify is incomplete  
   **Then** dashboard access is blocked until verified

5. **Given** signup rate limits  
   **When** an IP exceeds 5 successful signups/hour or 20/day  
   **Then** further signups are rejected with a rate-limit error

6. **Given** `registrationClosed=true`  
   **When** self-serve is attempted  
   **Then** signup is disabled (Platform Admin provisioning remains)

## Tasks / Subtasks

- [x] Task 1: Marketing apex API routing (AC: 1)
  - [x] 1.1 Skip tenant requirement for `/api/v1/public/signup/*` and `/api/v1/public/legal/versions` on marketing apex
  - [x] 1.2 `SelfServeSignupService` — tenant + TenantAdmin + legal stamp; no SitePage

- [x] Task 2: CAPTCHA + slug (AC: 2, 3)
  - [x] 2.1 `ICaptchaVerifier` / Google reCAPTCHA v2 checkbox + dev/test bypass
  - [x] 2.2 `GET /api/v1/public/signup/slug-check` with collision suggestions
  - [x] 2.3 Web `RecaptchaCheckbox` + debounced slug availability

- [x] Task 3: Signup + verify flow (AC: 1, 4)
  - [x] 3.1 `POST /api/v1/public/signup` returns 201 + OTP pending
  - [x] 3.2 `POST verify-email` + `resend-otp` on signup controller
  - [x] 3.3 Web full signup form + `/signup/verify`; redirect to `{slug}.localhost` dashboard

- [x] Task 4: Rate limits + registrationClosed (AC: 5, 6)
  - [x] 4.1 Redis IP rate limiter (5/hour, 20/day successful signups)
  - [x] 4.2 `PublicSignupRateLimitMiddleware`
  - [x] 4.3 `SelfServeSignup:RegistrationClosed` config gate (403)

- [x] Task 5: Tests + verify
  - [x] 5.1 `TenantSlugAvailabilityTests`
  - [x] 5.2 `PublicSignupIntegrationTests`
  - [x] 5.3 `dotnet build` + `npm run build`

## Dev Agent Record

### Agent Model Used

Cursor Composer (cloud agent)

### Completion Notes List

- Implemented `SelfServeSignupService` with Basic tenant create, `ApplyToTenant`, Identity user + TenantAdmin membership, OTP send.
- Google reCAPTCHA v2 explicit checkbox (accessible); dev bypass via `SelfServeSignup:Recaptcha:Enabled=false` and test token.
- Slug check API with suggestions; signup IP rate limits on successful creates.
- Marketing apex public signup routes skip tenant resolution; legal versions included.
- Web: full `/signup` form, `/signup/verify`, tenant dashboard redirect.

### File List

- `src/Application/Signup/*`
- `src/Contracts/Signup/SignupContracts.cs`
- `src/Contracts/Legal/LegalContracts.cs`
- `src/Infrastructure/Signup/*`
- `src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `src/Api/Infrastructure/PublicSignupRateLimitMiddleware.cs`
- `src/Api/Program.cs`
- `src/Api/appsettings.json`
- `src/Infrastructure.Tests/Signup/TenantSlugAvailabilityTests.cs`
- `src/Api.IntegrationTests/PublicSignupIntegrationTests.cs`
- `src/Api.IntegrationTests/PublicLegalIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs`
- `web/lib/signup/signup-api.ts`
- `web/components/legal/signup-page-content.tsx`
- `web/components/legal/signup-verify-page-content.tsx`
- `web/components/legal/recaptcha-checkbox.tsx`
- `web/app/signup/page.tsx`
- `web/app/signup/verify/page.tsx`
- `_bmad-output/implementation-artifacts/14-3-basic-self-serve-signup-captcha-slug-otp-rate-limits.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-21: DS 14.3 — self-serve signup, CAPTCHA, slug check, OTP verify, rate limits; status → review.

## Ultimate context engineering tip

Story 14.3 = **wire the 14.2 legal gate into real tenant+admin creation** — apex API routing first, then signup orchestration, CAPTCHA, slug suggestions, OTP verify before dashboard. Stripe/plan checkout is Story 14.4.

### Story completion status

review — DS complete; ready for CR.
