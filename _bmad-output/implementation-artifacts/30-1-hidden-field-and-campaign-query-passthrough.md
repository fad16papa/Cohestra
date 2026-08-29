---
story_id: 30.1
story_key: 30-1-hidden-field-and-campaign-query-passthrough
epic: 30
status: in-progress
baseline_commit: 8af47caed5926649793883f6d5dd676d02ccfff7
created: 2026-08-29
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/specs/spec-registration-capture/field-types.md
  - _bmad-output/specs/spec-registration-capture/brownfield.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-registration-capture-2026-08-29/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-registration-capture-2026-08-29/EXPERIENCE.md
  - docs/contracts/activity-form-schema-v1.md
---

# Story 30.1: Hidden Field and campaign query passthrough

Status: in-progress

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As an Operator,
I want a Hidden Field whose value comes from the public link query string,
so that an Instagram `?ref=wa` write lands on the Registration and Client history without Maya seeing attribution chrome.

**FRs:** FR-RC-1, FR-RC-2. **SPEC:** CAP-1. **UX:** UX-DR-RC-2 (HiddenChip admin-only).

## Acceptance Criteria

1. **Given** I am on an unpublished Activity Form tab
   **When** I add a Field with `type: "hidden"` and id `ref` (existing type `<select>` is enough — slash-add is Story 30.4)
   **Then** `PUT /api/v1/admin/activities/{id}/form-schema` accepts it
   **And** `form_schema.version` stays `1`
   **And** unknown types still return `400` ProblemDetails
   **And** a required Hidden Field does **not** satisfy the Publish Gate
   **And** `ClientProfileExtractor` does not map Hidden values to Client name, phone, or email — even if the Field id is `full_name` / `name` / `email`

2. **Given** the public Form for that Activity
   **When** a Participant opens `/register/{slug}`
   **Then** no Hidden `<input>`, chip, label, or query echo is rendered
   **And** admin Form-tab preview (`RegistrationForm` `variant="preview"`) shows a **Hidden · filled from link** chip (UX-DR-RC-2)

3. **Given** Hidden Field id `ref` and URL `?ref=wa`
   **When** the Participant submits a valid Form
   **Then** `registrations.answers.ref` is `"wa"`
   **And** Client profile → Registration answers (`ClientRegistrationHistory`) shows the Field label with value `wa`
   **And** HTML is stripped; value max length 200
   **And** unknown query keys are ignored
   **And** public GET/submit stay a single payload (NFR-RC-5) — do not add an API just to resolve query
   **And** Operator help copy does not encourage putting emails in the query string (PRD §12 Privacy / epic NFR-RC-10)

4. **Given** Hidden Field id `ref` and no `?ref=`
   **When** they submit
   **Then** the Answer is empty **or** the operator `defaultValue`
   **And** submit still succeeds (required Hidden never blocks Participant submit)

5. **Given** an existing Activity that only uses today’s v1 types
   **When** I save its Form without Hidden Fields
   **Then** it remains valid (NFR-RC-1)

## Tasks / Subtasks

- [ ] **Task 1 — Domain + contract (additive v1 only)** (AC: 1, 5)
  - [ ] Add `FormFieldTypes.Hidden = "hidden"` to `All`. **Do not** add it to `NonInput` (that set skips answer persist — `section_header` only).
  - [ ] Add optional `DefaultValue` on `FormFieldDefinition` and `FormFieldDefinitionDto` (last param, default `null`). JSON camelCase `defaultValue`. `ActivityFormSchemaJson` already ignores nulls on write — existing rows stay unchanged.
  - [ ] Map `DefaultValue` in `FormSchemaValidator.MapToDomain` and `FormSchemaMapper.ToDto`. Update the two current `new FormFieldDefinitionDto(...)` call sites.
  - [ ] Document `hidden` + `defaultValue` in `docs/contracts/activity-form-schema-v1.md` as **v1.1 additive**; `version` stays `1`. Add `hidden` to `docs/contracts/public-registration-v1.md` answer types (string, max 200).

