---
story_id: 30.3
story_key: 30-3-wave-1-toolbox-types-and-country
epic: 30
status: done
baseline_commit: da9fe01a0e717c27394c66b0b444d68acc1ca627
created: 2026-08-29
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/specs/spec-registration-capture/field-types.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
  - docs/contracts/activity-form-schema-v1.md
  - _bmad-output/implementation-artifacts/30-2-long-text-and-date-fields.md
---

# Story 30.3: Wave 1 toolbox types and country

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As an Operator,
I want number, link, time, yes/no, choice, multi-choice, info, and country Fields,
so that Saturday’s event questions fit the toolbox without opening Tally.

**FRs:** FR-RC-18. **SPEC:** CAP-2 Wave 1 (these eight only). **UX:** UX-DR30 tap ≥ 44px.

## Acceptance Criteria

1. **Given** an unpublished Form
   **When** I save Fields of types `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`, and `country`
   **Then** each type is accepted on `form_schema.version` `1`
   **And** unknown types still reject
   **And** none of these types satisfy the Publish Gate
   **And** `info` is NonInput (no Answer); markdown-lite; max 2000; XSS-sanitized on public render

2. **Given** a Participant on `/register/{slug}`
   **When** they fill Wave 1 Fields and submit
   **Then** `number` rejects non-numeric; optional min/max enforced when set
   **And** `url` requires `http` or `https`
   **And** `time` stores `HH:mm` with no timezone math
   **And** `choice` is single-select with tap targets ≥ 44×44px; `yes_no` stores boolean; `multi_choice` allows several (optional min/max selection count)
   **And** `country` is an ISO list reusing phone-country data (the 14 codes already in `PhoneCountrySupport`)
   **And** Answers appear on Client history
   **And** extract to Client columns stays name / phone / email / consent — these types are Answers-only
   **And** `docs/contracts/activity-form-schema-v1.md` documents the additive types as v1.1 while `version` stays `1`

3. **Given** light and dark resolved themes
   **When** I preview the new controls
   **Then** labels, errors, and focus rings use existing tokens (`text-destructive`, `focus-visible:ring-ring`, `min-h-12` on public)

## Tasks / Subtasks

- [x] **Task 1 — Domain + contract** (AC: 1, 2)
  - [x] Add the eight constants to `FormFieldTypes.All`. Add **only** `info` to `NonInput`.
  - [x] Additive DTO/domain props: `min` / `max` (number value bounds **or** multi_choice selection counts), `infoText` (info body). Last optional params after `defaultValue`.
  - [x] Update validator “type must be one of: …” string.
  - [x] Document all eight as **v1.1 additive** in `activity-form-schema-v1.md` and `public-registration-v1.md`. `version` stays `1`.

- [x] **Task 2 — Schema + answers + extract** (AC: 1, 2)
  - [x] Schema: `choice`/`multi_choice` require options (same uniqueness as select). `info` mirrors section_header extras (no required/placeholder/options/consent/phone/default/min/max); `infoText` max 2000 after HTML strip. `min`/`max` only on `number` and `multi_choice`; if both set, min ≤ max. Country: no options/consent/phoneCountry/default.
  - [x] Publish Gate: no production change. Unit-test Wave-1-only required schemas fail; phone + Wave 1 succeeds.
  - [x] Answers: number = invariant decimal (`decimal.TryParse`); reject non-numeric; enforce min/max when set. url = absolute `http`/`https`. time = `TimeOnly.TryParseExact("HH:mm")`. choice = one option value. yes_no = boolean (reuse checkbox path). multi_choice = string array ⊆ options; optional min/max **count**. country = supported phone ISO. info skipped.
  - [x] Extractor: explicit no-op cases. Test: `full_name` on `number`/`yes_no`/`country` does not set NameFromForm.
  - [x] Formatter: yes_no → Yes/No; choice/multi_choice → option labels; do not skip non-empty Wave 1 answers.
  - [x] Steps: new types → details (yes_no is **not** consent).

- [x] **Task 3 — Web authoring + public/preview** (AC: 1, 2, 3)
  - [x] `FormFieldType` + labels + dropdown + `createDefaultField`. Prefer ids matching the type (`number`, `url`, …) when free. `yes_no` id `yes_no` (underscore, valid field id).
  - [x] Editor: type dropdown only (no slash palette — 30.4). Options UI for choice/multi_choice. min/max number inputs for number + multi_choice. infoText textarea. Placeholder allowed on number/url/time/country. No min/max UI on date.
  - [x] `registration-form.tsx`: handle all eight **before** the default text `<Input>`. Public tap targets `min-h-12` (≥ 44px). choice = button group (not native select). yes_no = Yes/No buttons (boolean). multi_choice = checkbox list (array). info = heading + sanitized paragraphs (reuse intro strip). country = select from `phoneCountryOptions`. Client validate mirrors server rules.
  - [x] Parse `min`/`max`/`infoText` in `activities-api.ts`.

- [x] **Task 4 — Tests** (AC: all)
  - [x] Schema: accept all eight; reject unknown; Hidden/textarea/date still valid.
  - [x] Publish gate: Wave-1-only fail; phone + mix succeed.
  - [x] Answers: number non-numeric / min / max; url without scheme; time `25:00`; choice invalid option; yes_no boolean; multi_choice over max count; country unknown ISO; missing optional succeeds.
  - [x] Extractor Answers-only.
  - [x] Integration: seed, append Wave 1 fields (keep existing seed fields). Valid submit persists. Invalid number → 400. Missing optional → 201.
  - [x] Web: typecheck + helper tests (`isIsoTime`, `createFieldId`).

