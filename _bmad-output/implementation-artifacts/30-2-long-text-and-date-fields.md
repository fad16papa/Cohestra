---
story_id: 30.2
story_key: 30-2-long-text-and-date-fields
epic: 30
status: done
baseline_commit: 02c7dfa4c313c0450070248a97a136431f7423f4
created: 2026-08-29
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/specs/spec-registration-capture/field-types.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - docs/contracts/activity-form-schema-v1.md
  - _bmad-output/implementation-artifacts/30-1-hidden-field-and-campaign-query-passthrough.md
---

# Story 30.2: Long text and date Fields

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As an Operator,
I want `textarea` and `date` Fields on Saturday’s Form,
so that notes and a preferred session day live in Cohestra instead of Tally.

**FRs:** FR-RC-3, FR-RC-4. **SPEC:** CAP-2 (textarea, date only).

## Acceptance Criteria

1. **Given** an unpublished Activity Form tab (type dropdown is enough; slash-add is 30.4)
   **When** I add `type: "textarea"` and save
   **Then** `form_schema.version` stays `1` and the Field round-trips on admin GET
   **And** public preview and `/register/{slug}` show a multi-line input
   **And** submit persists the Answer keyed by Field id
   **And** max length 2000 is enforced on save (schema answer rules) and submit
   **And** Client history renders the value as React text (XSS-safe; persist strips HTML)
   **And** `ClientProfileExtractor` applies the same name heuristics as `text`; otherwise Answers only
   **And** `textarea` does **not** satisfy the Publish Gate

2. **Given** I add `type: "date"`
   **When** I save, preview, publish (required phone or email still present), and submit
   **Then** a valid value is stored as `YYYY-MM-DD`
   **And** an invalid date is rejected on submit (`400` ProblemDetails)
   **And** the value is **not** mapped to a Client column
   **And** there is no min/max, no “disable Sundays,” and no date range
   **And** `date` does **not** satisfy the Publish Gate

3. **Given** Story 30.1 Hidden Fields already on the Form
   **When** I add textarea and date beside them
   **Then** Hidden query passthrough still works
   **And** existing v1 types remain valid (NFR-RC-1)

## Tasks / Subtasks

- [x] **Task 1 — Domain + contract** (AC: 1, 2, 3)
  - [x] Add `FormFieldTypes.Textarea = "textarea"` and `FormFieldTypes.Date = "date"` to `All` only. **Do not** add either to `NonInput`.
  - [x] Update the validator “type must be one of: …” string.
  - [x] Document both as **v1.1 additive** in `docs/contracts/activity-form-schema-v1.md` and `public-registration-v1.md`. `version` stays `1`.
  - [x] Textarea answers: string, max 2000, HTML stripped. Date answers: string `YYYY-MM-DD`.

- [x] **Task 2 — Schema + answers + extract** (AC: 1, 2, 3)
  - [x] `FormSchemaValidator`: accept textarea/date. Reject options / consentText / phoneCountry (same as text). `defaultValue` remains Hidden-only.
  - [x] `PublishGateValidator`: no production logic change. Unit-test textarea-only and date-only required schemas still fail publish; phone + textarea + date publishes.
  - [x] `RegistrationAnswerValidator`: textarea required/empty like text; over 2000 after strip → 400; strip HTML with existing `HiddenValueSanitizer` (plain text). Date: required/empty like text; non-empty must parse as `yyyy-MM-dd` calendar date (`DateOnly.TryParseExact`); store that exact format. No min/max.
  - [x] `ClientProfileExtractor`: `case Text or Textarea` for name / profession / nationality / residency / required-text fallback. **No** Date case that writes a Client column. Test: textarea id `full_name` → NameFromForm; date id `full_name` → NameFromForm stays null.
  - [x] `FormFieldStepAssigner` / `web/lib/form-steps.ts`: treat textarea like text for name-id → identity; date → details.
  - [x] Formatter already emits non-empty strings — do not skip textarea/date.

- [x] **Task 3 — Web authoring + public/preview** (AC: 1, 2)
  - [x] `FormFieldType` + labels + `formFieldTypeOptions` + `createDefaultField`. Prefer ids `notes` / `date` when free.
  - [x] `registration-form.tsx`: handle `textarea` and `date` **before** the default text `<Input>` or Participants will see a single-line box. Textarea: native `<textarea>`, public `min-h-12`. Date: `<input type="date">`. Client validate: textarea ≤ 2000; date empty-or-`YYYY-MM-DD`.
  - [x] Editor: type dropdown only (no slash palette). Placeholder allowed on both. No min/max UI.

- [x] **Task 4 — Tests** (AC: all)
  - [x] `FormSchemaValidatorTests`: accept textarea+date; reject unknown; existing v1 + Hidden still valid.
  - [x] `PublishGateValidatorTests`: textarea-only / date-only fail; phone+both succeed.
  - [x] `RegistrationAnswerValidatorTests`: textarea 2000; HTML strip; date valid; `2026-02-30` and `not-a-date` fail; missing optional succeeds.
  - [x] `ClientProfileExtractorTests`: textarea name heuristics; date never extracts.
  - [x] Integration (author even if this VM has no Postgres): seed published activity, append textarea `notes` + date `preferred_date` (+ keep Hidden `ref` if already appended). POST valid notes + `2026-09-12` → persist. Invalid date → 400. Missing optional date → 201.
  - [x] Web: typecheck. Optional small helper test for date format if you extract one.

