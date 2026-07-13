---
baseline_commit: 4daa64a
---

# Story 2.5: Launch Form Template Seeds

Status: done

## Story

As an operator,
I want preset templates for TGH Tennis, Ikigai Pickleball, and Board Game Night,
So that I can launch activities in under 15 minutes (SM-4).

## Acceptance Criteria

1. **AC-2.5.1 — Template picker (FR-2)**
   - **Given** I am configuring a new Activity form
   - **When** I select a template (TGH Tennis, Ikigai Pickleball, or Board Game Night)
   - **Then** the form schema populates with the proposal field sets including referral source

2. **AC-2.5.2 — ConsentBlock seed (UX-DR14)**
   - **Given** I select the Board Game Night template
   - **When** the schema loads in the editor and preview
   - **Then** it includes a `consent` field type with required consent copy

## Tasks / Subtasks

- [x] **Task 1: Template definitions** (AC: 2.5.1, 2.5.2)
  - [x] `web/lib/form-templates.ts` — three `ActivityFormSchema` seeds from addendum.md
  - [x] TGH Tennis, Ikigai Pickleball, Board Game Night field sets
  - [x] `referral_source` on all three; `consent` on Board Game Night

- [x] **Task 2: Template picker UI** (AC: 2.5.1)
  - [x] `FormTemplatePicker` on Activity Form tab
  - [x] Apply template replaces draft fields (deep clone)

- [x] **Task 3: Verify build** (AC: all)
  - [x] `npm run lint` and `npm run build` pass

## Dev Notes

- Templates are client-side seeds only; no API seed endpoint in MVP
- Operator customizes after apply, then saves via Story 2.3 API
- Publish gate and QR (Stories 2.6–2.8) follow

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Three launch templates aligned to addendum.md field lists
- Form tab shows template cards above editor + preview
- Board Game Night includes required `community_consent` consent field

### File List

- `web/lib/form-templates.ts`
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/activity-form-tab.tsx`

### Change Log

- 2026-06-16: Story 2.5 implemented — launch form template seeds and picker on Form tab

### Review Findings

- [x] [Review][Patch] Preview keeps stale field values after applying a template [`web/components/registration/registration-form.tsx:46-48`]
- [x] [Review][Patch] Form draft not reset when navigating to a different activity [`web/components/activities/activity-form-tab.tsx:28-30`]
- [x] [Review][Patch] Duplicate field IDs editable with no client-side warning [`web/components/activities/form-field-editor.tsx:44,222-230`]
- [x] [Review][Patch] Field ID format not validated client-side (API rejects uppercase/invalid chars) [`web/components/activities/form-field-editor.tsx:222-230`]
- [x] [Review][Patch] Consent text can be cleared to empty, causing save to fail at API [`web/components/activities/form-field-editor.tsx:258-261`]
- [x] [Review][Defer] Tab list missing `tabpanel` / `aria-controls` wiring [`web/components/activities/activity-detail-page-client.tsx:80-102`] — deferred, a11y polish

### Re-review (2026-06-16, post-patch)

- [x] [Review][Patch] Unsaved form draft lost when switching Overview ↔ Form tabs [`web/components/activities/activity-detail-page-client.tsx:135-141`]
- [x] [Review][Defer] Client validation omits empty labels and option value rules (API rejects on save) [`web/lib/form-schema-utils.ts:173-203`] — deferred, API is source of truth for MVP
