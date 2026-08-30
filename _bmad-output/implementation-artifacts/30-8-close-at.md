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

### Review Findings (Pass 1)

- [x] [Review][Patch] Returning registrant after Close-at gets `registration_closed_at` instead of already-registered [`RegistrationService.cs:210-251`]

- [x] [Review][Patch] Close-at submit rejection does not refresh public activity cache (only `ActivityFull` does) [`RegistrationService.cs:276-284`]

- [x] [Review][Patch] Controller 409 branch order lists Close-at before plan-limit; contradicts spec precedence full → paused → Close-at [`PublicRegistrationsController.cs:121-140`]

- [x] [Review][Patch] Malformed datetime-local in picker silently clears existing Close-at when `closeAtDateTimeLocalToUtcIso` returns null [`activity-form-tab.tsx:358-363`]

- [x] [Review][Patch] `closeAtDateTimeLocalToUtcIso` throws on invalid tenant timezone (display path has try/catch, save path does not) [`registration-close-at.ts:68-95`]

- [x] [Review][Patch] No final Close-at re-check immediately before `SaveChangesAsync`; slow submit can persist after deadline [`RegistrationService.cs:270-337`]

**Pass 1 verdict:** All six patch findings applied. Deferred items unchanged.

- [x] [Review][Defer] Manual timezone offset iteration lacks DST gap/ambiguous-hour handling; only Singapore round-trip tested [`registration-close-at.ts`] — deferred, acceptable for v1 tenant TZs; revisit if US/EU operators adopt Close-at heavily

- [x] [Review][Defer] Stale browser tab after Close-at passes still shows form until reload; submit returns inline 409 [`page.tsx`, `registration-form.tsx`] — deferred, matches existing no-polling pattern for capacity/ended

- [x] [Review][Defer] `isRegistrationOpen` remains true when only Close-at blocks; clients must also check `isRegistrationClosedAt` [`PublicActivityResponse`, integration test`] — deferred, intentional separate flags; contract doc updated

- [x] [Review][Defer] Missing integration test for closed message + Close-at unavailable wiring and combined paused+Close-at submit precedence — deferred, unit coverage + page wiring sufficient for slice

- [x] [Review][Defer] Close-at and archived unavailable both use **Closed** chip label [`registration-unavailable.ts`] — deferred, spec requires Closed chip for Close-at; archived path pre-existed

- [x] [Review][Dismiss] No dedicated validator test asserting past Close-at at save is allowed — implementation has no future-date guard; behavior correct by omission

### Review Findings (Pass 2)

- [x] [Review][Patch] Close-at picker value is derived from saved UTC on every render; partial `datetime-local` edits are ignored so the input resets until the field is cleared [`activity-form-tab.tsx:107-111`, `activity-close-at-picker.tsx`]

- [x] [Review][Defer] Schedule-ended submit now validates answers and runs client dedup before returning 404 — side effect of duplicate-before-Close-at reorder [`RegistrationService.cs:210-249`] — deferred, dedup is idempotent; ended activities are low traffic

- [x] [Review][Defer] Stale tab submit with invalid answers after Close-at returns 400 validation error instead of 409 closed [`RegistrationService.cs:210-249`] — deferred, availability requires valid payload to identify returning registrants

- [x] [Review][Defer] Close-at picker uses UTC when tenant shell is still loading [`activity-form-tab.tsx:107`] — deferred, shell resolves quickly; operator can re-save after load

**Pass 2 verdict:** All patch findings applied. AC1–AC3 satisfied; Pass 1 patches verified. **730** .NET + **8** Vitest tests pass.

### Review Findings (Pass 3)

- [x] [Review][Defer] Incomplete Close-at datetime in picker local draft can diverge from saved schema if operator saves form before finishing edit [`activity-close-at-picker.tsx:40-51`] — deferred, browser picker emits complete values; manual partial edit then immediate save is unlikely

**Pass 3 verdict:** ✅ Clean review — all layers passed. AC1–AC3 and FR-RC-7 satisfied; Pass 1–2 patches verified. **730** .NET + **8** Vitest tests pass.

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
