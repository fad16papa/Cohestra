---
id: 39.3
key: 39-3-entitlement-visibility
title: Entitlement visibility
status: in-progress
epic: 39
created: 2026-10-02
baseline_commit: cc63c61a18b2004465e9991de13e10c8f76b5a68
---

# Story 39.3: Entitlement visibility

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a tenant operator,
I want plan and role restrictions shown directly in desktop navigation and the mobile More sheet,
so that paid modules stay discoverable, structurally unavailable items stay hidden, and I never confuse a role denial with an upgrade offer.

## Scope delta vs the execution prompt

Canonical backlog §39.3 and DESIGN.md **D4 / §15** are authoritative. Readiness matrix: `_bmad-output/planning-artifacts/evidence/px2-39-3/readiness.md`.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Lock the entire Analytics room for Basic | **No.** Basic keeps usable weekly reporting. Advanced filters stay in-page. |
| Infer entitlements from `NEXT_PUBLIC_*` | **Forbidden.** Shell/API plan + role only. |
| Change server plan math / Paddle / UpgradePanel prices | **Out of scope.** |
| Change 39.1 desktop order or 39.2 mobile order | **Forbidden.** |
| Story 39.4 page headers | **Out of scope.** |

**In scope:**

1. Central `admin-nav-entitlements.ts` resolver for plan × role × destination.
2. Discoverable paid modules stay visible with lock glyph + required-plan label + accessible name.
3. Structurally unavailable items hidden (Member Team, Basic/non-Enterprise tenant-URL, platform-only).
4. Member destinations that are visible but not purchasable use UpgradePanel ask-admin copy, never checkout.
5. Pending shell: no false lock/unlock; footer Settings-only until admin is known.
6. Lock presentation on expanded rail, compact 768–1023 rail, and 390 More sheet.

**Out of scope:** server plan calculations, payment-provider behavior, UpgradePanel pricing redesign, Form Studio / registration entitlements (Epics 35–36), nav order, 39.4 headers, production fixture tenants, deploy credentials.

## Acceptance Criteria

1. Website, Campaigns, and Team invitations remain visible in the surfaces that already list them, with a lock glyph and required-plan label when the actor’s plan is below the server contract (Website/Team invites = Core; Campaigns = Pro).
2. Analytics remains an unlocked room for Basic, Core, Pro, Admin, and Member. Advanced Analytics stays an in-page gate, not a nav lock.
3. TenantMember never sees Team or Billing. Admin-only footer stays hidden. Relationship rooms stay visible.
4. Basic/non-Enterprise custom-domain (tenant-URL) control is hidden from Settings navigation. Deep link does not become an upgrade offer.
5. Locked nav items announce accessibly, e.g. “Website, locked, requires Core plan.” Compact rail uses the same accessible name plus `title` tooltip. Lock is not color-alone.
6. Destination of a genuine plan lock is the existing priced `UpgradePanel` (or ask-admin for members). Role denial is redirect/denied copy, never UpgradePanel. Unexpected errors stay error states, never a false plan lock.
7. Centralized resolver is the only plan/role mapping for desktop rail, compact rail, More sheet, footer, and Settings Team/Billing/domain shortcuts. No scattered `plan === "Basic"` copies for those destinations.
8. Shell loading (`shell == null`) does not show lock glyphs on primary rooms and does not flash Team/Billing.
9. Story 39.1 desktop order and Story 39.2 mobile order, routes, active states, breadcrumbs, skip link, one-main/one-h1, and 38.6 overlays are unchanged.
10. Protected: no server plan math, Paddle, UpgradePanel price tables, Form Studio entitlements, 39.4, or production tenants.

## Architecture (Grok-owned)

See `_bmad-output/planning-artifacts/evidence/px2-39-3/architecture.md`.

## ATDD

See `_bmad-output/planning-artifacts/evidence/px2-39-3/atdd.md`.

## Tasks / Subtasks

- [x] Central entitlement resolver + full plan × role × destination unit matrix (AC 1–4, 7, 8)
- [x] Lock presentation: expanded rail, compact 768–1023, More sheet, footer Team (AC 1, 5, 9)
- [x] Settings Team/Billing shortcuts + hide custom-domain when structurally unavailable (AC 3, 4, 7)
- [x] D12 fixtures: Basic admin, Core admin, Pro admin (existing), TenantMember (AC 6)
- [x] Playwright + regressions 38-2 / 39-1 / 39-2 / 38-5 / 38-6 (AC 6, 9, 10)

