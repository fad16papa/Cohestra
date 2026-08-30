---
story_id: 30.5
story_key: 30-5-core-scale-and-emergency-contact
epic: 30
status: review
baseline_commit: 1b1c905
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/field-types.md
  - _bmad-output/implementation-artifacts/30-4-slash-add-field-palette.md
---

# Story 30.5: Core+ scale and emergency contact

Status: review

## Story

As a Core or Pro Operator,
I want a labeled 1–5 scale and a compound emergency-contact Field,
So that skill level and a door-contact live on the same Form without a survey block.

**FRs:** FR-RC-8 (Wave 2). **UX:** SlashPalette Core+ group.

## Acceptance Criteria

1. **Given** a Core or Pro tenant
   **When** I add `scale` or `emergency` from the palette (or type control)
   **Then** `scale` is a labeled linear 1–5 (Beginner → Expert), **not** NPS
   **And** `emergency` stores one Field id with compound Answer `{ name, phone }`
   **And** both persist, preview, publish, submit, and show in admin Answers / Client history
   **And** neither satisfies the Publish Gate
   **And** neither maps to Client name/phone/email extract

2. **Given** a Basic tenant
   **When** I add `scale` or `emergency` via API or UI
   **Then** the API returns `403 plan_locked` with upgrade hint
   **And** the palette shows those items disabled / upgrade, not missing

3. **Given** Stories 30.1–30.4
   **When** I mix scale/emergency with Hidden and Wave 1
   **Then** existing types and query passthrough still work

## Tasks / Subtasks

- [x] **Task 1 — Domain + schema validation** (AC: 1, 2)
  - [x] `FormFieldTypes.Scale` / `Emergency` + `CorePlusOnly` set
  - [x] `ScaleFieldSupport` (values 1–5 + labels), `EmergencyFieldSupport`
  - [x] `FormSchemaValidator` scale/emergency rules; emergency `phoneCountry` default SG
  - [x] `ActivityService.EnsureFormSchemaPlanAllowedAsync` Basic gate

- [x] **Task 2 — Answers + admin display** (AC: 1)
  - [x] `RegistrationAnswerValidator` validate + normalize scale/emergency
  - [x] `ClientProfileExtractor` explicit no-ops
  - [x] `ClientRegistrationAnswerFormatter` labeled scale + emergency summary

- [x] **Task 3 — Web** (AC: 1, 2)
  - [x] Types, defaults, palette Core+ group with locked rows on Basic
  - [x] Public/preview scale buttons + emergency name/phone UI
  - [x] `scale-labels.ts`, docs updates

- [x] **Task 4 — Tests** (AC: 1–3)
  - [x] Form schema, answers, publish gate, extractor, palette Vitest

## Dev Agent Record

### Completion Notes

- Core+ palette group adds Scale + Emergency contact; Basic sees locked rows with upgrade copy.
- Scale answers are `"1"`–`"5"` strings; emergency answers are `{ name, phone }` objects.
- Publish Gate unchanged: still requires required phone or email only.

### File List

- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Domain/Activities/ScaleFieldSupport.cs`
- `src/Domain/Activities/EmergencyFieldSupport.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Clients/ClientRegistrationAnswerFormatter.cs`
- `src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs`
- `src/Infrastructure.Tests/Activities/PublishGateValidatorTests.cs`
- `src/Infrastructure.Tests/Registrations/RegistrationAnswerValidatorTests.cs`
- `src/Infrastructure.Tests/Registrations/ClientProfileExtractorTests.cs`
- `web/lib/activities-api.ts`
- `web/lib/form-schema-utils.ts`
- `web/lib/form-field-palette.ts`
- `web/lib/form-field-palette.test.ts`
- `web/lib/scale-labels.ts`
- `web/lib/phone-countries.ts`
- `web/components/activities/form-field-palette-dialog.tsx`
- `web/components/activities/form-field-editor.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/registration/registration-form.tsx`
- `web/components/registration/phone-field-input.tsx`
- `docs/contracts/activity-form-schema-v1.md`
- `docs/contracts/public-registration-v1.md`