- [x] **Task 5 — Verify**
  - [x] `dotnet test Cohestra.sln --filter "Category!=Integration"`
  - [x] `dotnet build` + web `tsc --noEmit`
  - [x] Do not change `TenantPlanLimits`. Do not add Wave 1 types (30.3). Do not add slash palette (30.4). Do not add these types to launch templates.

## Dev Notes

### Current state (read before editing)

| File | Today | This story |
|---|---|---|
| `FormFieldTypes.cs` | 9 types including `hidden` | Add `textarea`, `date` to `All` only |
| `FormSchemaValidator.cs` | Hardcoded type list in error | Add both names |
| `RegistrationAnswerValidator.cs` | text-like strings; Hidden special | Textarea max 2000 + strip; Date ISO |
| `ClientProfileExtractor.cs` | `case Text:` name heuristics | Fall through Textarea; Date no-op |
| `web/lib/form-schema-utils.ts` | `Record<FormFieldType, …>` | Must add both or TS will not compile |
| `registration-form.tsx` | Unknown types → visible text input | Must handle textarea/date first |

### Invariants — do not break

- `form_schema.version` remains `1`. Additive types only.
- Publish Gate = required **phone or email** only.
- Hidden query passthrough (30.1) unchanged.
- Answers immutable. No new endpoints/migrations.
- `registration_theme` stays off `form_schema`.
- No Form canvas. No slash palette. No Wave 1 types except these two.
- Client history is the admin Answer surface (no Registration-detail page).

### Previous story (30.1) learnings

- Do **not** put new types in `NonInput` or answers will not persist.
- `DefaultValue` is Hidden-only; MapToDomain must not sanitize-to-null a non-hidden default before reject.
- HtmlSanitizer: `KeepChildNodes = true` + strip-decode-strip so `&` stays `&` and encoded tags cannot rehydrate.
- Preview `performSubmit` returns before query merge. Public stepper uses `usedFormSteps(..., { includeHidden: isPreview })`.
- Integration: append fields after `SeedPublishedActivityAsync`; do not change the helper’s default seed fields. Phone seed `PH` + `09181234567`.

### Out of scope

- `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`, `country` (30.3)
- Slash palette, scale/emergency, piping, Closed, Close-at, notify, templates
- Date min/max, disabled weekdays, date ranges, timezones on date
- Launch template changes

### Project context

See `_bmad-output/project-context.md`: brownfield extend-only; nullable on; DTOs in Contracts; ProblemDetails.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- This VM has no Postgres/Redis (`postgresql` service missing). Integration tests were authored and compile but were not executed here.

### Completion Notes List

- Added `textarea` and `date` to `FormFieldTypes.All` only (not `NonInput`) so answers persist. `form_schema.version` stays `1`.
- Schema save accepts both; existing text-like extra-key rules reject options / consentText / phoneCountry; `defaultValue` stays Hidden-only.
- Publish Gate unchanged: required textarea-only or date-only cannot publish; required phone + both can.
- Textarea answers: `HiddenValueSanitizer` strip, max 2000, over-length is 400 (not truncated). Date answers: `DateOnly.TryParseExact` `yyyy-MM-dd`; `2026-02-30` and `not-a-date` fail; missing optional succeeds.
- `ClientProfileExtractor`: textarea uses the same name / profession / nationality / residency / required-text fallback as text. Date is an explicit no-op (even if id is `full_name`).
- Steps: textarea + name-like id → identity; date → details.
- Form tab type dropdown: Long text / Date; preferred ids `notes` / `date`. Public + preview render native `<textarea>` (`min-h-12` on public) and `<input type="date">` before the default text input.
- Unit suite: 672 passed (`Category!=Integration`). `dotnet build` clean. Web: `tsc --noEmit` + vitest for date helper / field ids / steps. Integration tests authored; not run (no Postgres).
- Did not change `TenantPlanLimits`, launch templates, Wave 1 types, or slash palette.

### File List

- `_bmad-output/implementation-artifacts/30-2-long-text-and-date-fields.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/contracts/activity-form-schema-v1.md`
- `docs/contracts/public-registration-v1.md`
- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Infrastructure/Activities/FormFieldStepAssigner.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Infrastructure.Tests/Activities/FormFieldStepAssignerTests.cs`
- `src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs`
- `src/Infrastructure.Tests/Activities/PublishGateValidatorTests.cs`
- `src/Infrastructure.Tests/Clients/ClientRegistrationAnswerFormatterHiddenTests.cs`
- `src/Infrastructure.Tests/Registrations/ClientProfileExtractorTests.cs`
- `src/Infrastructure.Tests/Registrations/RegistrationAnswerValidatorTests.cs`
- `src/Api.IntegrationTests/LongTextAndDateRegistrationIntegrationTests.cs`
- `web/components/registration/registration-form.tsx`
- `web/lib/activities-api.ts`
- `web/lib/form-schema-utils.ts`
- `web/lib/form-schema-utils.test.ts`
- `web/lib/form-steps.ts`
- `web/lib/form-steps.test.ts`
- `web/lib/iso-calendar-date.ts`
- `web/lib/iso-calendar-date.test.ts`

### Change Log

- 2026-08-29: Implemented Story 30.2 long text and date fields. Status → review.
- 2026-08-29: Code review — clean (0 decision / 0 patch / 0 defer; Blind Hunter nits dismissed). Status → done.
