---
baseline_commit: 84b22b6
---

# Story 3.1: Client Entity and Registration Ingestion API

Status: done

## Story

As a participant,
I want to submit a registration form successfully,
So that I am registered for the activity without creating an account.

## Acceptance Criteria

1. **AC-3.1.1 — Registration persistence (FR-4, NFR-8)**
   - **Given** a published Activity with valid form schema
   - **When** I POST registration answers to the public API
   - **Then** a Registration record is created linked to the Activity with immutable JSONB answers

2. **AC-3.1.2 — Client create or update (FR-5)**
   - **And** a Client record is created or updated from extracted master fields

3. **AC-3.1.3 — Reliability (NFR-4, SM-1)**
   - **And** response completes synchronously within 60 seconds (201 Created)

## Tasks / Subtasks

- [x] **Task 1: Domain + persistence** (AC: 3.1.1, 3.1.2)
  - [x] `Client` entity with normalized contact fields and `LeadStatus`
  - [x] `Registration` entity with immutable JSONB `answers`
  - [x] EF configurations + migration `AddClientsAndRegistrations`

- [x] **Task 2: Ingestion service** (AC: 3.1.1, 3.1.2, 3.1.3)
  - [x] `IRegistrationService` / `RegistrationService`
  - [x] Answer validation against activity form schema
  - [x] Basic client match by normalized phone or email (full dedup in Story 3.3)

- [x] **Task 3: API + contract** (AC: all)
  - [x] Replace stub 202 with 201 Created + `registrationId` / `clientId`
  - [x] Update `docs/contracts/public-registration-v1.md`
  - [x] Web client accepts 201 Created

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build` succeeds

## Dev Notes

- Story 3.2 adds rate limiting and idempotency; Story 3.3 adds E.164 dedup matrix and merge-suspect
- Client profile extraction maps typed form fields (phone, email, text name, consent, referral_source) to master columns
- Publish gate still requires at least one required phone or email field before go-live

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Public registration POST now persists immutable registration answers and upserts client by normalized phone/email
- Contract v1 extended with 201 Created response shape; web accepts 201 or 202 during transition
- Basic contact normalization (trim, lowercase email, digit/+ phone) — E.164 defaults deferred to Story 3.3

### File List

- `src/Domain/Clients/LeadStatus.cs`
- `src/Domain/Clients/Client.cs`
- `src/Domain/Registrations/Registration.cs`
- `src/Application/Registrations/IRegistrationService.cs`
- `src/Application/Registrations/PublicRegistrationSubmitResult.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Registrations/ClientContactNormalizer.cs`
- `src/Infrastructure/Registrations/RegistrationAnswersJson.cs`
- `src/Infrastructure/Persistence/Configurations/ClientConfiguration.cs`
- `src/Infrastructure/Persistence/Configurations/RegistrationConfiguration.cs`
- `src/Infrastructure/Persistence/LeadGenerationCrmDbContext.cs`
- `src/Infrastructure/Persistence/Migrations/*AddClientsAndRegistrations*`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Contracts/Registrations/SubmitPublicRegistrationRequest.cs`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `docs/contracts/public-registration-v1.md`
- `web/lib/public-registration-api.ts`

### Change Log

- 2026-06-16: Story 3.1 implemented — client entity, registration ingestion, 201 Created contract

### Review Findings

- [x] [Review][Patch] `Created()` Location URL points to non-existent GET endpoint [`src/Api/Controllers/V1/PublicRegistrationsController.cs:74`]
- [x] [Review][Patch] Client may persist with empty `FullName` when schema has required phone/email but no name text field [`src/Infrastructure/Registrations/RegistrationService.cs:90`, `ClientProfileExtractor.cs:107`]
- [x] [Review][Defer] Concurrent submits can create duplicate clients — no unique constraint on normalized contact [`RegistrationService.cs:61`] — deferred, Story 3.3 dedup + DB constraints
- [x] [Review][Defer] Phone-match update can overwrite email without merge-suspect flag [`RegistrationService.cs:112`] — deferred, Story 3.3 FR-6
- [x] [Review][Defer] No integration tests for registration ingestion path — deferred, no test project yet
- [x] [Review][Defer] Web still accepts HTTP 202 for backward compat [`web/lib/public-registration-api.ts:112`] — deferred, remove after stub fully retired

### Re-review patches (2026-06-16)

- Patch: return `201` via `StatusCode` without bogus `Location` header
- Patch: `ClientProfileExtractor.ResolveFullName` falls back to email then phone when no name field captured

### Re-review (2026-06-16, pass 2)

- [x] [Review][Patch] `ApplyProfile` overwrites existing client name with email/phone fallback on re-registration [`RegistrationService.cs:112`, `ClientProfileExtractor.cs:108`]

Verified resolved from pass 1:
- Bogus `Location` header — fixed (`StatusCode(201, …)`)
- Empty `FullName` on create — fixed (`ResolveFullName` fallback)

Still deferred (unchanged): concurrent duplicate clients, merge-suspect, integration tests, web 202 compat

### Re-review pass 2 patch (2026-06-16)

- Patch: split `NameFromForm` vs `DisplayName` — create uses fallback display name; update only when form captured a name

### Re-review (2026-06-16, pass 3)

✅ Clean review — all layers passed. Pass 2 patch verified; no new patch or decision-needed findings. Deferred items unchanged (Story 3.2/3.3 scope).