- [ ] **Task 2 — Schema + publish + extract + answers** (AC: 1, 3, 4, 5)
  - [ ] `FormSchemaValidator`: accept `hidden`. Reject options / consentText / phoneCountry / placeholder on hidden. Allow optional `defaultValue` (trim; max 200; HTML stripped on save). Update the “type must be one of: …” error string.
  - [ ] Hidden **may** be `required: true` (AC tests this). It still must not satisfy Publish Gate. **Do not** force `required: false` the way `section_header` does.
  - [ ] `PublishGateValidator`: no production logic change (still required `phone` **or** `email`). Add a unit test so a required-only-hidden schema still fails publish.
  - [ ] `RegistrationAnswerValidator.Validate`: Hidden never fails required. Sanitize string (strip HTML, trim, max 200). Over-length after strip → `400` with ProblemDetails via existing Invalid path.
  - [ ] `NormalizeAnswers`: if Hidden answer missing/blank, use sanitized `defaultValue` when set. Query/body value wins over `defaultValue`. Drop unknown answer keys (already true — loop schema fields only).
  - [ ] `ClientProfileExtractor`: no Hidden case that writes name/phone/email. Add a unit test: `type: hidden`, id `full_name`, value `Maya` → `NameFromForm` stays null.
  - [ ] `ClientRegistrationAnswerFormatter` already emits every schema field with a non-empty string. Hidden with value `wa` will appear — **do not** skip Hidden. **Do not** build a new Activity Registrations detail page; that tab is a name/date list that links to `/clients/{id}` (Story 3.10). Client history is the admin Answer surface.

- [ ] **Task 3 — Web authoring + preview chip** (AC: 1, 2, 3)
  - [ ] `FormFieldType` + `parseFormSchema` read `defaultValue`.
  - [ ] `form-schema-utils.ts`: label **Hidden**; add to `formFieldTypeOptions` / `createDefaultField`. Prefer default id `ref` when free, else `hidden` / `hidden-2`. No placeholder UI for hidden. Add `defaultValue` input + help: Field ID must match the query key (`ref` → `?ref=wa`). Privacy line: campaign refs only — do not put emails in the link.
  - [ ] `isNonInputFieldType` stays `section_header` only. Add `isHiddenFieldType` (or equivalent). `getFormSchemaClientIssues`: hidden cannot have placeholder/options/consent; `defaultValue` ≤ 200.
  - [ ] `form-field-editor.tsx`: type dropdown is the add path (no slash palette). When type is hidden, hide placeholder; show defaultValue + help.
  - [ ] `registration-form.tsx` `variant="preview"`: render HiddenChip only — muted pill, text exactly `Hidden · filled from link`. Reuse existing muted/chip classes (`DESIGN.md` `hidden-chip` / `{colors.muted-chip}`). No new brand color.

- [ ] **Task 4 — Public query passthrough** (AC: 2, 3, 4)
  - [ ] Public `variant="public"`: **omit Hidden from the DOM** (do not use `<input type="hidden">` — that is still chrome and can leak in inspect).
  - [ ] On submit, merge Hidden answers from `window` / `useSearchParams`: for each Hidden Field, `searchParams.get(field.id)` only (O(fields), NFR-RC-5). Unknown query keys ignored. Do **not** read query in preview (`/activities/{id}?tab=form` must not treat `tab` as a value).
  - [ ] Missing key or blank → omit or send `defaultValue`; client validation **must not** require Hidden.
  - [ ] Same `POST /api/v1/public/registrations` body. No new route. Embed parent-query is Story 32.2 — skip.

