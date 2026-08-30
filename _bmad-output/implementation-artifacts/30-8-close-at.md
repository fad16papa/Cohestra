---
story_id: 30.8
story_key: 30-8-close-at
epic: 30
status: done
baseline_commit: cursor/closed-message-d861
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/implementation-artifacts/30-7-closed-message.md
---

# Story 30.8: Close-at

Status: done

## Story

As an Operator,
I want an optional Close-at datetime independent of Activity end,
So that Maya cannot register after my deadline even when the Activity is still upcoming.

**FRs:** FR-RC-7 (CAP-5). **UX:** UX-DR-RC-4.

## Acceptance Criteria

1. **Given** I set `form_schema.meta.registrationClosesAt`
   **When** I save the Form tab
   **Then** the value persists as a UTC instant
   **And** the picker displays in the Activity/tenant timezone
   **And** I can clear Close-at
   **And** a past Close-at at save is allowed

2. **Given** empty Close-at
   **When** the public Form loads
   **Then** capacity / paused / Activity ended rules still apply

3. **Given** server clock is after Close-at
   **When** Maya GETs or submits the public Form
   **Then** registration is unavailable / rejected
   **And** unavailable **precedence** is: capacity full → paused → Close-at → Activity ended
   **And** reason chip is **Closed**; Closed message from 30.7 still shows when set

## Tasks / Subtasks

- [x] **Task 1 — Domain + schema meta** (AC: 1)
  - [x] `FormSchemaMeta.registrationClosesAt` + DTO/mapper round-trip (UTC normalize)
  - [x] `RegistrationCloseAtEvaluator` + `RegistrationAvailabilityEvaluator`

- [x] **Task 2 — Public API + submit** (AC: 2–3)
  - [x] `PublicActivityResponse.isRegistrationClosedAt`
  - [x] Submit 409 `registration_closed_at`
  - [x] Precedence in `RegistrationService.ResolveUnavailableSubmitResultAsync`

- [x] **Task 3 — Web editor** (AC: 1)
  - [x] Meta types + tenant-timezone datetime-local picker on Form tab
  - [x] Clearable Close-at control

- [x] **Task 4 — Public unavailable screen** (AC: 3)
  - [x] Page precedence: full → paused → close-at → ended
  - [x] Reason chip Closed + platform copy; operator Closed message unchanged

- [x] **Task 5 — Tests + docs** (AC: 1–3)
  - [x] Evaluator + validator unit tests
  - [x] Integration GET/submit tests
  - [x] Vitest for timezone conversion helpers
  - [x] Contract docs update

## Dev Agent Record

### Completion Notes

- Close-at stored as UTC instant; operator picker uses `shell.registrationTimeZoneId`.
- Cache refresh updates `isRegistrationClosedAt` alongside schedule open state.
- Plan pause enrichment no longer skips when Activity schedule has ended (precedence fix).

### File List

- `src/Domain/Activities/ActivityFormSchema.cs`
- `src/Contracts/Activities/ActivityFormSchemaDto.cs`
- `src/Contracts/Activities/PublicActivityResponse.cs`
- `src/Application/Registrations/PublicRegistrationSubmitResult.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/FormSchemaMapper.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Registrations/RegistrationCloseAtEvaluator.cs`
- `src/Infrastructure/Registrations/RegistrationAvailabilityEvaluator.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `web/lib/registration-close-at.ts`
- `web/components/activities/activity-close-at-picker.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `web/lib/registration-unavailable.ts`
- `web/app/(public)/register/[slug]/page.tsx`
- `docs/contracts/activity-form-schema-v1.md`
- `docs/contracts/public-registration-v1.md`
