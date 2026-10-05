# Story 42.3 operation-equivalence proof

Agent: Grok 4.6. Mutation function is unchanged: `reorderCompositionBlocks`.

## Single operation

| Input | Path | Function |
|---|---|---|
| HTML5 mouse drag | `onDragStart` / `onDrop` → `reorderTo` | `reorderCompositionBlocks(schema, from, to)` |
| Touch/pen pointer | handle pointer + document listeners → `finishHandlePointerDrag` → `reorderTo` | same |
| Keyboard / Move up/down | `moveBlock` → adjacent sibling index → same function | same |

Vitest `builder-reorder-equivalence.test.ts`:

- Mouse/keyboard/pointer share the identical result for Full name ↔ Email on the nested schema.
- Field ids are unchanged.
- Same-index and missing-index are no-ops.
- Nested sibling reorder stays inside the left column (`block-phone` / `block-nested`).

## Schema fields that must not change

`fields[]` ids, section children, column children shape, visible conditions, validation, delete/unwrap, plan-gated inserts, save/publish, public renderer, and registration payload are not edited in this story.