### Review Follow-ups (AI)

- [x] [AI-Review][PO][MAJOR] `parseTenantShell` must not normalize missing/null plan to Basic; missing and unknown plans stay pending through the resolver boundary
- [x] [AI-Review][PO] Boundary tests: `parseTenantShell` → `entitlementContextFromShell` → `resolveNavEntitlement`
- [x] [AI-Review][PO] Campaigns API plan denial asserts `feature` and `requiredPlan = Pro`
- [x] [AI-Review][PO] Basic admin Team shows Core UpgradePanel; Basic member Campaigns is ask-admin with no checkout
- [x] [AI-Review][PO][MAJOR] Enterprise non-owner admins stay on owner-managed billing and never mount InAppBillingPanel

## Dev Notes

### Verified server contracts (do not invent)

| Capability | Required plan | HTTP when locked | Role |
| --- | --- | --- | --- |
| Website admin | Core+ | 403 `plan_locked` `requiredPlan=Core` | TenantOperator |
| Campaigns | Pro+ | 403 `plan_locked` | TenantOperator |
| Analytics room | none | 200 weekly/default | TenantOperator |
| Analytics advanced filters | Core (client in-page; server `custom` is 400 not `plan_locked`) | Do not change server | TenantOperator |
| Team GET | n/a | 403 Forbid (not plan_locked) | TenantAdminOnly |
| Team invites | Core+ | 403 `plan_locked` | TenantAdminOnly |
| Billing | n/a | 403 Forbid | TenantAdminOnly; UI shows Basic any admin or billing owner |
| Custom domain | Enterprise (coming soon) | Hidden in chrome | TenantAdmin |

### Must preserve

- 39.1 `adminNavItems` order; 39.2 `mobileTabItems` / `moreSheetNavItems`
- `UpgradePanel` ask-admin branch (`isTenantAdmin === false`)
- 38.5 skip / one main / one h1; 38.6 More Sheet
- Footer billing rule: Basic admin **or** billing owner — now expressed via the resolver, same truth
- 38.2 Website 403 vs 500 distinction

### Testing

- Vitest: complete matrix including pending, Enterprise, member vs admin
- Playwright D12: Basic / Core / Pro / Member at 1440, 768, 390
- Deep links: plan lock → UpgradePanel; member Team → denied not upgrade; entitled → content
- Keyboard, SR names, contrast/forced-colors on lock glyphs
- Regressions listed in AC 9–10

### Previous story intelligence (39.2)

- More destinations are Analytics, AI, Website, Campaigns + footer. Locks belong here, not on the five tabs.
- Compact rail hides footer until `lg`. Website/Campaigns locks must live on rail icons at 768–1023.
- Do not reopen 39.1/39.2 IA.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 unused unless a later bounded visual is declared.

### Debug Log References

### Review Findings

Independent review of HEAD `9d695aaa` plus follow-up patches (Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general).

- [x] [Review][Patch] Unrecognized/empty shell plan no longer defaults to Basic locks
- [x] [Review][Patch] Basic advanced Analytics keeps filter bar + “Back to weekly Analytics”
- [x] [Review][Patch] D12 Basic member fixture + e2e ask-admin (no checkout)
- [x] [Review][Patch] Compact-rail lock glyph enlarged with contrast chip
- [x] [Review][Defer] Command palette Campaigns/Website remain 38.6 overlay surfaces (server still 403)
- [x] [Review][Defer] Destination-page shell inference for Website/Campaigns remains 38.2/existing contract

PO pre-merge review of HEAD `7b046629` reopened one MAJOR: `parseTenantShell()` still inferred Basic, so the live shell path bypassed the resolver’s pending contract.

