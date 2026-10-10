# NFR — Light-only application appearance

Date: 2026-10-10
Workflow: bmad-testarch-nfr
Model: Cursor Grok 4.6

## Accessibility

Light semantic contrast pairs remain the only application token skin. Forced-colors still maps `:root`. No serious/critical Axe color-contrast regression is accepted on Platform Overview.

## Security / auth

No auth, PlatformAdminOnly, billing, Paddle, support, audit, or entitlement changes. Appearance PATCH still accepts ThemePreference as compatibility payload for brand-accent saves.

## Reliability

First paint does not depend on storage cleanup succeeding. ThemeScript is try/catch and only removes `.dark`.

## Compatibility

Old `theme` / `cohestra-theme-operator` / `cohestra-theme-public-session` and profile `themePreference` remain inert.

## Verdict

PASS for the scoped correction. DigitalOcean host remains Epic 19 / out of scope.
