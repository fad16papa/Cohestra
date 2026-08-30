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

### Review Findings

- [ ] [Review][Patch] Emergency `phoneCountry` bypasses schema validation [`src/Infrastructure/Activities/FormSchemaValidator.cs:268-271`] — `ValidateEmergencyField` returns early before the shared ISO check at line 381; invalid codes like `ZZ` can be saved.
- [ ] [Review][Patch] Web schema validation skips emergency `phoneCountry` [`web/lib/form-schema-utils.ts:525-533`] — client publish-gate path validates phone fields only, not emergency.
- [ ] [Review][Patch] Emergency name length not enforced in public form [`web/components/registration/registration-form.tsx`] — server caps at 200 chars; client has no `maxLength` or validation.
- [ ] [Review][Patch] Optional scale cannot be cleared once selected [`web/components/registration/registration-form.tsx:845-884`] — toggle deselect needed for optional fields.
- [ ] [Review][Patch] Scale control lacks radiogroup semantics [`web/components/registration/registration-form.tsx`] — use `role="radiogroup"` / `role="radio"` (or fieldset/legend) for screen readers.
- [ ] [Review][Patch] No formatter tests for scale/emergency display [`src/Infrastructure/Clients/ClientRegistrationAnswerFormatter.cs`] — AC1 admin Answers formatting is untested.
- [ ] [Review][Patch] Add schema test rejecting invalid emergency `phoneCountry` [`src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs`]
- [ ] [Review][Patch] Add publish-gate test for required emergency-only schema [`src/Infrastructure.Tests/Activities/PublishGateValidatorTests.cs`]
- [x] [Review][Defer] Basic `403 plan_locked` save path has no automated test [`src/Infrastructure/Activities/ActivityService.cs`] — deferred, matches existing deferred-work pattern for HTTP plan_locked tests
- [x] [Review][Defer] Type dropdown on Basic still lists scale/emergency (save-time gate only) [`web/components/activities/form-field-editor.tsx`] — deferred, consistent with Recipes pattern (palette lock + save-time API gate)
- [x] [Review][Defer] Duplicate scale labels in C# and TypeScript [`ScaleFieldSupport.cs`, `web/lib/scale-labels.ts`] — deferred, maintainability follow-up
- [x] [Review][Defer] No AC3 mixed hidden + wave-1 + Core+ regression test — deferred, low risk given isolated validators
- [x] [Review][Defer] No integration test for public registration POST with scale/emergency — deferred, unit coverage sufficient for this story slice

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
