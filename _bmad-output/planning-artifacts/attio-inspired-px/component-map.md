---
title: Attio-inspired Cohestra — existing to target component map
status: contract
baseline_sha: 5ba6ddcbf47a3630792ebc3a8779e0dee4a52691
---

# Existing to target

Reuse these files. Do not fork a second button, dialog, or sidebar.

| Target pattern | Existing implementation | Change allowed |
|----------------|-------------------------|----------------|
| Marketing nav and footer | `web/components/marketing/marketing-shell.tsx` | Clearer primary CTA, same routes |
| Marketing home | `web/components/marketing/marketing-home-page.tsx` | Section order and centered hero |
| Product showcase | `web/components/marketing/marketing-hero-product-stack.tsx` | Faithful room chrome only |
| Pricing | `web/components/marketing/marketing-pricing-cards.tsx`, `web/lib/marketing/pricing-plans.ts` | Layout only. Prices stay |
| Signup and verify | `web/components/legal/signup-page-content.tsx`, `signup-verify-page-content.tsx` | Spacing and type. CAPTCHA, terms, and slug checks stay |
| App shell | `web/components/layouts/dashboard-layout.tsx` | Composition only |
| Sidebar | `web/components/layouts/admin-sidebar.tsx`, `admin-nav-links.tsx`, `web/lib/admin-nav.ts` | Density. Room order and locks stay |
| Top bar | `web/components/layouts/admin-top-bar.tsx` | Title and search placement |
| Command palette | `web/components/layouts/admin-command-palette.tsx` | Visual density. Commands stay |
| Mobile nav | `web/components/layouts/admin-mobile-tab-bar.tsx`, `admin-nav-sheet.tsx` | Same destinations |
| Buttons, inputs, dialogs, sheets | `web/components/ui/*` | Sizing tokens. No new primitive library |
| Follow-up rows | `web/components/follow-up/follow-up-results.tsx`, `follow-up-category-filters.tsx` | Row density. Categories stay |
| Clients | `web/app/(admin)/clients/page.tsx` and client detail components | Table and record layout |
| Activities | `web/app/(admin)/activities/**` | List and header layout |
| Form Studio | Activity form editor components | Chrome around the editor. Schema and renderer stay |
| Website Studio | `web/app/(admin)/dashboard/website/page.tsx` and website studio components | Chrome. Preview fidelity stays |
| Campaigns | `web/app/(admin)/campaigns/**` | List and detail chrome. Pro gate stays |
| Analytics | `web/app/(admin)/analytics/**` | Report chrome. No new metrics |
| Cohestra AI | `web/app/(admin)/ai/**` | Panel chrome. Role checks stay |
| Billing and settings | `web/app/(admin)/settings/**`, `web/app/(admin)/billing/**` | Page header and form rhythm |
| Notifications | Settings notifications page and `toast-provider.tsx` | Toast and settings layout |
| Platform Admin | `web/app/(platform)/platform/**` | Density only. Operational scope stays |
| Public registration | `web/app/(public)/register/[slug]/page.tsx` | Do not restyle tenant-branded forms in the first marketing pass |
| Tokens | `web/styles/brand-tokens.css`, `web/app/globals.css` | No hex changes in the foundation story |

## Tests that already guard the marketing contract

- `web/lib/marketing/landing-cinema-removed.test.ts`
- `web/e2e/landing-cinema-removed.spec.ts`
- `web/lib/continuity-context.test.ts`

A visual change updates these tests in the same story. It does not delete the assertions that forbid stock photos, fictional clients, “under an hour”, or dropped plan names.

## Explicit non-targets

Deal pipelines, company scoring, sequences, AI agents that write CRM records, Attio logos, Attio screenshots, and Attio marketing sentences. Platform Admin does not gain tenant impersonation or new operational tools.
