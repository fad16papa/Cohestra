# Story 38.4 visual evidence

Generated: 2026-09-29
HEAD at capture: post-review correction (`846439a5` plus this evidence commit)

## Viewport matrix

| Surface | 1440×900 | 1024×768 | 768×1024 | 430×932 | 390×844 | Dark |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `viewports/login-1440x900.png` | `viewports/login-1024x768.png` | `viewports/login-768x1024.png` | `viewports/login-430x932.png` | `viewports/login-390x844.png` | `viewports/login-1440x900-dark.png` |
| Dashboard | `viewports/dashboard-1440x900.png` | `viewports/dashboard-1024x768.png` | `viewports/dashboard-768x1024.png` | `viewports/dashboard-430x932.png` | `viewports/dashboard-390x844.png` | not captured (operator theme default light) |
| Clients list | `viewports/clients-1440x900.png` | — | — | — | `viewports/clients-390x844.png` | — |
| Activities | `viewports/activities-1440x900.png` | — | — | — | `viewports/activities-390x844.png` | — |
| Form Studio | `viewports/form-studio-1440x900.png` | — | — | — | — | — |
| Website entitled | `viewports/website-1440x900.png` | — | — | — | `viewports/website-390x844.png` | — |
| Reports | `viewports/reports-1440x900.png` | — | — | — | `viewports/reports-390x844.png` | — |
| Settings | `viewports/settings-1440x900.png` | — | — | — | `viewports/settings-390x844.png` | — |
| Billing | `viewports/billing-1440x900.png` | — | — | — | `viewports/billing-390x844.png` | — |
| Campaigns / follow-up-adjacent | `viewports/campaigns-1440x900.png` | — | — | — | `viewports/campaigns-390x844.png` | — |

Playwright: `web/e2e/tokens-38-4.spec.ts` with `PUBLIC_BASE_URL=http://localhost:3000` and `E2E_LIVE_STACK=1`.

## Observed

- Login helper, CTA, and Forgot password link are readable in light and dark.
- Dashboard follow-up queue, metric tiles, and muted metadata meet the intended hierarchy.
- Clients table metadata is muted, not stone; status chips include labels.
- Form Studio helper copy is muted on paper; labels stay ink.
- Website entitled builder warning banner uses the warning surface with body-readable copy.
- Mobile dashboard truncates some chrome labels; content still reflows (no 38.5 landmark work).

## Honest gaps

- Website **locked / Basic** tenant was not captured in this environment (seeded operator is Pro/trialing).
- Client **profile** detail route was not captured (list was).
- Forced-colors / Windows high-contrast was not emulated.
- Remaining report panels still using `text-lagoon` were left unmigrated (not in the approved Composer list).
- Dual chrome/page headings remain Story 38.5.
