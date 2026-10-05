# Story 42.3 architecture

Status: locked. Agent: Architect + UX + accessibility + security (Grok 4.6).

## Chosen correction

1. Shared `BuilderReorderHandle`: semantic button, `min-h-11 min-w-11`, `Reorder {item}`, `touch-none` only here, `aria-grabbed`, visible focus ring.
2. Form Studio: keep HTML5 mouse drag on that handle. Add pointer capture for `touch` / `pen` that resolves drop via `[data-form-studio-row-index]` and calls `reorderTo` → `reorderCompositionBlocks`.
3. Form Studio cluster: Move up/down/delete `min-h-11 min-w-11`; select/edit `min-h-11`.
4. Website: swap the grip to `BuilderReorderHandle`; keep existing pointer + HTML5 + Arrow key path; enlarge mobile Move up/down to 44px.
5. Polite `aria-live` on the Form Studio canvas: `Moved {name} to position {n} of {total}`.

## Scroll vs drag

- Row body / option / buttons: no `touch-none`. Vertical pan scrolls the workspace.
- Handle only: `touch-action: none` so the library/browser does not steal the gesture. Pointerdown on handle starts the gesture; movement updates drop target; pointerup commits if index changed.
- Tap (no row change) and `pointercancel` / Escape: clear state, no mutation.

## Rejected

| Alternative | Why |
|---|---|
| Whole-row drag | Blocks scroll, selection, inspector open |
| New DnD library | Not required; stop + `bmad-correct-course` if proven otherwise |
| Remove keyboard | Forbidden |
| `touch-none` on the row | Freezes page scroll |
| Change `reorderCompositionBlocks` | Hit-target problem, not a model problem |
| Product-wide 44px | 43.5 |

## Lifecycle

- Pointer listeners attach on handle down, detach on up/cancel/unmount/navigation.
- Drag overlay is CSS on the source/target rows only (`opacity` / drop ring). No portal. Must clear on end.
- Preview stays unmounted in Build. Resize does not save.

## Security

Frontend-only. Draft stays in `ActivityFormTab`. No schema logging. No new localStorage. Drag index is in-component; changing activity remounts the tab and clears it. Server authorization remains authoritative.
