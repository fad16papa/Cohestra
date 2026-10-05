# Story 42.3 DnD and sensor inventory

Status: locked. No third-party drag library is installed (`package.json` has no `@dnd-kit`, `react-beautiful-dnd`, or Hello Pangea).

## Form Studio canvas (`FormCompositionBuilder`)

| Concern | Current |
|---|---|
| Library | None — HTML5 `draggable` on the handle `<button>` |
| Sensors | Mouse: `dragstart` / `dragover` / `drop` / `dragend`. Touch: **no working sensor** (HTML5 drag does not start from touch in Chromium/WebKit mobile) |
| Activation | Immediate on HTML5 dragstart. No delay, no distance threshold |
| Operation | `reorderCompositionBlocks(schema, fromIndex, toIndex)` via `reorderTo` / `moveBlock` |
| Keyboard | Move up / Move down buttons; adjacent-row only; same mutation |
| Handle | `p-1` + `GripVertical size-4` + `touch-none`. Name: `Drag to reorder {title}` |
| Row body | Not draggable. `role="option"` selects and opens inspector |
| Scroll | Canvas `overflow-y-auto`. `touch-none` on handle only (already scoped) |
| Auto-scroll | None |
| Pointer capture | None |
| Selection | `selectedBlockId` unchanged by reorder |
| Focus after reorder | Not managed; click on Move up/down leaves focus on that button |
| Live region | None |
| Disabled | `disabled` prop from archived/read-only; handle `draggable={!disabled}` |

## Website Studio sections (`website-section-fields.tsx`)

| Concern | Current |
|---|---|
| Library | None |
| Sensors | HTML5 drag **and** pointer capture (`setPointerCapture` + document `pointermove`/`pointerup`) |
| Activation | Pointer: immediate on `pointerdown` button 0. HTML5 suppressed while pointer drag is active |
| Keyboard | ArrowUp / ArrowDown on the handle; mobile Move up/down (`lg:hidden`, `icon-sm` 28px) |
| Handle | `px-1.5 py-2` + `size-4` + `touch-none`. Name: `Drag to reorder {label}` |
| Operation | `reorderSections` |

## Decision

Keep native HTML5 for mouse. Add Form Studio pointer capture on the **handle only**, matching Website, calling the same `reorderCompositionBlocks`. Do not introduce a library. Do not run `bmad-correct-course` (no library change).
