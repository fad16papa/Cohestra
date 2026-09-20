# Epic 36 — First execution checkpoint (pre–Story 36.1)

**Date:** 2026-09-20  
**Gate:** PRD + UX + Architecture complete — **implementation authorized**

## 1. Epic number

**Epic 36** — next available after Epic 35 (`done` in `sprint-status.yaml`). No `epic-36` collision found.

## 2. Product gap

Form Studio is a **schema/field editor + Experience configurator**, not a **visual composer**. Operators cannot place content blocks, sections, columns, or domain-bound Activity context without duplicating data.

## 3. Current Form Studio capability map

| Area | Today (`activity-form-tab.tsx`, `form-field-editor.tsx`, `activity-design-tab.tsx`) |
|------|-------------------------------------------------------------------------------------|
| Build | Linear `fields[]` editor; palette dialog; drag reorder **fields only**; templates |
| Content | `meta.introMarkdown`, `section_header` / `info` field types (limited) |
| Design | Preset, brand, hero; Experience layout/flow/style (Epic 35) |
| Preview | Build/Preview toggle; mobile/desktop viewport; canonical `PublicRegistrationOpen` |
| Structure | Pro step buckets; no columns |
| Domain | Activity header in **shell**, not composable blocks |
| Style public impact | Partial — post-epic PR #324 addresses Modern Centered on branch not merged to `main` |

## 4. Proposed MVP (Epic 36)

- Composition schema + normalization (36.1)
- Visual builder palette + reorder + keyboard (36.2)
- Content blocks + sections (36.3)
- 2-column layout (36.4)
- Design tokens + Modern/Minimal + Modern Centered quality (36.5)
- Tablet/mobile Preview (36.6)
- Domain blocks + entitlements + regression (36.7)

## 5. Deferred

- Declarative logic builder (Phase 2)
- Template marketplace (Phase 3)
- AI-assisted creation (Phase 4)
- 3-column layouts, editorial/bold/soft styles

## 6. Schema architecture decision

**AD-1 Dual-layer:** keep `fields[]` for inputs/validation/submission; add optional `composition[]` for order + presentation + structure + domain blocks. Legacy = linear composition synthesized from fields.

## 7. Story decomposition

See `epics-form-studio-2-0-36.md` — seven vertical stories.

## 8. Entitlements (verified against PRD + code)

| Plan | Builder MVP |
|------|-------------|
| Basic | Fields, reorder, sections, baseline content, Modern Centered, Modern/Minimal, Preview |
| Core | + Split/Poster experience, columns, domain blocks, richer tokens, website link rules |
| Pro | + Conversational (existing), future logic |

Server gates required (Epic 35 pattern).

## Absorption decision

**Post-Epic Modern Centered visual-quality story** → **Story 36.5**, not standalone epic. Close backlog story when 36.5 ships.

## Blockers

None for Story 36.1 start.

## Next action

Implement **Story 36.1** on branch `cursor/epic-36-story-36-1-composition-schema-a139` (or stack on planning PR merge).
