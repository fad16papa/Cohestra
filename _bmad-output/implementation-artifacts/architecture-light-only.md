# Architecture — Light-only application appearance

> **SUPERSEDED.** Global deletion of next-themes is no longer the product contract.
> See `sprint-change-proposal-2026-10-10-platform-admin-light-only.md` and the updated SPEC.
> Historical artifact — do not implement this document.

Date: 2026-10-10
Workflow: bmad-architecture (Winston)
Model: Cursor Grok 4.6

## Decision

Delete the dynamic application theme runtime. Do not keep next-themes, ThemeProvider, ThemePreferenceSync, public theme storage, or a resolver that can still apply `.dark`.

## Removed

- `next-themes`
- `ThemeProvider` / `ThemePreferenceSync` / `ThemeToggle` / public theme context
- Theme bootstrap that read localStorage / sessionStorage / `prefers-color-scheme`
- Settings Appearance section and nav item
- Reachable `.dark` semantic-token inversion in `brand-tokens.css`

## Retained

- First-paint `ThemeScript` that only removes `.dark` and sets `color-scheme: light`
- `html { color-scheme: light }` and `<meta name="color-scheme" content="light">`
- Brand accent CSS-variable overlay on admin routes (light surface contrast)
- `PATCH /api/v1/admin/me/appearance` for brand accent; `themePreference` is compatibility payload
- Form Studio / Website Studio / registration design features
- Platform `--plat-*` aliases to global light semantic tokens

## Compatibility

Old storage keys and profile `ThemePreference=dark|system` remain harmless because nothing reads them for rendering. No destructive migration.