- [ ] **Task 5 — Tests** (AC: all)
  - [ ] Unit: `FormSchemaValidatorTests` (accept hidden; reject unknown; reject placeholder/options on hidden; reject `defaultValue` > 200; existing text/phone/email schema still valid).
  - [ ] Unit: `PublishGateValidator` test file (new, next to FormSchema tests) — hidden-only required fails; phone+hidden publishes.
  - [ ] Unit: `RegistrationAnswerValidatorTests` — query-like `ref=wa`; HTML stripped; max 200; missing succeeds; `defaultValue` applied in Normalize.
  - [ ] Unit: `ClientProfileExtractor` (new test class if none) — Hidden never extracts.
  - [ ] Integration: seed published activity **plus** a Hidden `ref` field, `POST` answers including `ref: "wa"`, assert JSONB `answers.ref` and client history formatter value. Missing `ref` still `201`.
  - [ ] Web: unit-test the query helper (match by Field id; ignore extras; blank → default). No Playwright required.

- [ ] **Task 6 — Verify** (AC: all)
  - [ ] `dotnet test Cohestra.sln --filter "Category!=Integration"`
  - [ ] `dotnet build` + web typecheck as you already do for form stories
  - [ ] Do not change `TenantPlanLimits`. Do not write `registration_theme` into `form_schema`.

## Dev Notes

### Current state (read these before editing)

| File | Today | This story |
|---|---|---|
| `src/Domain/Activities/FormFieldTypes.cs` | 8 types. `NonInput` = `section_header` only | Add `hidden` to `All` only |
| `src/Domain/Activities/ActivityFormSchema.cs` | Field: id, type, label, required, placeholder, options, consentText, phoneCountry | Add `DefaultValue` |
| `src/Contracts/Activities/ActivityFormSchemaDto.cs` | Positional record; `PhoneCountry` last | Add `string? DefaultValue = null` last — **breaks** every `new FormFieldDefinitionDto(` until updated (2 sites) |
| `FormSchemaValidator.cs` | Unknown type 400; hardcoded type list in error | Accept hidden; forbid extra props; map/strip `defaultValue` |
| `PublishGateValidator.cs` | Required phone **or** email; consent must be required | Unchanged logic; **test** Hidden does not satisfy |
| `RegistrationAnswerValidator.cs` | Skips `NonInput`; required string fails if empty | Hidden never required; sanitize; Normalize fills `defaultValue` |
| `ClientProfileExtractor.cs` | Switch on `text` / `phone` / `email` / `consent` / `referral_source` | No Hidden mapping (default already safe — **prove with test**) |
| `ClientRegistrationAnswerFormatter.cs` | All schema fields with non-empty values | Hidden with value shows; do not filter Hidden out |
| `web/lib/form-schema-utils.ts` | `Record<FormFieldType, …>` for labels + defaults | Must add `hidden` or TypeScript will not compile |
| `web/lib/activities-api.ts` `parseFormSchema` | Drops unknown field keys | Must read `defaultValue` |
| `web/components/registration/registration-form.tsx` | Unknown types fall through to a **visible text input** | Hidden must be handled **before** the default text input or Participants will see a Campaign-ref box |
| `web/components/activities/activity-form-tab.tsx` | Preview uses `variant="preview"` | Chip appears via RegistrationForm; no tab rewrite |
| `web/components/activities/activity-registrations-tab.tsx` | List: ID, name → `/clients/{id}`, date | **Out of scope** — answers live on Client profile |
| `web/components/clients/client-registration-history.tsx` | Renders formatter strings as React text | XSS-safe if persist strips tags; no `dangerouslySetInnerHTML` |

### Invariants — do not break

- One Form per Activity. Field `id` is the CRM key (`^[a-z0-9][a-z0-9_-]{0,63}$`).
- `form_schema.version` remains `1`. Additive types only.
- Answers immutable after submit. Do not rewrite historical JSONB.
- `registration_theme` stays off `form_schema`.
- `TenantPlanLimits` (250 / 500 / 5,000) unchanged.
- Public IA stays `/register/{slug}`. No new public route.
- `POST /api/v1/public/registrations` stays the only submit. Redis rate limit unchanged.
- ProblemDetails on API errors. DTOs in `Contracts` only.
- No Form canvas. No slash palette (30.4). No Wave 1 types (30.2–30.3). No piping (30.6). No embed parent query (32.2).

