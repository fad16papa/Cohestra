---
story_id: 30.4
story_key: 30-4-slash-add-field-palette
epic: 30
status: done
baseline_commit: 381a7a4efb30a07474cd22ae9b09b54d38f725c1
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/implementation-artifacts/30-3-wave-1-toolbox-types-and-country.md
---

# Story 30.4: Slash-add Field palette

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As an Operator,
I want `/` or **+** to open a toolbox palette,
So that I can add Email and Hidden without treating the type `<select>` as the primary path.

**FRs:** FR-RC-8. **UX:** UX-DR-RC-1, UX-DR24, UX-DR28, UX-DR32.

## Acceptance Criteria

1. **Given** I am on the Form tab list editor (UX-DR24)
   **When** I type `/` or activate **+**
   **Then** a palette dialog opens grouped as the Always toolbox: Text, Long text, Number, Email, Phone, Link, Date, Time, Yes/No, Choice, Dropdown, Multi-choice, Checkbox, Consent, Referral, Country, Section, Info, Hidden
   **And** keyboard arrows + Enter select; Esc closes (UX-DR28)
   **And** adding a type inserts a Field in the list; reorder stays grip / up-down
   **And** the existing type dropdown remains as fallback
   **And** there is no drag-and-drop canvas, no column layout, no “typed prose becomes a Field” (UX-DR32, UX-DR-RC-1)
   **And** NPS, CSAT, ranking, matrix, and payment are not in the palette

2. **Given** an empty Form
   **When** the tab loads
   **Then** **+** is visible without requiring a Field to exist first

3. **Given** I add Email + Hidden via the palette (types from 30.1–30.3)
   **When** I save, preview, and publish (Publish Gate still requires required phone or email)
   **Then** public submit and admin Answers work as in those stories

## Tasks / Subtasks

- [x] **Task 1 — Palette data + dialog** (AC: 1, 2)
  - [x] `web/lib/form-field-palette.ts`: Always group with 19 items in toolbox order; map labels (Dropdown → `select`, Referral → `referral_source`, Section → `section_header`, Link → `url`). Exclude scale/emergency/survey/payment types.
  - [x] `filterFormFieldPaletteItems(query)` for optional search inside dialog.
  - [x] `FormFieldPaletteDialog`: modal `role="dialog"`, focus trap, ArrowUp/Down + Enter + Esc; backdrop click closes.

- [x] **Task 2 — Wire FormFieldEditor** (AC: 1, 2, 3)
  - [x] **+** opens palette (footer + empty-state CTA). `/` opens palette when focus is not in an input/textarea/select.
  - [x] Selecting a type calls existing `createDefaultField` + append + select new field; steps auto-bucket when enabled.
  - [x] Keep type `<select>` + Add button as fallback (unchanged behavior).

- [x] **Task 3 — Tests** (AC: 1)
  - [x] Vitest: palette item count/order; every palette type ∈ `formFieldTypeOptions`; filter; excluded types absent.
  - [x] `tsc --noEmit`.

- [x] **Task 4 — Verify**
  - [x] No API/domain changes. No scale/emergency (30.5). No canvas.

## Dev Notes

### Palette order (form-component-toolbox.md)

Text · Long text · Number · Email · Phone · Link · Date · Time · Yes/No · Choice · Dropdown · Multi-choice · Checkbox · Consent · Referral · Country · Section · Info · Hidden

### Reuse

- `createDefaultField`, `formFieldTypeLabels`, `autoBucketField` from existing Form tab code.
- Dialog UX mirrors `admin-command-palette.tsx` (fixed overlay, list, keyboard nav) — do not reuse admin nav items.

### Previous story (30.3) learnings

- All Wave 1 types already in `formFieldTypeOptions` / `createDefaultField`.
- Type dropdown was the only add path in 30.3 — this story adds palette without removing it.

### Out of scope

- `scale` / `emergency` palette entries (Story 30.5)
- Plan-locked disabled rows (30.5)
- Slash inside field property inputs should not open palette

### Project context

Web-only story. Extend-only; match existing tokens (`border-border-warm`, `focus-visible:ring-ring`).

## Dev Agent Record

### Agent Model Used

Cursor Composer

### Debug Log References

- Branched from Story 30.3 (`cursor/wave-1-toolbox-types-d861`) — Epic 30 types not yet on `main`.

### Completion Notes List

- Added Always toolbox palette (19 types) with search, keyboard nav, and dialog a11y.
- Form tab: **+** in empty state and footer opens palette; `/` opens when not typing in inputs.
- Type dropdown + Add kept as fallback. No backend changes.

### File List

- `_bmad-output/implementation-artifacts/30-4-slash-add-field-palette.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `web/lib/form-field-palette.ts`
- `web/lib/form-field-palette.test.ts`
- `web/components/activities/form-field-palette-dialog.tsx`
- `web/components/activities/form-field-editor.tsx`

### Change Log

- 2026-08-30: Implemented Story 30.4 slash-add field palette. Status → review.
- 2026-08-30: Adversarial code review. 3 patch, 0 defer, 12 dismissed. No AC violations.
- 2026-08-30: Applied all 3 review patches. Status → done.
- 2026-08-30: Re-review after patches — clean. 0 patch, 13 dismissed. No AC violations.

### Review Findings

- [x] [Review][Re-review] Clean — prior patches hold; remaining hunter items dismissed (focus trap mirrors admin palette, test coverage nits)
- [x] [Review][Patch] Palette stays open and can add fields when editor becomes disabled [web/components/activities/form-field-editor.tsx:190]
- [x] [Review][Patch] Tab-focused option vs activeIndex: Enter adds wrong type [web/components/activities/form-field-palette-dialog.tsx:82]
- [x] [Review][Patch] IME composition Enter adds field mid-input [web/components/activities/form-field-palette-dialog.tsx:82]
