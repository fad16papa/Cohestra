# Story 42.2 component and state ownership

| Concern | Owner | Persistence |
|---|---|---|
| Composition draft | `ActivityFormTab.draftSchema` | Component state; reset on activity/schema load |
| Dirty | `ActivityFormTab` JSON compare vs `savedSchema` | Bubbles `onDirtyChange` |
| Selected node | `FormCompositionBuilder.selectedBlockId` | Component state; not URL; not localStorage |
| Inspector expanded (1024–1279) | `FormCompositionBuilder.inspectorOpen` | Component state |
| Inspector Sheet (`<1024`) | `FormCompositionBuilder.sheetOpen` | Component state |
| Viewport composition | CSS + `useSyncMedia` flags | Not stored |
| Build/Preview | `ActivityFormTab.formStudioMode` | Component state |
| Preview tree | `BuilderSurface keepMounted={false}` | Unmounted when hidden |
| Palette dialog | `FormCompositionBuilder.paletteOpen` | Existing |
| Plan locks | `ActivityFormTab` → builder props | Existing |
| Activity status | Activity record | Existing |

Resize must not create a second draft, a second selected id, or a second inspector form.
