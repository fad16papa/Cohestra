# Story 40.3 current-behavior inventory

Date: 2026-10-04  
Baseline: `main` `7e7c3c0773fe036a06338167e37f17e69708b9a2`

## Routes

| Route | File | Owner |
| --- | --- | --- |
| `/clients` | `web/app/(admin)/clients/page.tsx` | Remounts `ClientsListPage` on every query string (`key={listKey}`) |
| `/clients/[id]` | `web/app/(admin)/clients/[id]/page.tsx` | `ClientProfilePage` |
| `/follow-up` | Story 40.2 | Canonical Follow-up room. Rows link to `/clients/{id}` |

## List API (unchanged)

`GET /api/v1/admin/clients` — `TenantOperator`. Page size 25/100. Sort `name|status|lastRegistrationDate` + `ThenBy Id`. Filters: `search`, `leadStatus`, `nationality`, `followUpDue`, `mergeSuspect`, `createdWithinDays`, `registeredWithinDays`, `activityId`, plus unused-by-UI `withoutOutreach`, `community`, `consentOnly`, `excludeCommunity`, `followUpCategory` (40.2 only).

URL keys the list UI uses: `search`, `leadStatus`, `nationality`, `followUpDue`, `mergeSuspect`, `registeredWithinDays`, `createdWithinDays`, `activityId`, `activityName`. Hook also parses `sortBy`/`sortDir`/`page` but the page keeps those in React state.

## Profile

`ClientFollowUpPanel` and `ClientLeadStatusControl` are unused. Date control is `ClientFollowUpDateField` → `PATCH .../next-follow-up`. Status `<select>` is on `ClientProfileHeader`. No `Open in Follow-up`.

## Messengers

`MessengerOpenConfirmDialog` already uses Story 38.6 `AlertDialog`. List and profile POST `whatsapp-initiated` / `viber-initiated` then open the app. QA must not send real messages.

## Table / chips / motion (defects)

- Chips: `h-8`, horizontal scroller, `Active` clips at 390.
- Cards: `< sm` (640). Desktop CSS-grid from `sm` with `min-w-[42rem]`.
- Header `div[role=row]` + `role=columnheader` without table/grid. Body rows are unrole'd divs.
- Profile expand: `duration-200`. Epic 37 local token is 160ms.

## Entitlements

| Capability | Basic | Core | Pro / Enterprise | Member |
| --- | --- | --- | --- | --- |
| List / profile / date / messengers | yes | yes | yes | yes (`TenantOperator`) |
| Filtered CSV | no — full list + toast | yes | yes | same as plan |
| Campaign handoff | upgrade CTA | upgrade CTA | `/campaigns/new?clientIds=` | plan, not role |

## Merge suspects

Sticky `IsMergeSuspect` from registration dedup. Filter + banner only. No merge UI. Do not change algorithm.
