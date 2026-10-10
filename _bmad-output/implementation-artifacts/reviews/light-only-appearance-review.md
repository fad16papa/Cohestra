# BMAD code review — PlatformAdmin light-only appearance

Date: 2026-10-10
HEAD: fa356f3faf49c1230cf96485dbf05fbaca957ec1
Reviewer: Cursor Grok 4.6
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor
PR: https://github.com/fad16papa/Cohestra/pull/431
Frozen: PR #430 not modified
Supersedes: review of global light-only HEAD `d1540d1e`

Mandatory Code Review Loop is in force. This review targets the PlatformAdmin-only implementation, not the superseded global lock.

## Verdict

PASS after in-loop patch of the first-paint race Blind Hunter + Edge Case Hunter raised.

## Findings

| ID | Severity | Source | Finding | Disposition |
|---|---|---|---|---|
| R1 | MAJOR | blind+edge | next-themes body script can re-apply stored/OS dark if SSR `forcedTheme` is missing | PATCHED — trailing `<ThemeScript />` after ThemeProvider + `useLayoutEffect` Platform lock |
| R2 | MINOR | blind | SPA navigation onto `/platform/**` is not locked before paint by ThemeScript | PATCHED — `useLayoutEffect` removes `html.dark` and sets `color-scheme: light` when entering Platform |
| R3 | MINOR | blind | ThemeToggle hide is a Platform login prop, not a path lock | DISMISS — owner asked for explicit `showAppearanceToggle={false}` on Platform login, not pathname hacks in generic UI |
| R4 | NIT | blind | `isPlatformLightOnlyPath` is duplicated inside ThemeScript | DISMISS — inline script cannot import; unit tests keep predicates aligned |

Acceptance Auditor: NO FINDINGS. Kernel items PASS.

## Targeted hunt

- Platform still inheriting dark mode: **no** — ThemeScript + `forcedTheme="light"` + live Overview under OS/stored dark
- First-paint dark flash: **no** — head script, trailing script, e2e `__sawHtmlDark === false`
- `/platform/login` ThemeToggle: **no** — `showAppearanceToggle={false}`; screenshot has no control
- Platform visit overwriting tenant preference: **no** — sync skips Platform; e2e storage stays `dark`; no appearance PATCH to light
- Tenant dark removed: **no** — dashboard dark screenshot
- Settings Appearance missing: **no** — Light/Dark/System radios restored
- Tenant ThemeToggle missing: **no**
- Public registration ThemeToggle missing: **no**
- Tenant website theme missing: **no**
- Brand Accent dark damaged: **no** — `isDark` branch + unit matrix restored
- Global `color-scheme: light` on `html`: **no**
- Global `html.dark` prohibited: **no** — legitimate on tenant
- next-themes removed: **no**
- Platform override leaking to tenant routes: **no**
- Leaving Platform stuck light: **no** — route-transition e2e
- Story 44.x functional regression: **no** — ops/support/overview still load

## Clean review

Unresolved BLOCKER: 0
Unresolved MAJOR: 0
Dismissed: 2
Patched in this HEAD: 2
