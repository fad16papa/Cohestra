# Story 41.3 architecture / UX / a11y / security contract

Baseline: `ac5538e1`  
Roles: Architect, UX reviewer, Accessibility reviewer, Security reviewer  
Model: Grok 4.6

## Decision

Improve the existing Campaigns room. Keep `/campaigns`, `/campaigns/new`, `/campaigns/{id}`. Reuse `CampaignsController`, `CampaignService`, segment preview, outbox send, templates, assets, QR-from-activity, PageHeader, UpgradePanel, `resolveNavEntitlement("campaigns")`, and Story 38.6 Dialog / AlertDialog.

Composer 2.5 is not used for entitlements, recipients, consent, sending, isolation, provider behavior, security, tests, or review. Presentational density (390 wrap, 44px targets, status text) stays on Grok 4.6 so those contracts cannot drift.

## Fetch and eligibility ownership

| Surface | Owns | Authoritative source |
| --- | --- | --- |
| List | page of campaigns | `GET /api/v1/admin/campaigns` |
| Compose segment counts | preview + send enablement | `POST /segment/preview` `withEmailCount` |
| Send | create + async result | `POST /send` then `GET /{id}` while queued/sending |
| Test send | operator inbox only | `POST /send-test` (QA intercepted) |
| Detail | status + recipients | `GET /{id}` with poll while in flight |
| Entitlement chrome | pending / lock / ask-admin | `resolveNavEntitlement` + API 403 |

Rejected: inferring send eligibility from visible chips; module-global campaign cache; autosave; new provider.

## Dirty compose

Fingerprint subject + HTML body + community + additional recipient ids against the initial empty compose. Dirty → native `beforeunload` only. No autosave. No custom router-blocking dialog. After a send result exists, leave-warning is off.

## Rejected alternatives

- New `/api/v1/admin/outreach` or rewritten recipient schema
- Unlocking Basic writes or changing `RequireProPlan`
- Treating missing/unknown plan as Basic or assigning a checkout SKU
- Replacing Preview/QR/Send with custom role=dialog markup
- Claiming success from the 202 queued payload
- Logging recipient emails, bodies, or provider keys
- Client-only authorization

## UX states

### List

loading → pending (unknown plan) → locked (Basic/Core) → denied (403) → error+retry → empty → populated (+ paging when totalCount > pageSize)

### Compose

pristine → dirty → invalid/incomplete → preview loading → preview failure+retry → zero recipients → ready → confirmation open → sending → queued/sending in flight → partial → failed → completed

### Detail

loading → denied/error → queued/sending (poll) → completed / failed with sent/failed/skipped

Every non-content state keeps the route `h1`.

## Accessibility

- One `main#main-content`, one `h1`
- Recipients and Templates are `h2`; refine/sending subsections `h3`
- Status is text (Queued, Sending, Completed, Failed, Sent, Skipped)
- Overlay names: Email preview, Insert activity QR code, Send this campaign?
- Preview copy: explains recipients will receive this message
- Confirm copy: audience/count + irreversible
- Controls ≥44×44; groups wrap; preview `min-w-0` / `max-w-full`
- Errors `role=alert`; live status `role=status`
- Axe: no serious/critical contrast, landmark, heading, link-name, list, button-name

## Motion

Pathname-only route enter. Overlay 160ms local. Reduced motion uses existing tokens. No route-level motion change.

## Security

- Tenant host + JWT. No `X-Tenant-Id`.
- Frontend is not authorization.
- Client HTML sanitizer fail-closes scripts, handlers, `javascript:`, `data:`, `vbscript:`, and non-campaign-asset images.
- Do not log campaign bodies, recipient emails, or provider secrets.
- QA intercepts send and send-test. No real recipient mail.
