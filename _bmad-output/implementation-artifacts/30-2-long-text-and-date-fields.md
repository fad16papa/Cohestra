---
story_id: 30.2
story_key: 30-2-long-text-and-date-fields
epic: 30
status: in-progress
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

Status: in-progress

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

- [ ] **Task 1 — Domain + contract** (AC: 1, 2, 3)
  - [ ] Add `FormFieldTypes.Textarea = "textarea"` and `FormFieldTypes.Date = "date"` to `All` only. **Do not** add either to `NonInput`.
  - [ ] Update the validator “type must be one of: …” string.
  - [ ] Document both as **v1.1 additive** in `docs/contracts/activity-form-schema-v1.md` and `public-registration-v1.md`. `version` stays `1`.
  - [ ] Textarea answers: string, max 2000, HTML stripped. Date answers: string `YYYY-MM-DD`.

- [ ] **Task 2 — Schema + answers + extract** (AC: 1, 2, 3)
  - [ ] `FormSchemaValidator`: accept textarea/date. Reject options / consentText / phoneCountry (same as text). `defaultValue` remains Hidden-only.
  - [ ] `PublishGateValidator`: no production logic change. Unit-test textarea-only and date-only required schemas still fail publish; phone + textarea + date publishes.
  - [ ] `RegistrationAnswerValidator`: textarea required/empty like text; over 2000 after strip → 400; strip HTML with existing `HiddenValueSanitizer` (plain text). Date: required/empty like text; non-empty must parse as `yyyy-MM-dd` calendar date (`DateOnly.TryParseExact`); store that exact format. No min/max.
  - [ ] `ClientProfileExtractor`: `case Text or Textarea` for name / profession / nationality / residency / required-text fallback. **No** Date case that writes a Client column. Test: textarea id `full_name` → NameFromForm; date id `full_name` → NameFromForm stays null.
  - [ ] `FormFieldStepAssigner` / `web/lib/form-steps.ts`: treat textarea like text for name-id → identity; date → details.
  - [ ] Formatter already emits non-empty strings — do not skip textarea/date.

- [ ] **Task 3 — Web authoring + public/preview** (AC: 1, 2)
  - [ ] `FormFieldType` + labels + `formFieldTypeOptions` + `createDefaultField`. Prefer ids `notes` / `date` when free.
  - [ ] `registration-form.tsx`: handle `textarea` and `date` **before** the default text `<Input>` or Participants will see a single-line box. Textarea: native `<textarea>`, public `min-h-12`. Date: `<input type="date">`. Client validate: textarea ≤ 2000; date empty-or-`YYYY-MM-DD`.
  - [ ] Editor: type dropdown only (no slash palette). Placeholder allowed on both. No min/max UI.

- [ ] **Task 4 — Tests** (AC: all)
  - [ ] `FormSchemaValidatorTests`: accept textarea+date; reject unknown; existing v1 + Hidden still valid.
  - [ ] `PublishGateValidatorTests`: textarea-only / date-only fail; phone+both succeed.
  - [ ] `RegistrationAnswerValidatorTests`: textarea 2000; HTML strip; date valid; `2026-02-30` and `not-a-date` fail; missing optional succeeds.
  - [ ] `ClientProfileExtractorTests`: textarea name heuristics; date never extracts.
  - [ ] Integration (author even if this VM has no Postgres): seed published activity, append textarea `notes` + date `preferred_date` (+ keep Hidden `ref` if already appended). POST valid notes + `2026-09-12` → persist. Invalid date → 400. Missing optional date → 201.
  - [ ] Web: typecheck. Optional small helper test for date format if you extract one.

- [ ] **Task 5 — Verify**
  - [ ] `dotnet test Cohestra.sln --filter "Category!=Integration"`
  - [ ] `dotnet build` + web `tsc --noEmit`
  - [ ] Do not change `TenantPlanLimits`. Do not add Wave 1 types (30.3). Do not add slash palette (30.4). Do not add these types to launch templates.

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

### Debug Log References

### Completion Notes List

### File List
