# Code review — registration Back/Next overflow

**HEAD reviewed:** `da54ba3` (re-review after shrink patch; prior pass was `230fa24`)  
**PR:** https://github.com/fad16papa/Cohestra/pull/291  
**Loop:** Mandatory Code Review Loop — current implementation HEAD

## Layers

| Layer | Result |
| --- | --- |
| Blind Hunter | Findings raised; see triage |
| Edge Case Hunter | No unhandled edge cases |
| Acceptance Auditor | PASS — implementation matches spec |

## Triage

| ID | Source | Finding | Severity | Bucket | Resolution |
| --- | --- | --- | --- | --- | --- |
| 1 | blind | Stacking was a product choice vs a flex-1 row | MAJOR claimed | dismiss | User reported the side-by-side row destroyed the page. Public column is 480px; stacked full-width matches step 1 and was browser-verified. Not a defect. |
| 2 | blind | `w-full` remains a tripwire if a row returns | MAJOR claimed → MINOR | patch | Public Back/Next now also use `min-w-0 shrink` so they can share a row without overflowing. |
| 3 | blind | `max-w-full` does not override `shrink-0` | MINOR | patch | Addressed by `shrink` + `min-w-0` on the buttons. |
| 4 | blind | Form `min-w-0` is mostly inert | MINOR | dismiss | Harmless. The layout column `min-w-0` is the flex item that matters. |
| 5 | auditor | Extra shrink classes not named in spec | NIT | dismiss | Additive containment, does not change layout. |
| 6 | blind | PublicFormLayout `min-w-0` is unscoped | MINOR | defer | Correct flex default for the 480px track; other public forms benefit. |

No unresolved BLOCKER or MAJOR.

## Product / UX acceptance

Browser-verified on `http://default.localhost:3000/register/fnm` (stepped form):

- Step 1: single full-width Next
- Step 2: Back stacked above Next, form-column width, no horizontal overflow
- Dark mode and ~375px mobile: same stacked layout, no overflow
- Back returns to the previous step

Screenshots: `/opt/cursor/artifacts/screenshots/register-step2-stacked-dark.webp`
