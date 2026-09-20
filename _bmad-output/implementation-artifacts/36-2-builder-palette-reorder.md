# Story 36.2 — Builder shell + palette + reorder UI

**Epic:** 36  
**Status:** review  
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

- [x] Builder shell replaces linear-only field list for Form tab Build mode
- [x] Palette adds field + matching fieldRef atomically
- [x] Reorder updates composition; field IDs stable
- [x] Keyboard move up/down works
- [x] Selection by block id survives reorder
- [x] Empty state with primary add action
- [x] Unsaved draft visible in Preview (composition in preview key + draft schema)
- [x] Public RegistrationForm renders fields in composition order
- [x] v1 forms open and edit without manual migration until save (ensureBuilderEditableSchema on mutate)
- [x] Save/reload preserves order (v2) — `FormSchemaCompositionIntegrationTests` + client persist round-trip tests
- [x] Automated builder flow tests + adversarial fixes (canvas reorder, selection on id rename)
- [ ] Live operator checkpoint (see `36-2-builder-checkpoint-evidence.md`) — required before DONE

## Out of scope

- Content blocks, sections, columns (36.3–36.4)
- Design tokens / Modern Centered (36.5)
