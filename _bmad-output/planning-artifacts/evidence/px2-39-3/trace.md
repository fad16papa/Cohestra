# Story 39.3 acceptance-criteria trace

HEAD at recording: see git log on `cursor/story-39-3-entitlements-0fcb`.

| AC | Evidence |
| --- | --- |
| 1 Website/Campaigns/Team visible + lock + plan | Unit matrix `admin-nav-entitlements.test.ts`. Playwright Basic admin 1440/768/390. |
| 2 Analytics room unlocked for Basic | Unit: no `analytics=locked`. E2E Basic `/analytics` has h1 and no upgrade heading. |
| 3 Member hides Team/Billing | Unit member team/billing `denied`. E2E member 1440 + 390 More. |
| 4 Custom domain hidden | Unit `isCustomDomainSettingsVisible` Basic/Core/Pro false. E2E Basic settings has no Custom domain control. |
| 5 Accessible name + compact tooltip + not color-alone | Unit `navItemAccessibleName`. E2E compact `title` + focused Website lock. Glyph + plan word on expanded/More. |
| 6 Deep-link taxonomy | E2E: Basic site 403 `plan_locked` Core; campaigns 403 `plan_locked`; member team 403 without `plan_locked`; Pro site 200. Basic Website/Campaigns UpgradePanel with trial CTAs; member Team “admins only”, no Start trial. |
| 7 Central resolver | `admin-nav-entitlements.ts` consumed by links, footer, settings workspace/left/right/page. |
| 8 Pending shell | Unit `shellReady: false` → website/campaigns pending, footer Settings only. |
| 9 IA / landmarks / overlays preserved | Regressions: desktop-shell-39-1, mobile-nav-39-2, landmarks-38-5, overlays-38-6, website-entitlement-38-2 — all passed live. |
| 10 Protected scope | No server plan math, Paddle, UpgradePanel prices, Form Studio, or 39.4 header changes. |

## Live stack API notes

Recorded against Development API after fixture reseed:

- `GET /api/v1/admin/site` Basic admin → 403 `plan_locked` `requiredPlan=Core`
- `GET /api/v1/admin/campaigns` Basic admin → 403 `plan_locked`
- `GET /api/v1/admin/team` Pro member → 403, body does not contain `plan_locked`
- `GET /api/v1/admin/site` Pro admin → 200

No navigation path produced a raw 500 in the 39.3 or regression Playwright runs.
