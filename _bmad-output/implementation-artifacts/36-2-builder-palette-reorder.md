# Story 36.2 — Builder shell + palette + reorder UI

**Epic:** 36  
**Status:** in-progress  
**Depends on:** 36.1 accepted

## User story

As a tenant operator, I can see my form as ordered blocks, add fields from a palette, reorder them, and preview the result without editing JSON.

## Scope

- Builder workspace (palette | canvas | field settings)
- Input field blocks only (no content/section/column blocks — Story 36.3+)
- Drag + keyboard reorder on top-level `fieldRef` composition
- Draft schema v2 on first builder mutation; v1 opens via effective linear projection
- Preview + public form honor composition field order (single-page flow)

## Acceptance

- [ ] Builder shell replaces linear-only field list for Form tab Build mode
- [ ] Palette adds field + matching fieldRef atomically
- [ ] Reorder updates composition; field IDs stable
- [ ] Keyboard move up/down works
- [ ] Selection by block id survives reorder
- [ ] Empty state with primary add action
- [ ] Unsaved draft visible in Preview
- [ ] Public RegistrationForm renders fields in composition order
- [ ] v1 forms open and edit without manual migration until save
- [ ] Save/reload preserves order (v2)
- [ ] Tests + code review + checkpoint

## Out of scope

- Content blocks, sections, columns (36.3–36.4)
- Design tokens / Modern Centered (36.5)
