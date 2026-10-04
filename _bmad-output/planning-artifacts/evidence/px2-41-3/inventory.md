# Story 41.3 API / security inventory

Baseline: `ac5538e1`  
Model: Grok 4.6

## Routes

| Route | Page | h1 today |
| --- | --- | --- |
| `/campaigns` | `CampaignsListPage` | Campaigns |
| `/campaigns/new` | `CampaignComposePage` | Compose campaign |
| `/campaigns/{id}` | `CampaignDetailPage` | campaign subject |

Navigation order is unchanged (Campaigns after Website). No compatibility redirect is required.

## Admin API

All under `api/v1/admin/campaigns`, `[Authorize(Policy = TenantOperator)]`, `[RequireProPlan]`.

| Method | Path | Contract |
| --- | --- | --- |
| GET | `/` | `CampaignListResponse` page/pageSize/totalCount |
| GET | `/{id}` | `CampaignDetailResponse` or 404 |
| POST | `/segment/preview` | `ClientSegmentPreviewResponse` |
| POST | `/assets` | 3MB image upload |
| POST | `/assets/from-activity-qr` | published activity QR → campaign asset |
| POST | `/send-test` | operator email only |
| POST | `/send` | 200 completed or 202 queued |

Templates live at `/api/v1/admin/email-templates` (existing, tenant-scoped).

Public asset bytes: `/api/v1/public/campaign-assets/{id}` — only allowed image `src` after sanitization.

## Recipient and campaign status

Recipient: `queued`, `sent`, `failed`, `skipped`.  
Campaign: `queued` (created), processed by outbox to `sending` / `completed` / `failed`.  
Skipped = no email or no consent. Server is authoritative.

`sendCampaign` client polls `GET /{id}` for 60s while status is `queued` or `sending`. If the deadline expires, it returns the queued payload. UI must not claim completed success in that case.

## Consent, community, additional recipients

- Compose forces `consentOnly: true`.
- `isComposeSegmentReady` = community present + consentOnly.
- Additional recipients: max 50, existing picker + server validation.
- Preview counts: `totalCount`, `withEmailCount`, `withoutEmailCount`, `withoutConsentCount`, `communityWithEmailCount`, `additionalWithEmailCount`.
- Send eligibility uses preview `withEmailCount > 0` plus server validation. Do not infer from visible chips alone.

## Entitlements and roles

- `RequireProPlan` on the controller is the write/read gate.
- Nav: `resolveNavEntitlement("campaigns")` → Pro/Enterprise unlocked; Basic/Core locked Pro; unknown/missing pending.
- UpgradePanel: admin checkout / member ask-admin.
- Role denial (403 without `plan_locked`) is never an UpgradePanel.

## Tenant isolation

Campaign, recipient, template, asset, and segment queries are tenant-hosted. No `X-Tenant-Id`. Cross-tenant campaign IDs 404. QR only from the current tenant’s published activities. Segment preview cannot return another tenant’s clients.

Existing coverage: `CampaignConsentIntegrationTests`, `CampaignEmailBodyProcessorTests`, `RequireProPlanFilterTests`. Isolation is implied by tenant host + EF tenant filters; 41.3 Playwright asserts cross-tenant denial without calling a real provider.

## HTML and links

Server `CampaignEmailBodyProcessor`:

- Allowed tags: p, br, strong, b, em, i, u, ul, ol, li, a, img, div, span
- Allowed attrs: href, src, alt, title, target, rel
- Schemes: http, https, mailto
- Images must be `/api/v1/public/campaign-assets/`

Browser preview/detail currently render raw HTML. Story 41.3 adds a fail-closed client sanitizer matching that allowlist. Scripts, event handlers, `javascript:`, `data:`, and encoded external destinations are stripped.

## Provider / QA

Do not send to real recipients. Playwright intercepts `POST /send` and `POST /send-test`. Unit/integration use the existing configured test host. Assert real provider calls are absent.

## Overlays (38.6)

- Email preview: Dialog
- Insert QR: Dialog, initial focus Search
- Send confirmation: AlertDialog
- 160ms local motion, trap, Escape, restore

## Current tests

| Suite | What it proves |
| --- | --- |
| `CampaignEmailBodyProcessorTests` | sanitizer / image src |
| `CampaignConsentIntegrationTests` | no-consent → skipped |
| `RequireProPlanFilterTests` / `TenantPlanGateTests` | Pro gate |
| `overlays-38-6.spec.ts` | Preview + QR keyboard |
| `entitlement-visibility-39-3.spec.ts` | Basic lock heading + API `plan_locked` |
| `landmarks-38-5.spec.ts` | `/campaigns` h1 |
| No `campaigns-*.test.ts` / no 41.3 Playwright | this story |
