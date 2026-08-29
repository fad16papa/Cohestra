---
story_id: 31.1
story_key: 31-1-visiblewhen-recipes
epic: 31
status: review
created: 2026-08-29
baseline_commit: 55ffa75aadae9a6156077b819f0a2d55bce27e91
---

# Story 31.1: visibleWhen Recipes

Status: review

## Story

As a Core or Pro Operator,
I want named Recipes (and a simple equals / notEquals custom rule) so a Field shows only when another Field matches,
so that guest name is required only when Maya is bringing a guest — without a logic IDE.

## Acceptance Criteria

1. Core/Pro can save `visibleWhen: { fieldId, equals | notEquals }` on `form_schema` version `1`. Circular Recipes → `400`. Publish Gate unchanged.
2. Public Form: controller No → guest name not rendered/required; Yes → shown and required. Empty guest + No succeeds; empty + Yes fails.
3. Server drops spoofed Answers for currently invisible Fields. Registration + Client still succeed.
4. Basic save of `visibleWhen` → `403 plan_locked`.
5. No nested AND/OR, calculate, jump, regex, or contains.

## Tasks / Subtasks

- [x] Domain + validator + plan gate
- [x] Answer validate/normalize drops invisible spoofs
- [x] Operator Recipe picker (presets + custom)
- [x] Public renderer hides invisible Fields
- [x] Tests

## Dev Notes

Brownfield: extend `FormFieldDefinition`, `FormSchemaValidator`, `RegistrationAnswerValidator`, Form tab, `registration-form.tsx`. Equivalent controller: `select`/`checkbox` with value `yes` (Wave 1 `yes_no` not required). `TenantPlanLimits` unchanged.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Completion Notes List

- Additive `visibleWhen` on version `1`. Cycle / missing target / both operators rejected at save.
- Basic tenants get `403 plan_locked` with `errorCode` on Form schema save when any Recipe is present.
- Public + preview hide invisible Fields. Required only while visible. `NormalizeAnswers` drops spoofs.
- Recipe picker: presets + custom equals/notEquals. Basic sees a locked hint, not a missing hole.
- Controller equivalent is `select`/`checkbox` (`yes`/`true` normalize to `yes`).

### File List

- `src/Domain/Activities/ActivityFormSchema.cs`
- `src/Contracts/Activities/ActivityFormSchemaDto.cs`
- `src/Infrastructure/Activities/VisibleWhenEvaluator.cs`
- `src/Infrastructure/Activities/FormSchemaPlanLockedException.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/FormSchemaMapper.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Infrastructure.Tests/Activities/VisibleWhenEvaluatorTests.cs`
- `src/Infrastructure.Tests/Registrations/VisibleWhenAnswerTests.cs`
- `web/lib/activities-api.ts`
- `web/lib/form-visibility.ts`
- `web/lib/form-visibility.test.ts`
- `web/lib/form-schema-utils.ts`
- `web/components/activities/form-field-editor.tsx`
- `web/components/registration/registration-form.tsx`
- `docs/contracts/activity-form-schema-v1.md`
- `docs/contracts/public-registration-v1.md`

### Change Log

- 2026-08-29: Story 31.1 implemented — visibleWhen Recipes, plan gate, spoof drop.
