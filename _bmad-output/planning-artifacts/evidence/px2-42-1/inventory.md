# Story 42.1 current Website inventory

Date: 2026-10-04  
Baseline: `c3e57bbc` (Epic 41 close ancestor `73fd2855`)

## Production names (after 42.1 chrome)

| Surface | Name |
| --- | --- |
| Desktop rail / More sheet | Website |
| Page `h1` / breadcrumbs | Website Studio |
| Command palette label | Website (keywords include “website studio”) |
| Workspace aria | Website Studio workspace / Website Studio sections |
| Load / pending / denied copy | Website Studio |
| UpgradePanel body | Website Studio |
| Route | `/dashboard/website` |
| Public site | `/` on tenant host |
| Admin API | `/api/v1/admin/site` |
| Public API | `/api/v1/public/site` |

Backend `site` terminology and public paths are unchanged. Component identifiers may still say `WebsiteBuilder*`. Marketing pages may still say “website builder.” Authenticated chrome does not.

No `/website`, `/site`, or `/dashboard/site` Next aliases.

## Route and chrome

- `web/app/(admin)/dashboard/website/page.tsx` → `WebsiteBuilderPage`
- `PageHeader` owns `h1` via `WEBSITE_STUDIO_TITLE`
- Room access: `resolveWebsiteRoomAccess` → loading / pending / locked / open
- Fetch `GET /api/v1/admin/site` only when `open`
- Toolbar, workspace bar, editor rail, live preview, skippable non-modal tour

## API

`GET/PUT /api/v1/admin/site`, `POST .../publish`, `.../revert-published`, `.../preview-token`, templates. `TenantOperator` + Core plan gate.

## Entitlements

`resolveNavEntitlement("website")` → pending when plan missing/unknown; locked Basic to Core; unlocked Core+. Frontend hiding is not authorization. Role 403 surfaces as `SiteRequestError` / ProductErrorState, never UpgradePanel.

## Preview / motion

`BuilderSurface` preview `keepMounted={false}`. Split optional at ≥1280. 1024–1279 is Build or Preview only. `<1024` Edit / Preview. `SitePageRenderer` embedded and unchanged.

## Revert / tour

Revert uses 38.6 `AlertDialog`. Tour is skippable non-modal (`aria-modal="false"`, overlay `z-[60]` below skip `z-[80]`). Preference keys are tenant-scoped (`activity-lead:website-builder-*:{slug}`). Legacy unscoped keys are ignored.

## Tests

38.2 entitlement Playwright; 38.5/38.6/39.1–39.4 include Website. `AdminSiteEntitlementIntegrationTests` covers Basic lock. `SiteIsolationIntegrationTests` covers Core-to-Core site isolation. Story 42.1 Playwright: `web/e2e/website-studio-42-1.spec.ts`.
