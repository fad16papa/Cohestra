# Story 38.6 overlay/focus architecture

Recorded 2026-09-30 before application-code changes, then updated when sibling-modal Escape proved unsafe.

## Decision

One overlay engine: `@base-ui/react` through `components/ui/{dialog,alert-dialog,sheet,popover}`.

Authenticated **modals** must use `dialog` | `alert-dialog` | `sheet`. Popovers stay **non-modal**. There is no dropdown-menu primitive.

## Primitive contract

| Primitive | Role | Modal | Pointer dismiss | Motion | Focus |
| --- | --- | --- | --- | --- | --- |
| `ui/dialog` | `dialog` | yes | yes (non-destructive) | 160ms local; PRM CSS zeros `[data-slot]` | `initialFocus` / `finalFocus` passthrough; trap via FloatingFocusManager |
| `ui/alert-dialog` | `alertdialog` | yes | **no** (`disablePointerDismissal` omitted from AlertDialog Root; always true) | 160ms | trap; Esc cancels |
| `ui/sheet` | `dialog` | yes | yes | 160ms; close control `size-11` named Close | `finalFocus` to invoker |
| `ui/popover` | non-modal | no | yes | 100ms press budget | Esc restores; background stays interactive |

## Background inert

Base UI hides siblings with `aria-hidden` / `data-base-ui-inert` but does not set the HTML `inert` attribute. Chromium then Tabs from the last overlay control onto `document.body` on sparse dialogs (email preview has few tab stops). Shared Dialog / AlertDialog / Sheet roots call `useModalInert`, which refcounts and sets `inert` on non-portal `document.body` children so Tab wraps inside the overlay island.


Command palette (`AdminShellProvider`) and More sheet (`AdminMobileTabBar`) are **sibling** Dialog roots, not React-nested. Base UI Escape uses each root’s *own* nested count (`isTopmost`), so two open siblings would both treat Escape as theirs.

Policy: **only one shell modal at a time**.

- Opening the palette (`commandOpen`) closes the More sheet.
- Opening More calls `closeCommandPalette()` then opens the sheet.
- Product form/preview/alert dialogs are not stacked with each other in the React tree; sequential open/close is the real flow.

## Migrations (this story)

- Command palette, campaign email preview, insert QR → `ui/dialog`.
- Existing `AlertDialog` callers inherit real `alertdialog` + blocked outside-click.
- More sheet already used `Sheet`; named restore + 44px close.

## Named exceptions (not migrated)

| Surface | Owner |
| --- | --- |
| Cookie banner `role="dialog"` | 43.5 / D20 |
| Calendar popout `role="dialog"` | 39.2 / 43.5 |
| Website onboarding tour | later / website |
| Form Studio field palette | 42.3 listbox |

## 38.5 protection

Skip link, one `#main-content` main, one route `h1` remain in the document. While a modal is open, the a11y tree may hide background. After close they return.
