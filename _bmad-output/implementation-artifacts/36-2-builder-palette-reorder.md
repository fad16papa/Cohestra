# Story 36.2 — Builder shell + palette + reorder UI

**Epic:** 36  
**Status:** accepted  
**Depends on:** 36.1 accepted (merged `1904628`)

## User story

As a tenant operator, I can see my form as ordered blocks, add fields from a palette, reorder them, and preview the result without editing JSON.

## Scope

- Builder workspace (palette | canvas | field settings)
- Input field blocks only (no content/section/column blocks — Story 36.3+)
- Drag + keyboard reorder on top-level `fieldRef` composition
- Draft schema v2 on first builder mutation; v1 opens via effective linear projection
- Preview + public form honor composition field order (single-page flow)

## Acceptance

- [x] Builder shell replaces linear-only field list for Form tab Build mode
- [x] Palette adds field + matching fieldRef atomically
- [x] Reorder updates composition; field IDs stable
- [x] Keyboard move up/down works
- [x] Drag reorder (row drop targets + dataTransfer ref fallback)
- [x] Selection by block id survives reorder and field id rename
- [x] Empty state with primary add action
- [x] Unsaved draft visible in Preview
- [x] Public RegistrationForm renders fields in composition order
- [x] v1 forms open and edit without manual migration until save
- [x] Save/reload preserves order (v2) — integration + live checkpoint
- [x] bmad-code-review / adversarial / checkpoint (HEAD `a317cdc`, PR #327 CI green)

## Evidence

- Live checkpoint: `/opt/cursor/artifacts/bmad-36-2-SUCCESS-final-report.md`, drag fix `bmad-36-2-drag-after-fix.png`
- CI: run [35504739482](https://github.com/fad16papa/Cohestra/actions/runs/35504739482)

## Out of scope

- Content blocks, sections, columns (36.3–36.4)
- Design tokens / Modern Centered (36.5)
