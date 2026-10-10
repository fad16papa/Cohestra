---
title: 'Remove landing-page Cinema / House Tour section'
type: 'chore'
created: '2026-10-10'
status: 'implemented'
baseline_commit: '7266815f3b1488698160d78a505a2d16bcda5c13'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The public marketing landing page still ships Live Proof Cinema / House Tour ("Walk the club before you sign up"). That walkthrough no longer matches Cohestra's intended premium SaaS presentation.

**Approach:** Unmount and delete landing-only Cinema code. Keep every other landing section and all real product surfaces. Do not add a replacement showcase.

## Boundaries & Constraints

**Always:**
- Remove the entire `#crm` Cinema / House Tour experience from the marketing apex home.
- Remove exclusive `/#crm` nav/footer controls.
- Close the gap so Features flows into How it works with existing spacing.
- Keep hero, features, pricing, FAQ, footer, CTAs, tokens, and SEO unchanged.
- Keep Website Studio, Form Studio, Clients, Activities, Follow-up, Analytics, Cohestra AI, tenant websites, admin, and auth working.

**Ask First:**
- Any change that would redesign remaining landing sections.
- Any deletion of `SitePageRenderer` / `cinemaFold` used by published tenant sites.

**Never:**
- New epic or Epic 33 reopen.
- Replacement dashboard/feature-grid/image section.
- Backend, schema, packages, design-token, or global motion architecture changes.
- Merge or deploy without owner authorization.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Marketing home | GET `/` on apex | No Cinema heading, tabs, or `#crm` section; other sections present | N/A |
| Leftover hash | `/#crm` | No empty Cinema container; cookie banner follows stored consent only | N/A |
| Cinema-only nav | Header/footer "Clients" → `/#crm` | Link removed; other nav unchanged | N/A |
| Tenant website | Published site / Website Studio | `SitePageRenderer` and studio unchanged | N/A |

</frozen-after-approval>

## Code Map

- `web/components/marketing/marketing-home-page.tsx` -- unmount `MarketingProductCarousel`
- `web/components/marketing/marketing-shell.tsx` -- remove `/#crm` Clients links
- `web/lib/marketing-cookie-consent.ts` -- drop Cinema `#crm` hide
- Landing-only Cinema tree (`marketing-product-cinema*`, reel/roll, demo mounts, DemoClub seed) -- delete
- `web/components/marketing/site-page-renderer.tsx` -- KEEP (`cinemaFold` is tenant/studio)

## Tasks & Acceptance

**Execution:**
- [x] `web/components/marketing/marketing-home-page.tsx` -- remove Cinema mount -- drop the section
- [x] `web/components/marketing/marketing-shell.tsx` -- remove `/#crm` Clients links -- no orphan hash nav
- [x] `web/lib/marketing-cookie-consent.ts` -- ignore `#crm` -- banner no longer Cinema-gated
- [x] Delete landing-only Cinema files -- confirmed unused outside apex `#crm`
- [x] `web/e2e/landing-cinema-removed.spec.ts` -- assert Cinema absent -- regression
- [x] Update cookie / token tests that encoded the old Cinema contract

**Acceptance Criteria:**
- Given marketing apex `/`, when the page renders, then "Walk the club before you sign up" and house-tour tabs are absent.
- Given Features then How it works, when Cinema is gone, then no empty placeholder remains.
- Given Website Studio or a published tenant site, when opened, then product cinemaFold rendering is unchanged.

## Spec Change Log

## Verification

**Commands:**
- `cd web && npx vitest run` -- 712 passed (includes cookie, tokens, landing-cinema-removed)
- `cd web && npx tsc --noEmit` -- pass
- `cd web && npm run build` -- pass (Next 16.3.6)
- Playwright `PUBLIC_BASE_URL=http://localhost:3000 npx playwright test e2e/landing-cinema-removed.spec.ts` -- pass
- Playwright leftover `#crm` cookie banner -- pass
- Manual + Playwright screenshots 1440 / 768 / 390 -- Cinema gone, overflow 0, Features flows into How it works

HEAD: `34dfb922` plus cookie-hash cleanup commit. PR: https://github.com/fad16papa/Cohestra/pull/435 (draft). Do not merge without owner auth.
