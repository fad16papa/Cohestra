---
story_id: 31.2
story_key: 31-2-optional-identity-details-consent-steps
epic: 31
status: review
created: 2026-08-29
baseline_commit: 55ffa75aadae9a6156077b819f0a2d55bce27e91
---

# Story 31.2: Optional Identity → Details → Consent steps

Status: review

## Story

As a Pro Operator,
I want a single “Split into steps” toggle,
so that a long Form can be Identity / Details / Consent without making QR-at-the-door a Typeform interview.

## Acceptance Criteria

1. Pro toggle on → auto-bucket name/phone/email → Identity; consent → Consent; else Details. Move Fields in the list editor. Preview shows buckets.
2. Toggle is the only enablement (not Field count). Next validates current step; one submit on last step; Client identical to single-page.
3. Toggle off (default) → no stepper; one page.
4. Basic/Core enabling steps → `403 plan_locked`. Core may still use Recipes.
5. Invisible Recipe Fields on a step are not required; server still drops spoofs.

## Tasks / Subtasks

- [x] Meta `splitIntoSteps` + Field `step` + auto-bucket
- [x] Plan gate Pro+
- [x] List editor bucket chip + move between steps
- [x] Public Next/Back stepper
- [x] Tests

## Dev Notes

Depends on 31.1 visibility. Do not add a canvas. Default remains single page.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Completion Notes List

- `meta.splitIntoSteps` default false. Auto-bucket fills missing `step` only when the toggle is on. Operator can move a Field via the Step select in the list editor.
- Pro/Enterprise only. Core can keep Recipes. Basic/Core save with the toggle on → `403 plan_locked`.
- Public/preview: Next validates the current step’s visible Fields; Back; one submit on the last step. Same POST payload as single-page.
- Recipe-invisible Fields stay unrequired; server still drops spoofs.

### File List

- `src/Domain/Activities/FormFieldSteps.cs`
- `src/Infrastructure/Activities/FormFieldStepAssigner.cs`
- `src/Infrastructure.Tests/Activities/FormFieldStepAssignerTests.cs`
- `web/lib/form-steps.ts`
- `web/lib/form-steps.test.ts`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/form-field-editor.tsx`
- `web/components/registration/registration-form.tsx`

### Change Log

- 2026-08-29: Story 31.2 implemented — optional Identity/Details/Consent steps.
