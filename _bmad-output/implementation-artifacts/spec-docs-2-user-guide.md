---
title: 'Documentation 2.0 — truthful tenant user guide'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_commit: 'e6f6a9b1411c607d5f6cab4ea1f12a8fb5ed8596'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Public `/docs` still describes an older operator surface (Reports instead of Analytics, no Follow-up room, no Form Studio/Website Studio/Cohestra AI, no genuine screenshots). Workspace users cannot follow the product they actually have.

**Approach:** Upgrade the existing `/docs` content model and renderer. Rewrite chapters from live tenant UI and entitlements. Add local screenshot blocks with real captures. Keep every current `#fragment`. No Platform Admin. No Cinema.

## Boundaries & Constraints

**Always:**
- Keep `/docs` inside the marketing shell.
- Preserve existing section ids as live anchors or aliases.
- Document only shipped tenant/workspace capabilities with exact UI labels.
- Canonical routes: `/analytics` (compat `/reports`), `/ai`, `/follow-up`, `/dashboard/website`, Form Studio inside the activity Form tab.
- Form Preview simulates submission and never writes publicly.
- Plan locks from live entitlements: Website Core+, Campaigns Pro, Team admin+Core+, Analytics/AI/Follow-up unlocked on Basic.
- Genuine screenshots only, local `/docs-screenshots/*`, no PII/secrets, no generated UI mocks.
- Image blocks: allowlisted src, alt, caption, intrinsic size, lazy load, accessible lightbox.

**Ask First:**
- Any new documentation route besides `/docs`.
- Deleting a current `#fragment` without an alias.

**Never:**
- Landing-page redesign, Cinema revival, Platform Admin guidance.
- Planned/stubbed/unshipped features or free-form AI chatbot claims.
- Backend, schema, entitlements, or package changes.
- Merge or deploy without owner authorization.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `/docs` | GET | New chapters + images render; hero/search work | Broken image src fails tests |
| Legacy hash | `/docs#reports` etc. | Same section still exists | Alias if title changes |
| Search | "Follow-up" / "Form Studio" | Matching chapters | Empty-search copy |
| Lightbox | Enter on screenshot, Escape | Opens/closes, focus returns | Reduced-motion: no zoom animation |
| Basic operator | Reads Website/Campaigns | Core/Pro lock stated, not hidden as missing | N/A |

</frozen-after-approval>

## Code Map

- `web/lib/marketing/product-docs-content.ts` -- chapters, groups, aliases
- `web/lib/marketing/product-docs-images.ts` -- allowlist + image contract
- `web/components/marketing/product-docs-page.tsx` -- IA, search, nav
- `web/components/marketing/product-docs-image.tsx` -- figure + lightbox
- `web/app/docs/page.tsx` -- metadata
- `web/public/docs-screenshots/` -- genuine captures
- `docs/user-manual/cohestra-operator-manual.md` -- stay consistent
- `web/lib/admin-nav.ts` / `web/lib/admin-nav-entitlements.ts` / `web/lib/marketing/pricing-plans.ts` -- source of truth

## Tasks & Acceptance

**Execution:**
- [x] Extend `DocsBlock` with allowlisted image blocks
- [x] Rewrite `/docs` chapters to 11 groups; keep legacy ids
- [x] Capture ≥15 genuine tenant screenshots
- [x] Sync operator manual + screenshot inventory
- [x] Add unit + Playwright + axe coverage

**Acceptance Criteria:**
- Given `/docs`, when rendered, then Cinema and Platform Admin copy are absent and tenant chapters are present.
- Given a legacy `#id`, when opened, then the matching chapter is still addressable.
- Given a screenshot block, when src is missing or not allowlisted, then tests fail.
- Given Form Preview docs, when read, then they state preview never performs a public write.

## Verification

- `cd web && npx tsc --noEmit`
- `cd web && npx vitest run lib/marketing/product-docs*.test.ts`
- Playwright `/docs` 1440 / 1024 / 768 / 390
- `cd web && npm run build`

