---
id: light-only
key: light-only-application-appearance
title: PlatformAdmin light-only appearance
status: review
created: 2026-10-10
baseline_commit: 3fc6151517a4cd15a83e2d5c47a845c08b3b38a7
frozen_pr_430: 31da0413491080f13251165f939bee961d2e2f5a
supersedes: global Cohestra light-only
---

# Story: PlatformAdmin light-only appearance

Status: in-progress

Owner scope correction. Not Story 44.9. PR #430 is frozen.

Previous correction (global Cohestra light-only) is superseded. Tenant/operator/public theme architecture remains a supported Cohestra capability.

## Story

As **a PlatformAdmin**,
I want **the platform console to stay light**,
so that **OS dark mode and stored tenant preferences cannot invert the operational UI**.

As **a tenant/admin operator**,
I want **Light / Dark / System to keep working**,
so that **visiting PlatformAdmin does not erase my workspace appearance**.

## Locked semantics

- PlatformAdmin `/platform` and `/platform/**` (including `/platform/login`) = light only
- Route helper: `isPlatformLightOnlyPath(pathname)`
- First paint on Platform: resolved theme = light, no `html.dark`, `color-scheme: light`
- Platform light is a route override — do not persist `themePreference`, operator storage, or public session keys
- Tenant/admin/public/registration/website keep ThemeProvider, ThemeToggle, Settings → Appearance, next-themes
- Brand accent / Form Studio / Website Studio design features preserved
- No destructive migration

## Acceptance

1. PlatformAdmin + OS light/dark/stored dark/stored system → light
2. Platform login + OS dark → light, no theme selector
3. Tenant dashboard selected dark/light/system resolves as before
4. Settings → Appearance exists with Light / Dark / System and profile persistence
5. Tenant admin ThemeToggle, public registration ThemeToggle, tenant website theme preserved
6. Tenant dark → Platform light → tenant dark; no appearance PATCH to light
7. Platform Overview is a coherent light application under OS/stored dark
8. Epic 44 business logic untouched

### Agent Model Used

Cursor Grok 4.6 exclusive. Composer 2.5 not delegated.
