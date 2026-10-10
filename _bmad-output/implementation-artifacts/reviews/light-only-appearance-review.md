# BMAD code review — Light-only application appearance

Date: 2026-10-10
HEAD: 9d3fa6a331df95a64d2488ddf2ddc40d8f7e5fae
Reviewer: Cursor Grok 4.6
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor
PR: https://github.com/fad16papa/Cohestra/pull/431
Frozen: PR #430 not modified

## Verdict

PASS after in-loop fix of the Story 38.4 semantic-token contract that still required a `.dark` CSS block.

## Findings

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| R1 | BLOCKER | `parseBrandTokens` / contrast matrix still required `.dark` after token-skin removal | FIXED — light-only pairs; dark map empty |
| R2 | MINOR | Leftover `dark:` Tailwind utilities remain in some components | Accepted — unreachable without `html.dark`; first-paint script removes `.dark`; token inversion gone |
| R3 | NIT | `updateAppearancePreference` unused wrapper remains | Kept for API compatibility |
| R4 | NIT | Historical UX/epic artifacts still describe ThemeToggle | Correct — superseded, not rewritten |
| R5 | MAJOR | Tenant website header left an empty flex slot after ThemeToggle removal | FIXED — render header actions only for cinemaFold |

## Targeted hunt

- ThemeToggle hidden but dark mode still active: **no** — ThemeScript no longer reads storage/OS; `.dark` token skin removed
- ThemeScript still applying system dark: **no**
- stale `.dark` class: first paint removes it; no runtime adder remains
- prefers-color-scheme controlling app: **no**
- old localStorage / public session / profile dark winning: **no**
- dead Appearance route: redirects to `/settings/profile`
- Brand Accent accidentally removed: **no**
- Form Studio design removed: **no**
- Story 44.x logic touched: **no**
- next-themes left in: **removed**
- ThemePreference destructively migrated: **no**
