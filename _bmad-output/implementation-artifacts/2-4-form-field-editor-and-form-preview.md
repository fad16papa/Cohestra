---
baseline_commit: 4daa64a
---

# Story 2.4: FormFieldEditor and Form Preview

Status: done

## Story

As an operator,
I want to add, remove, and reorder form fields with a structured editor,
So that each Activity captures the right information without a developer.

## Acceptance Criteria

1. **AC-2.4.1 — FormFieldEditor (UX-DR24)**
   - **Given** I am on Activity detail Form tab
   - **When** I use FormFieldEditor
   - **Then** I can add/remove/reorder fields via structured list (no drag-and-drop canvas)
   - **And** I can mark fields required or optional
   - **And** an admin preview variant of RegistrationForm shows the current schema (UX-DR9 preview)

2. **AC-2.4.2 — Schema save scope (FR-2)**
   - **Given** I change the form schema
   - **When** I save
   - **Then** changes apply to new Registrations only; prior submissions unchanged

## Tasks / Subtasks

- [x] **Task 1: Activity detail Form tab** (AC: 2.4.1)
  - [x] Overview + Form tabs on `/activities/{id}`
  - [x] `ActivityFormTab` wires editor, preview, and save

- [x] **Task 2: FormFieldEditor** (AC: 2.4.1)
  - [x] Add/remove/reorder via up/down controls (no canvas DnD)
  - [x] Edit type, label, id, required, placeholder, options, consent text

- [x] **Task 3: RegistrationForm preview** (AC: 2.4.1)
  - [x] `RegistrationForm` with `variant="preview"` bordered card
  - [x] Inline validation on blur; submit disabled in preview mode

- [x] **Task 4: Save integration** (AC: 2.4.2)
  - [x] `saveActivityFormSchema` on Save form
  - [x] Copy explains new registrations only (FR-2)

- [x] **Task 5: Verify build** (AC: all)
  - [x] `npm run lint` and `npm run build` pass

## Dev Notes

- Template picker (TGH Tennis, etc.) ships in Story 2.5
- Public registration submit ships in Epic 3 (`RegistrationForm` public variant ready)
- Archived activities: form editor read-only (API also blocks saves)

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Activity detail tabs: Overview + Form
- FormFieldEditor structured list with all v1 field types
- RegistrationForm admin preview with blur validation
- Save persists via Story 2.3 API; FR-2 messaging in UI

### File List

- `web/lib/form-schema-utils.ts`
- `web/components/registration/registration-form.tsx`
- `web/components/activities/form-field-editor.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/activity-detail-page-client.tsx`

### Change Log

- 2026-06-16: Story 2.4 implemented — FormFieldEditor and registration preview on activity Form tab

### Review Findings

- [x] [Review][Patch] Preview keeps stale field values after schema changes [`web/components/registration/registration-form.tsx:46-48`]
- [x] [Review][Patch] Form draft not reset when navigating to a different activity [`web/components/activities/activity-form-tab.tsx:28-30`]
- [x] [Review][Patch] Duplicate field IDs editable with no client-side warning [`web/components/activities/form-field-editor.tsx:44,222-230`]
- [x] [Review][Patch] Field ID format not validated client-side (API rejects uppercase/invalid chars) [`web/components/activities/form-field-editor.tsx:222-230`]
- [x] [Review][Patch] Consent text can be cleared to empty, causing save to fail at API [`web/components/activities/form-field-editor.tsx:258-261`]
- [x] [Review][Defer] Tab list missing `tabpanel` / `aria-controls` wiring [`web/components/activities/activity-detail-page-client.tsx:80-102`] — deferred, a11y polish

### Re-review (2026-06-16, post-patch)

- [x] [Review][Patch] Unsaved form draft lost when switching Overview ↔ Form tabs [`web/components/activities/activity-detail-page-client.tsx:135-141`]
- [x] [Review][Defer] Client validation omits empty labels and option value rules (API rejects on save) [`web/lib/form-schema-utils.ts:173-203`] — deferred, API is source of truth for MVP
