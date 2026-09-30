# Story 38.5 visual evidence

Generated: 2026-09-30
HEAD at capture: post-detail-route matrix (see git).

Playwright: `web/e2e/landmarks-38-5.spec.ts` with `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_LIVE_STACK=1`, `E2E_API_BASE_URL=http://localhost:8080`.

## Viewport matrix

| Surface | 1440×900 | 1024×768 | 768×1024 | 430×932 | 390×844 | Dark 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| Skip link focused | `viewports/skip-focused-1440x900.png` | `viewports/skip-focused-1024x768.png` | `viewports/skip-focused-768x1024.png` | `viewports/skip-focused-430x932.png` | `viewports/skip-focused-390x844.png` | `viewports/skip-focused-dark-1440x900.png` |
| Dashboard heading | `viewports/dashboard-heading-1440x900.png` | — | — | — | — | — |
| Settings structure | `viewports/settings-structure-1440x900.png` | — | — | — | — | — |
| Form Studio embedded preview | `viewports/form-studio-preview-1440x900.png` | — | — | — | — | — |
| Standalone public registration | `viewports/public-registration-1440x900.png` | — | — | — | — | — |
| Website Studio | `viewports/website-studio-1440x900.png` | — | — | — | — | — |
| Basic Website lock | `viewports/website-basic-lock-1440x900.png` | — | — | — | — | — |

Light skip captures use the operator Appearance control (`Light` radio), not localStorage alone — `ThemePreferenceSync` overwrites storage from the profile.

## Skip link (focused)

| Check | Result |
| --- | --- |
| Copy | `Skip to main content` |
| First Tab | Playwright: skip is focused after sequential-focus reset |
| Hidden until focus | `sr-only` until `:focus`; never `display: none` / `hidden` |
| Visible when focused | `focus:not-sr-only focus:fixed left-3 top-3 z-[80]` |
| Clipped | Not clipped; lives outside `overflow-hidden` shell |
| Behind sticky chrome | `z-[80]` above top bar; not covered |
| Tokens | `bg-paper text-text-link ring-ring` (opaque `--ring`) |
| Overflow | `focus:w-max focus:whitespace-nowrap!`; no horizontal page overflow |
| Light | `skip-focused-1440x900.png` — html not `.dark` |
| Dark | `skip-focused-dark-1440x900.png` — html `.dark` |
| Mobile 390×844 | `skip-focused-390x844.png` — chip readable, sits over top bar not under it |

## Structure captures

- Dashboard h1 is `Dashboard`; greeting is supporting text.
- Settings h1 is `Settings`; workspace `Default` is supporting text, not a competing h1.
- Form Studio Preview is inside admin chrome; event title is preview content, not a second document h1.
- Standalone `/register/{slug}` is a public document (own main/h1, no admin skip link).

## Unrelated owners (visible in captures, not 38.5)

- Calendar FAB accessible name — Story 43.5
- Client table `role="row"` — Stories 40.3 / 43.5
- Form Studio listbox — Story 42.3
- Overlay/dialog focus — Story 38.6
