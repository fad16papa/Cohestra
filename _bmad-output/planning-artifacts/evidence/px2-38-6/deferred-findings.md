# Story 38.6 deferred findings

These are inventoried, named, and **out of this story**. They are not 38.6 defects.

| Finding | Owner | Notes |
| --- | --- | --- |
| Cookie consent custom `role="dialog"` | 43.5 | DESIGN.md D20 / §19.2. Placement vs skip link is 43.5. |
| Calendar FAB popout custom `role="dialog"` | 39.2 / 43.5 | Do not change FAB accessible name (43.5) or calendar IA (39.2). |
| Website builder onboarding tour custom dialog | later website | Not in Epic 38 backlog. |
| Form Studio field palette custom dialog | 42.3 | Listbox semantics story. Do not restyle Form Studio. |
| No React-nested product modal pair | n/a | Authenticated product does not stack two `Dialog` trees. Sibling shell modals are exclusive instead of a global overlay stack. |
| Production DigitalOcean deploy | classification C | SSH inputs missing. Unchanged. |
| Owned `inert` re-assert waits for next childList sync | later polish | Observer is childList by 38.6 contract. |
| Empty-portal reclassify is async | n/a | MutationObserver microtask; product portals are `data-base-ui-portal` from insert. |
