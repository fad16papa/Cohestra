# SPEC — Cohestra light-only application appearance

Date: 2026-10-10
Workflow: bmad-spec
Model: Cursor Grok 4.6
Baseline: `3fc6151517a4cd15a83e2d5c47a845c08b3b38a7`
Frozen: Story 44.9 PR #430 at `31da0413491080f13251165f939bee961d2e2f5a`

## Intent

Cohestra has one application appearance: light. Users, operating systems, and old stored preferences cannot switch the product into a global dark skin.

## Kernel

- Application mode is always light.
- No ThemeToggle, no Settings → Appearance, no Light / Dark / System selector.
- First paint removes `.dark` and sets `color-scheme: light` without reading storage or `prefers-color-scheme`.
- Brand accent, Form Studio design, Website Studio branding remain.
- Profile `ThemePreference` may remain stored; it does not control rendering.
- No destructive database migration.

## Out of scope

- Story 44.9 / PR #430
- Epic 44 business logic
- Form registration themes / Website Studio redesign
- Production deploy / merge