### Hidden vs `section_header` (common LLM trap)

| | `section_header` | `hidden` |
|---|---|---|
| In `NonInput`? | Yes | **No** |
| Persists Answer? | No | **Yes** |
| Participant UI | Heading | **Nothing** |
| Admin preview | Heading | HiddenChip |
| `required: true` | Rejected by schema | Allowed; ignored for publish + submit |
| Extra props | No placeholder/options/consent/phone | Same + optional `defaultValue` |

If you put `hidden` in `NonInput`, CAP-1 fails: `answers.ref` will never persist.

### Query fill rules (lock these)

1. **Match key = Field `id`**, case-sensitive as stored (ids are lowercase).
2. **Query wins** over `defaultValue` when the key is present and the sanitized value is non-empty.
3. **Absent or blank query** → sanitized `defaultValue`, or omit/empty. Submit succeeds.
4. **Unknown query keys** ignored (do not iterate `searchParams` and write extras into answers).
5. **Server is source of truth** for default + strip + max 200 so integration tests that POST JSON still behave.
6. **Preview / admin** must not apply the Activity admin URL query.

HTML strip: `HtmlSanitizer` 9.0.892 is already in `Infrastructure.csproj`. For Hidden values, **clear all allowed tags** (plain text). Do **not** reuse `CampaignEmailBodyProcessor`’s allowlist (that keeps markup). After sanitize: trim; if length > 200, reject on submit / reject on schema save for `defaultValue`.

### UX copy (lock)

- Chip text: `Hidden · filled from link` (en-dash as in DESIGN.md).
- Help near Field ID / defaultValue: Field ID is the query key. Example: id `ref` reads `?ref=wa`.
- Privacy: use campaign refs (e.g. `wa`, `ig`). Do not put email addresses in the registration link.
- No Participant attribution chrome. No query echo on `/register/{slug}`.

### Admin Answers path (do not invent IA)

There is **no** Registration-detail page with raw JSON. Activity Registrations tab links to the Client. `ClientRegistrationAnswerFormatter` + `ClientRegistrationHistory` is the AC surface. After persist, formatter will list Hidden if the value is non-empty. Search on that card already matches answer values.

### Out of scope (will fail review if shipped here)

- Slash `/` palette, Wave 1 types, scale/emergency, piping, Closed message, Close-at, operator notify, saved templates, Recipes, steps, embed, Contact section.
- Adding Hidden to Tennis / Pickleball / Board Game launch templates.
- New tables, migrations, endpoints, or `form_schema` version bump.
- Report / campaign filters (PRD: later).
- `<input type="hidden">` on the public page.

### Architecture / stack (follow existing)

- .NET 9, EF Core 9, ProblemDetails, `Contracts` DTOs, xUnit in `Infrastructure.Tests` + `Api.IntegrationTests`.
- Next 16 / React 19 / TS strict / `@/` imports. `useSearchParams` is already used on other client pages (billing, reports). Prefer a pure helper `collectHiddenAnswers(fields, searchParams)` tested without rendering.
- Integration tests: `CI=true`, fresh `cohestra_test` if you run Category=Integration. Seed via `SeedPublishedActivityAsync` then **mutate** `activity.FormSchema.Fields` to append Hidden `ref` (helper currently seeds text/phone/email/consent only — do not change the helper’s default fields for all tests; append in this story’s test). Phone seed is `PH` + `09181234567` style — keep that if you reuse the helper answers.

### Project context

See `_bmad-output/project-context.md`: brownfield extend-only; no parallel app; nullable on; no major upgrades.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
