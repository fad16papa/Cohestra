---
id: light-only
key: light-only-application-appearance
title: Cohestra light-only application appearance
status: review
created: 2026-10-10
baseline_commit: 3fc6151517a4cd15a83e2d5c47a845c08b3b38a7
frozen_pr_430: 31da0413491080f13251165f939bee961d2e2f5a
---

# Story: Cohestra light-only application appearance

Status: in-progress

Owner correction. Not Story 44.9. PR #430 is frozen.

## Story

As **every Cohestra user**,
I want **one predictable light application appearance**,
so that **the product never switches into a global dark skin from OS, storage, or profile preference**.

## Locked semantics

- Application mode = light only
- No ThemeToggle, no Settings → Appearance, no Light/Dark/System selector
- First paint: remove `.dark`, `color-scheme: light`
- Brand accent / Form Studio / Website Studio design features preserved
- Profile `ThemePreference` may remain in API/DB; it does not control rendering
- No destructive migration

## Acceptance

1. No user can switch application dark mode
2. `prefers-color-scheme: dark` ignored
3. Old `theme` / `cohestra-theme-operator` / `cohestra-theme-public-session` / profile dark ignored
4. Settings Appearance removed; `/settings/appearance` redirects safely
5. Brand accent still works on the light surface
6. Platform Overview is a coherent light application
7. Epic 44 business logic untouched

### Agent Model Used

Cursor Grok 4.6 exclusive. Composer 2.5 not delegated.