## Feature and entitlement audit

Source: `web/lib/admin-nav-entitlements.ts`, `web/lib/marketing/pricing-plans.ts`, `src/Infrastructure/Activities/FormSchemaPlanGate.cs`, `src/Domain/Tenants/FormTemplateSlotLimits.cs`, live tenant UI.

| Feature | Role | Basic | Core | Pro | Route | UI labels | Docs change | Screenshot |
|---|---|---|---|---|---|---|---|---|
| Sign in / recovery | guest | yes | yes | yes | `/login` `/signup` `/forgot-password` | Sign in, Forgot password, Create account | rewrite | 01-login |
| Dashboard | admin/member | yes | yes | yes | `/dashboard` | Dashboard | rewrite | 02-dashboard |
| Communities / categories | admin/member | 1 community | 3 | 10 | `/activities` children | Communities, Categories | rewrite | — |
| Activities | admin/member | 4 published | 12 | 50 | `/activities` `/activities/new` | New activity, Overview, Design, Form, Registrations, Share kit | rewrite | 03, 04 |
| Form Studio Build | admin/member | fields + 1 template | recipes, columns, domain, 5 templates | + steps, 25 templates | activity Form tab | Build form, Preview, Save | rewrite + plan truth | 05 |
| Form Studio Design/Preview | admin/member | yes | yes | yes | Design tab / Preview | Design, Preview | Preview never writes | 06, 07 |
| Publish / QR | admin/member | yes | yes | yes | Overview / Share kit | Publish, Share kit | rewrite | 08 |
| Public registration | guest | yes | yes | yes | `/register/{slug}` | public form | desktop + mobile | 09, 10 |
| Clients | admin/member | yes | yes | yes | `/clients` | Clients | rewrite | 11, 12 |
| Follow-up | admin/member | yes | yes | yes | `/follow-up` | Due now, At risk, Opportunity, Healthy | new chapter | 13 |
| Website Studio | admin/member | Core lock; stub page | Essentials | Studio | `/dashboard/website` | Build, Design, Sections, Templates, Preview, Split, Publish, Revert live site | rewrite | 14 |
| Campaigns | admin/member | Pro lock | Pro lock | yes, consented only | `/campaigns` | New campaign, Preview | rewrite | 15 |
| Analytics | admin/member | weekly + CSV | + monthly queryable | + monthly | `/analytics` (`/reports` compat) | Analytics | keep `#reports` | 16 |
| Cohestra AI | admin/member | brief, not chatbot | same | same | `/ai` | Cohestra AI | new chapter | 17 |
| Settings | admin/member | yes | yes | yes | `/settings` | Settings | rewrite | 18 |
| Team | admin only | Core lock | yes | yes | Settings → Team | Team | rewrite | — |
| Billing | Basic admin or billing owner | admin yes | owner only | owner only | Settings → Billing | Billing | rewrite | — |

Never documented: Platform Admin, Cinema, free-form AI chat, unshipped automation.

## Chapter inventory

1. Getting started — `what-is-cohestra`, `two-kinds-of-people`, `sign-up-and-sign-in`, `first-ten-minutes`
2. Dashboard and navigation — `the-left-menu`, `dashboard`
3. Activities and registrations — `communities-and-categories`, `create-an-activity`
4. Form Studio — `build-the-form`, `form-studio-design`
5. Publishing and public registration — `publish-and-share`, `what-guests-see`
6. Clients and Follow-up — `clients`, `follow-up`
7. Website Studio — `website`
8. Email Campaigns — `campaigns`
9. Analytics and Cohestra AI — `reports`, `cohestra-ai`
10. Workspace settings and plans — `settings-team-billing`, `plans`
11. Troubleshooting and glossary — `if-something-goes-wrong`, `words-we-use`

Legacy aliases kept: every previous `/docs#…` id, including `#reports`. New ids: `form-studio-design`, `follow-up`, `cohestra-ai`.