- [x] **Task 5 — Verify**
  - [x] `dotnet test Cohestra.sln --filter "Category!=Integration"`
  - [x] `dotnet build` + web `tsc --noEmit`
  - [x] Do not change `TenantPlanLimits`. Do not add slash palette (30.4). Do not add `scale`/`emergency`. Do not add these types to launch templates.

## Dev Notes

### Schema props (do not invent more)

| JSON | Types | Meaning |
|---|---|---|
| `min` / `max` | `number` | Inclusive numeric bounds |
| `min` / `max` | `multi_choice` | Inclusive selection **count** |
| `infoText` | `info` | Markdown-lite body, max 2000 after HTML strip |

`defaultValue` stays Hidden-only.

### Country list

Reuse `PhoneCountrySupport` / `phoneCountryOptions` (SG PH MY ID TH VN US GB AU HK JP KR CN IN). Do **not** switch to the full `countries.ts` ISO list.

### Reuse

- Options validation: extend `select`/`referral_source` block to `choice`/`multi_choice`.
- yes_no: same boolean validate/normalize as checkbox (`TryGetBoolean`). Recipes already map `true`→`yes`.
- info: `NonInput` skip like `section_header`. Public XSS: strip tags like `RegistrationIntroCopy`.
- time: mirror date (`TryParseExact`, no TZ).
- Do not put input types in `NonInput`.

### Previous story (30.2) learnings

- Handle new types **before** the default text `<Input>`.
- `Record<FormFieldType, …>` must list every type or TS fails.
- Append integration fields after `SeedPublishedActivityAsync`. Phone seed `PH` + `09181234567`.
- HtmlSanitizer KeepChildNodes + strip-decode-strip for stored text.

### Out of scope

- Slash palette (30.4), scale/emergency (30.5), piping, Closed, Close-at, templates
- Full world ISO list, date min/max, native `<select>` for `choice`

### Project context

Brownfield extend-only; nullable on; DTOs in Contracts; ProblemDetails.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- This VM has no Postgres/Redis. Integration tests authored and compile; not executed here.

### Completion Notes List

- Added eight Wave 1 types to `FormFieldTypes.All`. Only `info` is NonInput.
- Additive props: `min`/`max` (number bounds or multi_choice counts), `infoText` (info body, HTML-stripped, max 2000).
- Answers: number invariant decimal + optional bounds; url http/https; time `HH:mm`; choice option value; yes_no boolean (required = answered, No is valid); multi_choice string array + count bounds; country phone-ISO list; info skipped.
- Extractor no-ops. Formatter maps yes_no and option labels.
- Form tab dropdown + public controls (`min-h-12` / 44px). No slash palette, no launch-template changes, no scale/emergency.
- Unit suite: 677 passed. Web `tsc --noEmit` + vitest helpers.

### File List

- `_bmad-output/implementation-artifacts/30-3-wave-1-toolbox-types-and-country.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/contracts/activity-form-schema-v1.md`
- `docs/contracts/public-registration-v1.md`
- `src/Contracts/Activities/ActivityFormSchemaDto.cs`
- `src/Domain/Activities/ActivityFormSchema.cs`
- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Infrastructure/Activities/FormSchemaMapper.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Clients/ClientRegistrationAnswerFormatter.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs`
- `src/Infrastructure.Tests/Activities/PublishGateValidatorTests.cs`
- `src/Infrastructure.Tests/Registrations/ClientProfileExtractorTests.cs`
- `src/Infrastructure.Tests/Registrations/RegistrationAnswerValidatorTests.cs`
- `src/Api.IntegrationTests/Wave1RegistrationIntegrationTests.cs`
- `web/components/activities/form-field-editor.tsx`
- `web/components/registration/registration-form.tsx`
- `web/lib/activities-api.ts`
- `web/lib/form-schema-utils.ts`
- `web/lib/form-schema-utils.test.ts`
- `web/lib/iso-clock-time.ts`
- `web/lib/iso-clock-time.test.ts`

### Change Log

- 2026-08-29: Implemented Story 30.3 Wave 1 toolbox types and country. Status → review.
- 2026-08-30: Adversarial code review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 3 patch, 16 dismissed. No AC violations.
- 2026-08-30: Applied all 3 review patches. Status → done.
- 2026-08-30: Re-review after patches — clean. 0 patch, 19 dismissed. No AC violations.

### Review Findings

- [x] [Review][Re-review] Clean — prior patches hold; remaining hunter items dismissed (required+max=0, parse mismatches, coverage nits)
- [x] [Review][Patch] Switching `info` → `section_header` leaves `infoText`, so schema save fails [web/components/activities/form-field-editor.tsx:148]
- [x] [Review][Patch] `multi_choice` min can exceed option count, making a required field unsatisfiable [src/Infrastructure/Activities/FormSchemaValidator.cs:387]
- [x] [Review][Patch] `multi_choice` min/max cast to `int` throws on values above `Int32.MaxValue` [src/Infrastructure/Registrations/RegistrationAnswerValidator.cs:363]
