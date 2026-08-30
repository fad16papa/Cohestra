---
story_id: 30.6
story_key: 30-6-piping-on-thank-you-and-confirmation-email
epic: 30
status: done
baseline_commit: 60cac03
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/implementation-artifacts/30-5-core-scale-and-emergency-contact.md
---

# Story 30.6: Piping on thank-you and confirmation email

Status: in-progress

## Story

As an Operator,
I want thank-you copy and the confirmation email to substitute `{{full_name}}`, `{{email}}`, `{{phone}}`, and `{{field:<id>}}`,
So that Maya sees “See you Saturday, Maya” without a hardcoded name — and Hidden values never leak to her.

**FRs:** FR-RC-5 (CAP-4). **UX:** UX-DR-RC-5 piping cheatsheet + live preview.

## Acceptance Criteria

1. **Given** operator-authored success copy with `{{full_name}}`
   **When** Maya submits with a name Field value “Maya”
   **Then** the success screen shows her name and uses `role="status"`
   **And** missing values substitute to empty string

2. **Given** confirmation subject/body with the same token set
   **When** Outbox sends the existing registration confirmation
   **Then** tokens are substituted
   **And** email layout and hero stay on `RegistrationThemeResolver`
   **And** Hidden Field values are never substituted into success screen or confirmation email

3. **Given** the success-copy editor
   **When** I open the token cheatsheet
   **Then** Hidden Field ids are not offered
   **And** live preview substitutes sample name “Maya”

## Tasks / Subtasks

- [x] **Task 1 — Domain + schema meta** (AC: 1–2)
  - [x] `FormSchemaMeta` success + confirmation email fields
  - [x] `FormSchemaValidator` / mapper round-trip + max lengths
  - [x] `RegistrationPipingTokenSubstitutor` (empty-string missing rule; hidden/non-input blocked)

- [x] **Task 2 — Submit + email wiring** (AC: 1–2)
  - [x] `PublicRegistrationSubmitResult` + `SubmitPublicRegistrationResponse.successCopyMarkdown`
  - [x] `RegistrationService` success copy on create
  - [x] `RegistrationConfirmationEmailBuilder` custom subject/closing (layout unchanged)
  - [x] `RegistrationNotificationService` piping from schema + answers

- [x] **Task 3 — Web** (AC: 3)
  - [x] Meta types + parse in `activities-api.ts`
  - [x] Form tab editors + `PipingCheatsheet` + live preview
  - [x] `registration-piping.ts` client preview helper
  - [x] Success screen displays server-substituted copy

- [x] **Task 4 — Tests + docs** (AC: 1–3)
  - [x] Substitutor, validator, email builder, notification service tests
  - [x] Vitest `registration-piping.test.ts`
  - [x] Contract docs updated

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes

- Missing token rule: **empty string** (tested).
- Confirmation email: custom subject + closing message only; hero/layout untouched.
- Idempotency replays omit `successCopyMarkdown` (same as confirmation email fields today).
