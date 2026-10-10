# NFR — PlatformAdmin light-only appearance

Date: 2026-10-10
Workflow: bmad-testarch-nfr
Model: Cursor Grok 4.6
Supersedes: global light-only NFR written earlier the same day

## Accessibility

Platform light: no serious/critical Axe on Overview. Tenant light and tenant dark: Axe run after closing ThemeToggle; no serious/critical. Focus rings and status semantics unchanged.

## Security / auth

No auth, PlatformAdminOnly, billing, Paddle, support, audit, or entitlement changes. Appearance PATCH remains the tenant Settings persistence path. Visiting Platform does not issue `themePreference=light`.

## Reliability

Platform first paint does not depend on storage cleanup. ThemeScript forces light on Platform before storage/OS. A trailing ThemeScript plus `useLayoutEffect` covers next-themes' injected script and SPA entry.

## Compatibility

`next-themes`, `.dark` tokens, operator/public storage, and profile `themePreference` remain supported outside Platform. Old keys are not destroyed.

## Verdict

PASS for the scoped correction. DigitalOcean host remains Epic 19 / out of scope.
