# Story 38.4 visual evidence

Generated: 2026-09-29
HEAD at capture: correction HEAD after sampled-fill and axe settle (see git log)

## Viewport matrix

| Surface | 1440×900 | 1024×768 | 768×1024 | 430×932 | 390×844 | Dark |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `viewports/login-1440x900.png` | `viewports/login-1024x768.png` | `viewports/login-768x1024.png` | `viewports/login-430x932.png` | `viewports/login-390x844.png` | `viewports/login-1440x900-dark.png` |
| Dashboard | `viewports/dashboard-1440x900.png` | `viewports/dashboard-1024x768.png` | `viewports/dashboard-768x1024.png` | `viewports/dashboard-430x932.png` | `viewports/dashboard-390x844.png` | `viewports/dashboard-1440x900-dark.png` |
| Clients list | `viewports/clients-1440x900.png` | — | — | — | `viewports/clients-390x844.png` | — |
| Client profile | `viewports/client-profile-1440x900.png` | — | — | — | `viewports/client-profile-390x844.png` | — |
| Activities | `viewports/activities-1440x900.png` | — | — | — | `viewports/activities-390x844.png` | — |
| Form Studio | `viewports/form-studio-1440x900.png` | — | — | — | — | — |
| Website entitled | `viewports/website-1440x900.png` | — | — | — | `viewports/website-390x844.png` | — |
| Basic Website lock | `viewports/website-basic-lock-1440x900.png` | — | — | — | `viewports/website-basic-lock-390x844.png` | — |
| Reports | `viewports/reports-1440x900.png` | — | — | — | `viewports/reports-390x844.png` | `viewports/reports-1440x900-dark.png` |
| Settings | `viewports/settings-1440x900.png` | — | — | — | `viewports/settings-390x844.png` | — |
| Billing | `viewports/billing-1440x900.png` | — | — | — | `viewports/billing-390x844.png` | — |
| Campaigns | `viewports/campaigns-1440x900.png` | — | — | — | `viewports/campaigns-390x844.png` | — |
| Forced-colors login | `viewports/forced-colors-login-1440x900.png` | — | — | — | — | — |
| Forced-colors Dashboard | `viewports/forced-colors-dashboard-1440x900.png` | — | — | — | — | — |
| Forced-colors Settings form | `viewports/forced-colors-settings-form-1440x900.png` | — | — | — | — | — |

Playwright: `web/e2e/tokens-38-4.spec.ts` and `web/e2e/a11y-38-4.spec.ts` with `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_LIVE_STACK=1`, `E2E_API_BASE_URL=http://localhost:8080`.

## 1. Basic Website locked state (px2-basic)

Tenant: `px2-basic` / `px2-basic-admin@cohestra.local`. Route `/dashboard/website`.

| Check | 1440×900 | 390×844 |
| --- | --- | --- |
| UpgradePanel heading “Unlock a branded public homepage” | visible | captured |
| UpgradePanel body / contrast | no axe color-contrast serious/critical | same |
| Core plan label + “Minimum for this feature” + price/metadata | readable, selected | captured |
| Upgrade action “Start Core trial” | present, focus attempted in spec | captured |
| Disabled/locked vs entitled | no `#website-builder-toolbar`; no editor controls | same |
| Generic error / Try again | none; `pageerror` empty | same |
| Story 38.2 entitlement | `website-entitlement-38-2.spec.ts` still 200 Pro / 403 Basic | — |

Axe on the 390×844 lock capture: **no color-contrast** failures. Remaining `button-name` on the floating Calendar control is unlabeled chrome (Story 38.5 / overlay), not a 38.4 token fail.

## 2. Client profile

Populated profile `Daniel Diaz` at `/clients/985c4404-8dde-4bfe-a366-6b654b42eeba`.

| Inspection | Result |
| --- | --- |
| Primary / secondary / muted | Name ink; helper labels muted; empty “No notes yet” / “Not provided” readable |
| Activity metadata | Registration IDs, timestamps, field counts |
| Follow-up / status | Inactive chip with **label**; WhatsApp/Viber actions; follow-up date field; outreach status select |
| Links and actions | Edit profile, Collapse, Save date (empty → visually inactive), Save outreach log |
| Table/list | Registration answers list + relationship timeline |
| Empty optional fields | Notes, residency “Not provided” |
| Mobile truncation | 390×844 capture; names wrap/truncate |
| Focus | Profile select uses opaque `ring-2 ring-ring` |
| Status not color-only | Inactive / Contacted use text labels on chips |

Axe: **0 color-contrast** violations on this route.

## 3. Forced-colors

Chromium `emulateMedia({ forcedColors: "active" })`. Semantic roles map to system colors in `brand-tokens.css` `@media (forced-colors: active)`.

Captured: login (email focused), Dashboard (first control focused), Settings (first input/button focused). Text, controls, and focus remain perceivable in the captures. No component redesign.

## 4. Focus-ring

See `focus-ring-composite.md`. Opaque `--ring` ≥3:1; `ring-ring/30` and `/50` fail composite and are forbidden on authenticated product inputs plus auth/shared primitives.

## 5–6. Reports `text-lagoon` and real-DOM axe

See `reports-text-lagoon-inventory.md` (all migrated) and `axe-routes.json` / `axe-login.json`.

No serious/critical **color-contrast** on migrated scope. Other axe IDs (table roles, extra `<main>`, Form Studio listbox, Calendar `button-name`) are **38.5 / 38.6 / Form Studio composition** — not token work.

## 7. Dark mode

User-accessible via the admin Appearance popover (`cohestra-theme-operator`). Captured Dashboard + Reports at 1440×900 after selecting Dark, then restored Light.

Login dark remains a public-session capture (`login-1440x900-dark.png`). Dark `--primary` `#0f7369` is fill-only; links use `--text-link` `#159a90`.

## Honest remaining (not 38.4 contrast)

- Dual `h1` / extra `<main>` / landmark uniqueness: Story **38.5**
- Calendar FAB `button-name`: Story **38.5** / overlay
- Clients `role="row"` without grid parent: table semantics, not tokens
- Form Studio `role="listbox"` wrapping `<li>`: Form Studio composition, not 38.4
