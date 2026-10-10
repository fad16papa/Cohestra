# SPEC — PlatformAdmin light-only appearance

Date: 2026-10-10
Workflow: bmad-spec
Model: Cursor Grok 4.6
Baseline: `3fc6151517a4cd15a83e2d5c47a845c08b3b38a7`
Frozen: Story 44.9 PR #430 at `31da0413491080f13251165f939bee961d2e2f5a`
Supersedes: global Cohestra light-only kernel written earlier the same day

## Intent

PlatformAdmin is a fixed light operational console. Every other Cohestra surface keeps the existing Light / Dark / System theme system.

## Kernel

- `/platform` and `/platform/**` (including `/platform/login`) always resolve light before first paint.
- Platform ignores OS `prefers-color-scheme`, operator storage, public session storage, and profile `themePreference`.
- Platform shows no theme selector.
- Platform must not write `themePreference = light` or overwrite `cohestra-theme-operator` / public session keys.
- Tenant/admin/operator, public registration, tenant website, and tenant auth keep Light / Dark / System.
- Settings → Appearance and admin ThemeToggle remain.
- `isPlatformLightOnlyPath(pathname)` is the only shared route helper.
- Preferred mechanism: existing ThemeProvider + `forcedTheme="light"` on Platform + ThemeScript Platform branch.

## Out of scope

- Story 44.9 / PR #430
- Epic 44 business logic
- Form Studio design / Website Studio redesign
- Global removal of next-themes or `.dark`
- Production deploy / merge
