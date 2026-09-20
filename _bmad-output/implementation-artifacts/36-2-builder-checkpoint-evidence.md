# Story 36.2 — Checkpoint evidence (automated)

**Date:** 2026-09-20  
**HEAD:** (see branch `cursor/epic-36-story-36-2-builder-palette-reorder-a139`)

## Environment note

Cloud agent VM has no PostgreSQL/Redis/Docker; live operator UI walkthrough was not executed here. Save/reload is covered by `FormSchemaCompositionIntegrationTests` (runs in CI with services).

## Verified flows (automated)

| Flow | Evidence |
|------|----------|
| Palette → field + fieldRef | `form-composition-mutations.test.ts` |
| Reorder preserves field ids | `form-composition-mutations.test.ts`, `form-composition-builder-flow.test.ts` (22 blocks) |
| Canvas reorder with non-fieldRef sibling | `form-composition-mutations.test.ts` |
| Selection block id after reorder | `form-composition-builder-flow.test.ts` |
| Field id rename → fieldRef + visibleWhen + selection | `syncCompositionAfterFieldIdChange`, builder callback |
| Preview key on unsaved reorder | `form-studio-preview-key.test.ts`, builder-flow test |
| Public render order | `form-composition-order.test.ts` + `RegistrationForm` uses `orderedFields` |
| v2 persist payload | `form-composition-builder-flow.test.ts` `formSchemaForPersist` |
| API save/reload composition order | `FormSchemaCompositionIntegrationTests.cs` |

## Pending for full ACCEPT

- Live Form Studio checkpoint (add → reorder → Preview → Form) on operator dashboard
- Full PR #327 CI matrix (stacked on #326 until merge)