- [x] [Review][PO][MAJOR] Preserve missing plan as `null`; do not infer Basic
- [x] [Review][PO] Boundary tests through parser → context → resolver
- [x] [Review][PO] Campaigns 403 includes `feature=campaigns` and `requiredPlan=Pro`
- [x] [Review][PO] Basic admin Team UpgradePanel + Basic member Campaigns ask-admin
- [x] [Review][Patch] Null/unknown shell plan does not invent a paid billing checkout SKU
- [x] [Review][Defer] Website/Campaigns destination inference remains 38.2 / existing pages — deferred, pre-existing
- [x] [Review][Defer] RequireProPlan email-templates 403 uses campaigns-family feature name — deferred, pre-existing filter scope

### Completion Notes List

- Central resolver `admin-nav-entitlements.ts` maps shell plan/role to locked/hidden/pending. Analytics is never nav-locked.
- Desktop rail, More sheet, footer, and Settings Team/Billing/domain shortcuts consume the resolver only.
- D12 fixtures: `px2-basic` admin, `px2-core` admin, `px2-pro-member`, `px2-basic-member`.
- Live Playwright 39.3 (5) + regressions 38-2/39-1/39-2/38-5/38-6 passed. Vitest 518. Production `next build` green.
- PO correction: `parseTenantShell` keeps `plan` nullable. Missing/unknown plans stay pending. Campaigns 403 now carries typed `feature`/`requiredPlan` without changing who is locked.
- PO correction: `isPaidTenantPlan` treats Enterprise as paid. Settings billing non-owners see owner-managed copy and do not mount `InAppBillingPanel`.

### File List

- `_bmad-output/implementation-artifacts/39-3-entitlement-visibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/readiness.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/architecture.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/atdd.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/trace.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/review.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-3/viewports/`
- `web/lib/admin-nav-entitlements.ts`
- `web/lib/admin-nav-entitlements.test.ts`
- `web/lib/settings-billing-page-content.test.ts`
- `web/lib/in-app-billing-panel.test.ts`
- `web/lib/shell/tenant-shell-api.ts`
- `web/lib/shell/tenant-shell-entitlement-boundary.test.ts`
- `web/lib/plan-entitlement.test.ts`
- `web/lib/billing/checkout-validation.ts`
- `web/lib/billing/checkout-validation.test.ts`
- `web/components/shell/plan-badge.tsx`
- `web/components/dashboard/dashboard-empty-state.tsx`
- `web/components/settings/settings-billing-page-content.tsx`
- `web/components/billing/in-app-billing-panel.tsx`
- `src/Infrastructure/Auth/RequireProPlanFilter.cs`
- `src/Infrastructure.Tests/Auth/RequireProPlanFilterTests.cs`
- `web/components/layouts/admin-nav-lock.tsx`
- `web/components/layouts/admin-nav-links.tsx`
- `web/components/layouts/admin-nav-footer.tsx`
- `web/components/settings/settings-workspace-nav.tsx`
- `web/components/settings/settings-page-content.tsx`
- `web/components/settings/settings-left-rail.tsx`
- `web/components/settings/settings-right-rail.tsx`
- `web/components/reports/reports-page-client.tsx`
- `src/Infrastructure/Seed/E2eEntitlementFixtureSeeder.cs`
- `src/Infrastructure.Tests/Seed/E2eEntitlementFixtureSeederTests.cs`
- `src/Api/Program.cs`
- `src/Api/appsettings.Development.json`
- `web/e2e/entitlement-visibility-39-3.spec.ts`
- `web/e2e/helpers/e2e-owned-fixtures.ts`
- `web/e2e/helpers/owned-fixture-data.ts`

### Change Log

- 2026-10-02: Created Story 39.3 from main `cc63c61a` (39.2 tracker-close). Canonical D4 + verified server matrix. Analytics room stays unlocked.
- 2026-10-02: Implemented centralized nav entitlements, lock chrome, D12 Core/Member fixtures, and unit matrix.
- 2026-10-02: Live Playwright + regressions green. Review patches: unknown-plan pending, Analytics weekly return, Basic member ask-admin. Status remains in-progress for PO pre-merge review.
- 2026-10-03: PO correction — `parseTenantShell` no longer infers Basic; boundary tests and Campaigns/Team/member coverage tightened. Status remains in-progress.
- 2026-10-03: Review patch — null/unknown shell plan no longer invents a paid billing checkout SKU.
- 2026-10-03: PO correction — Enterprise is a paid plan for billing-owner gating; non-owners stay on owner-managed copy.
