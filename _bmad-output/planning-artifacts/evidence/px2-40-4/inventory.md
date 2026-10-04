# Story 40.4 — current Activities inventory

Date: 2026-10-04  
Baseline: `327c0a4a`  
Owner: Grok 4.6

## API

`GET /api/v1/admin/activities` — `ActivitiesController.List` → `ActivityService.ListAsync`.

Auth: `[Authorize(Policy = TenantOperator)]` — TenantAdmin and TenantMember.

| Param | Default | Server behavior |
| --- | --- | --- |
| `status` | omitted = all | `draft` / `published` / `archived`; invalid → 400 |
| `category` / `community` / `search` | — | Server exact / contains |
| `page` | 1 | `< 1` → 1 |
| `pageSize` | 25 | `< 1` → 25; max 100 |
| `sortBy` | `updatedAt` | `name`, `createdAt`, `updatedAt`, `registrationCount` |
| `sortDirection` | field-dependent | omitted + name → asc; otherwise desc |

UI sends `pageSize=20`. Client does **not** re-sort the page.

**Default order today:** `UpdatedAt desc` only. `ArchiveAsync` stamps `UpdatedAt = UtcNow`. Archived can lead page 1 (PX2-LIVE-005).

**Tie-break today:** none. Equal timestamps are DB-unstable.

Archive: `POST .../{id}/archive`. Same operator policy. Recovery write when over-plan (create blocked, archive allowed). Idempotent if already archived.

## Roles / plans / cap

| Action | TenantAdmin | TenantMember |
| --- | --- | --- |
| List / get / create / update / publish / unpublish / archive / studios | Yes (policy) | Yes (policy) |
| Workspace settings | Yes | No |
| Cap upgrade link | Shown when admin | Hidden |

Plan published-activity caps: Basic 1, Core 3, Pro 10, Enterprise 999. Cap UI reads tenant shell dials, not list length.

## Frontend list

- `web/app/(admin)/activities/page.tsx` remounts `ActivitiesListPage` on every query string (`key={listKey}`).
- Filters URL-synced: status, search, community, category, sort.
- Page is local React state. Filter change resets page to 1 via remount + `listQueryKey` effect. Removing remount without fixing the effect skips refetch when already on page 1.
- States: skeleton; `<p role="alert">` error (no 401/403 split); `ProductEmptyState` global empty; dashed no-match; cap banner + recovery chips.
- Cards only. No table. Status badge is text + color.
- Card actions: open detail, copy link (published), registrations, clients `?activityId=`. Archive/publish/studio live on detail Overview.

## Detail

- Populated `PageHeader title={activity.name}` — already the activity name.
- Loading / error: `h1` `Activity`. Error uses `ProductErrorState` without 404 vs 403 titles.
- Tabs: Overview, Design, Form, Registrations, Share kit. Section titles are `h2`.
- Publish confirm: existing `ActivityPublishConfirmDialog` (do not change semantics).
- Archive: dialog for Published only; Draft archives immediately.

## Studios

| Surface | Draft | Published | Archived |
| --- | --- | --- | --- |
| Form Studio | Editable | Editable (live note) | Read-only banner + disabled |
| Design Studio | Editable | Editable | Inputs/save disabled |
| Overview schedule | Editable | Read-only until unpublish | Read-only |

Do not change entitlements, composition, Split/Poster/Conversational/Modern Centered, draft survival, or preview/publish continuity.

## Follow-up / Opportunity

- Opportunity is Follow-up `?category=opportunity` (Story 40.2). Not an activity type.
- No `/opportunities` route. Activities nav: All / Communities / Categories only.
- Follow-up rows expose `lastActivityName` text. No `ActivityId`.
- Client registration history shows `activityName` as text, not a link.
- Existing truthful destinations that already have IDs: `/activities/{id}`, `/clients?activityId=`, `/clients/{id}`.

## Tests that assume first visible activity

Several protected e2e specs click `.first()` on `/activities/{uuid}` links. After Archived-last, the first visible card should be actionable when any actionable activity exists. Do not write new first-card assertions; assert status and order explicitly.
