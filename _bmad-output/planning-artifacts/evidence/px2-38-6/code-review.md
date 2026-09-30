# Story 38.6 independent code review

## Review of `6cc2bb76` / `ece03f94` (implementation)

Reviewed HEAD `6cc2bb76`, then patched on follow-up commits through `ece03f94`.

### Layers

| Layer | Result |
| --- | --- |
| Blind Hunter | 1 MAJOR (⌘K stacking), several MINOR |
| Edge Case Hunter | 1 MAJOR (same ⌘K/Escape), several MINOR |
| Acceptance Auditor | AC 14 MAJOR (dark/forced-colors evidence) |

Those MAJORs were patched on `ece03f94`.

## Review of `7bb9c80a` (PO pre-merge inert-ownership patch)

Mandatory Code Review Loop: current implementation HEAD only. Layers re-run on `93092c51..7bb9c80a`.

| Layer | Result |
| --- | --- |
| Blind Hunter | 1 alleged BLOCKER, several alleged MAJOR — triaged below |
| Edge Case Hunter | unhandled-path JSON — triaged below |
| Acceptance Auditor | **fully compliant** with the five PO constraints |

### Dispositions (`7bb9c80a`)

| Finding | Severity (layer) | Bucket | Disposition |
| --- | --- | --- | --- |
| Foreign `inert` on a node that later becomes an overlay is not stripped | alleged BLOCKER | dismiss | **Required by PO.** Never remove inert owned by another component. Tests assert a pre-inert portal stays inert after it gains `dialog-content`. |
| `resetModalInertForTests` leaves stale `owned` | alleged MAJOR | dismiss | False. Reset clears holders then `syncModalInert()`, which restores every owned element. Vitest covers reset vs unrelated inert. |
| `subtree: true` walks on every descendant childList | alleged MAJOR | dismiss | **Required by PO** (reclassify empty portals after subtree population). Lock is held only while a modal is open. |
| Owned `inert` stripped without a childList mutation is not re-asserted until the next mutation | alleged MAJOR | defer | MINOR. Observer is `childList` by contract. Re-assert exists on the next sync. |
| Observer reclassify is async (microtask); empty portal briefly inert | alleged MAJOR | defer | MINOR. Inherent to MutationObserver. Product overlays use `data-base-ui-portal` from the start and are never claimed. |
| `owned` Map documents original values but claims always store `null` | MINOR | dismiss | Claims only run when the attribute is absent; original is always `null`. Restore of a non-null original is defensive. |
| Overlay flags change via attributes without childList | MINOR | dismiss | Out of this correction. PO required subtree **child** additions. |
| `document.body` null during observe/sync | edge | dismiss | Client `useLayoutEffect` / jsdom tests always have `body`. |
| `element.inert` IDL true without attribute | edge | dismiss | HTML `inert` IDL reflects the attribute. |
| Nested empty `data-base-ui-portal` that is not a body child | edge | defer | Pre-existing `isOverlayPortal` classification; not this patch. |

No remaining BLOCKER or unresolved MAJOR on HEAD `7bb9c80a`.
