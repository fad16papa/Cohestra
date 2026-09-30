# Story 38.6 independent code review

Reviewed HEAD `6cc2bb76`, then patched on this follow-up commit.

## Layers

| Layer | Result |
| --- | --- |
| Blind Hunter | 1 MAJOR (⌘K stacking), several MINOR |
| Edge Case Hunter | 1 MAJOR (same ⌘K/Escape), several MINOR |
| Acceptance Auditor | AC 14 MAJOR (dark/forced-colors evidence) |

## Dispositions

| Finding | Severity | Disposition |
| --- | --- | --- |
| ⌘K opens palette on top of page dialogs; Escape dismisses both | MAJOR | **Patched.** Palette open is refused while `dialog-content` / `alert-dialog-content` exists. Live: Preview + Ctrl+K keeps one dialog. |
| Dark/forced-colors screenshots did not show the overlay | MAJOR | **Patched.** Overlay-clipped screenshots after opacity 1; forced-colors computed border/color; axe `color-contrast` on open overlays. Recaptured PNGs show the palette. |
| Insert QR matrix claimed tab/axe without running them | MINOR | **Patched.** QR now runs trap + axe. |
| Palette sr-only Close first in tab order | MINOR | **Patched.** Close moved to end of palette. |
| Palette restore when invoker unmounts | MINOR | **Deferred.** Documented fallback is Search / More / `#main-content`; route-change test asserts overlay gone and landmarks intact. Owner: later polish if PO wants explicit `finalFocus`. |
| Inert released at `open=false` during 160ms exit | MINOR | **Deferred.** After-close contract holds; exit-window is 160ms. |
| More `finalFocus` after viewport crosses to desktop | MINOR | **Deferred.** 39.2 IA; More is `md:hidden`. |
| Browser Back does not close More sheet | MINOR | **Deferred.** 39.2 navigation. |
| No `aria-modal` attribute | MINOR | **Deferred.** Base UI + HTML `inert` used. Not failed in axe `aria-modal-attr` (empty). |

No remaining BLOCKER or unresolved MAJOR on the patched HEAD.
