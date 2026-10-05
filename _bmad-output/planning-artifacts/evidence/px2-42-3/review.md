# Story 42.3 four-layer review

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general. All Grok 4.6. Same HEAD as implementation + tests. Composer 2.5 did not review.

## Blind Hunter

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| BH-1 | — | No `@dnd-kit` / Hello Pangea / rbd added | dismiss — inventory confirmed native HTML5 + pointer |
| BH-2 | — | Whole-row `draggable` | dismiss — only `BuilderReorderHandle` is draggable |
| BH-3 | — | Broad `touch-none` | dismiss — `touch-none` only on the handle |
| BH-4 | — | Visually 44px / smaller hit | dismiss — e2e measures the button `boundingBox`, not a pseudo-element |
| BH-5 | MINOR | Document `pointermove` `preventDefault` could freeze scroll if pointerup is lost | dismiss-with-note — Escape, `pointercancel`, `lostcapture`, and unmount detach listeners |
| BH-6 | — | Hidden library migration | dismiss — no package.json DnD change |

## Edge Case Hunter

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| ECH-1 | — | Tap / same-index / Escape cancel leave schema unchanged | verified by e2e + `reorderCompositionBlocks(schema, 0, 0)` |
| ECH-2 | — | First-up / last-down disabled | verified |
| ECH-3 | — | Nested column sibling reorder | verified (two left-column fields) |
| ECH-4 | — | Archived/read-only cannot reorder | verified |
| ECH-5 | — | Basic can reorder; Two-column row stays locked | verified |
| ECH-6 | — | Invalid nested drop uses existing mutation, does not invent a second model | dismiss — same as prior HTML5 drop |
| ECH-7 | — | Focus after reorder stays on `form-studio-reorder-{id}` | verified |
| ECH-8 | MINOR | `onLostPointerCapture` may commit at last `dropIndex` | dismiss — matches Website Studio; cancel/Escape still clear without commit |

## Acceptance Auditor

| AC | Result |
|---|---|
| 1 Explicit 44px `Reorder {item}` handle; drag only from handle; row body scrolls | pass |
| 2 Mouse / touch / keyboard share `reorderCompositionBlocks` | pass |
| 3 Move up/down, focus, selection, live region | pass |
| 4 Cluster 44px; no product-wide sweep | pass |
| 5 Website shared-defect 44px handle + mobile Move | pass |
| 6 Role/plan/archived | pass |
| 7 Story 42.2 D7 + preview unmount | pass (42.2 e2e green) |
| 8 A11y themes / axe | pass |
| 9 Frontend-only, no new draft store | pass |
| 10 Protected suites | pass except unrelated 39.4 clip |

## Adversarial-general

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| ADV-1 | — | Playwright HTML5 `DragEvent` is not OS mouse-drag | dismiss — it drives the same `onDragStart`/`onDrop` mouse path; `dragTo` does not start HTML5 in Chromium |
| ADV-2 | MINOR | Website e2e briefly mutates the live demo draft | patch-in-test — restore + save in `finally` |
| ADV-3 | — | Mouse-only test claimed as touch | dismiss — separate `pointerType: "touch"` + document listeners |
| ADV-4 | — | `touch-none` treated as touch support | dismiss — tests do not assert `touch-none` as proof |
| ADV-5 | — | Keyboard removed | dismiss |
| ADV-6 | — | Story 42.4 / Epic 43 started | dismiss — not in sprint-status |
| ADV-7 | — | Global `icon-xs` changed | dismiss |
| ADV-8 | — | 39.4 failure is this story | dismiss — client-profile header clip; classified unrelated |
| ADV-9 | NIT | No mid-gesture “drag in progress” still | dismiss — `touch-390.png` is the committed result; opacity/drop ring remain in product |
| ADV-10 | — | Composer owned sensors | dismiss — Composer unused |

## Independently verified BLOCKER / MAJOR

None remaining on this HEAD.

## Unrelated / classified

| Item | Class | Notes |
|---|---|---|
| 39.4 client-profile 768 clipped | unrelated | PageHeader on `/clients/{id}`; assertion unchanged |
| `duplicateFieldIds` unused | pre-existing | Form Studio warning, not introduced |
| `_draft` / `showToast` unused | pre-existing | Website section fields |

Story stays at `review` for product-owner pre-merge.
