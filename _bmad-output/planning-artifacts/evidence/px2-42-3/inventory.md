# Story 42.3 touch-target inventory

Class-computed sizes (confirmed later by Playwright bounding boxes). Tailwind `p-1` = 4px, `size-4` = 16px, `icon-xs` = 24px, `icon-sm` = 28px.

| Component | Surface | W×H (computed) | Pointer | Touch | Keyboard | Name | Disposition |
|---|---|---|---|---|---|---|---|
| Form Studio handle | `/activities/{id}?tab=form` canvas row | ~24×24 (`p-1`+`size-4`) | HTML5 drag | `touch-none`; drag does not start | Focusable button | `Drag to reorder {item}` | **42.3** → 44×44, `Reorder {item}`, pointer sensor |
| Form Studio Move up | same | 24×24 `icon-xs` | click | tap (small) | button | `Move {item} up` | **42.3** cluster 44×44 |
| Form Studio Move down | same | 24×24 | click | tap | button | `Move {item} down` | **42.3** |
| Form Studio select/edit | same `role="option"` | width flexible, height ~32 (`py-1`) | click | tap | button | visible title | **42.3** `min-h-11` |
| Form Studio delete | same | 24×24 | click | tap | button | `Remove {item}` | **42.3** |
| Inspector column move | inspector | text button `min-h-11` already | click | tap | button | Move to left/right column | Keep; already 44 |
| Inspector toggle (42.2) | <1280 | `min-h-11 min-w-11` | click | tap | button | Block properties | Keep; 42.2 |
| Sheet close (38.6) | <1024 | `size-11` | click | tap | button | Close | Keep |
| Palette insert | palette | full-width `py-2` (~36h) | click | tap | button | field type | **43.5** (not reorder cluster) |
| Canvas empty drop | canvas | N/A | HTML5 drop | n/a | n/a | — | Keep drop on rows/empty |
| `FormFieldEditor` list handle | not mounted on Form Studio | ~24×24 | HTML5 | `touch-none` | button | `Drag to reorder {field}` | **43.5** |
| Website section handle | `/website` editor | ~28×32 | HTML5 + pointer | pointer works; target small | ArrowUp/Down | `Drag to reorder {label}` | **42.3** 44×44 name `Reorder {label}` |
| Website Move up/down | `/website` `lg:hidden` | 28×28 `icon-sm` | click | tap | button | `Move {label} up/down` | **42.3** 44×44 |
| Website Visible / remove | `/website` | mixed | click | tap | — | Visible / remove | **43.5** |
| Website 390 Phone/Desktop/Fullscreen | 42.1 chrome | `h-7` | click | tap | — | viewport | **43.5** (not this story) |

Playwright measured the rendered boxes after the correction: Form Studio handle / Move / delete ≥44×44 at every required D7 viewport; Website section handle and mobile Move down ≥44×44. Class inspection alone was not used as close evidence.
