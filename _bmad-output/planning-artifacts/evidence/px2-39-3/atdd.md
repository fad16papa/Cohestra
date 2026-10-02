# Story 39.3 ATDD (before implementation)

Test Architect. Red first: `web/lib/admin-nav-entitlements.test.ts` encodes the matrix. Playwright follows after chrome exists.

## Unit — resolver

Cover every combination of plan ∈ {pending, Basic, Core, Pro, Enterprise} × role ∈ {admin, member, unknown} × destination in readiness.md.

Must fail until the resolver exists:

1. Website Basic admin → locked Core, destination `upgrade`
2. Website Basic member → locked Core, destination `ask-admin`
3. Website Core+ → unlocked `content` (admin and member)
4. Campaigns Basic/Core → locked Pro; Pro/Enterprise → unlocked
5. Analytics never locked (including Basic admin/member)
6. Team member → hidden `denied`; Basic admin → locked Core `upgrade`; Core+ admin → unlocked
7. Billing member → hidden; Basic admin → visible unlocked; Core/Pro admin only if billing owner
8. Custom domain unlocked only for Enterprise admin; otherwise hidden
9. `shellReady: false` → website/campaigns pending (no requiredPlan); team/billing hidden
10. Role denial destination is never `upgrade`
11. Accessible name helper: `Website, locked, requires Core plan`

## Runtime — role vs plan

| Actor | Path | Expect |
| --- | --- | --- |
| Basic admin | `/dashboard/website` | UpgradePanel + GET site 403 `plan_locked` |
| Basic admin | `/campaigns` | UpgradePanel Pro, not 500 |
| Basic admin | `/analytics` | Analytics `h1` + report, **no** room-level lock in nav |
| Core admin | `/dashboard/website` | editor; Campaigns still locked |
| Pro admin | Website + Campaigns | content; nav unlocked |
| Member | `/settings/team` | denied/redirect, **no** UpgradePanel, **no** Start trial |
| Member Basic | `/dashboard/website` | ask-admin, no checkout href |
| Entitled user + injected 5xx | existing error, not lock |

## Visual / a11y

- Screenshots: Basic admin 1440, 768 compact, 390 More; Pro entitled same; Member 1440 + 390
- Keyboard: Tab to locked Website, announced name includes locked + plan
- Forced colors: lock glyph still visible
- Contrast: lock + label vs rail background

## Regressions (must stay green)

`website-entitlement-38-2`, `desktop-shell-39-1`, `mobile-nav-39-2`, `landmarks-38-5`, `overlays-38-6`

## Trace (AC)

| AC | Test |
| --- | --- |
| 1 Website/Campaigns/Team locks | unit matrix + Basic e2e nav |
| 2 Analytics unlocked | unit + Basic `/analytics` e2e |
| 3 Member hide Team/Billing | unit + Member e2e |
| 4 Custom domain hidden | unit + Basic settings e2e |
| 5 Accessible name / compact tooltip | unit helper + e2e aria-label |
| 6 Deep-link taxonomy | e2e API + UI |
| 7 Central resolver | grep: no leftover plan checks in footer/links |
| 8 Pending | unit shellReady false |
| 9 IA preserved | 39.1 / 39.2 specs |
| 10 Protected | review: no server/Paddle/header files |
