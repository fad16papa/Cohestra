# Story 38.2 live checks

Date: 2026-09-22

## API (curl)

Basic `px2-basic-admin@cohestra.local` `GET /api/v1/admin/site` (Host `px2-basic.localhost:8080`):

- HTTP **403**
- `errorCode: plan_locked`
- `feature: website`
- `requiredPlan: Core`
- detail: `Site pages require a Core plan or higher.`

Pro `operator@cohestra.local` `GET /api/v1/admin/site`: HTTP **200** with draft.

## Playwright (`E2E_LIVE_STACK=1`)

`web/e2e/website-entitlement-38-2.spec.ts` — **2 passed** (2.9s)

- Pro TenantAdmin: editor visible; GET `/admin/site` 200; no pageerror
- Basic TenantAdmin: UpgradePanel; no toolbar; no Try again; direct API 403 `plan_locked`

## Browser

- Basic `http://px2-basic.localhost:3000/dashboard/website` — UpgradePanel, Core/Pro chooser, no editor
- Pro `http://default.localhost:3000/dashboard/website` — Website Builder toolbar + templates, no UpgradePanel

Screenshots: `basic-website-upgrade-panel.webp`, `pro-website-editor.webp`
