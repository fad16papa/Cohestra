# Story 41.1 current API and Analytics inventory

Inventoried on baseline `6d9c6af8` before implementation.

## Routes

| Path | Behavior |
| --- | --- |
| `/analytics` | `ReportsPageClient` behind Suspense. Empty query `replace`s to `?preset=weekly`. |
| `/reports` | Server `redirect(destinationWithSearch("/analytics", searchParams))`. |
| `/reports/extra` | Authenticated 404. Not a redirect. |
| `/dashboard?view=graphs` | Separate Dashboard view. KPI + “View Analytics” already point at `/analytics` with no query. |

## HTTP

| Method | Path | Query |
| --- | --- | --- |
| GET | `/api/v1/admin/reports` | `preset`, `from`, `to`, `activityId`, `community`, `leadStatus`, `referralSource` |
| GET | `/api/v1/admin/reports/export` | same |

Policy: `TenantOperator` (Admin + Member). TenantId fail-closed. No saved-views endpoint.

Presets: `weekly` (Mon UTC → now), `monthly` (1st UTC → now), `custom` (`from` 00:00 → `to` 23:59:59 UTC).

## Frontend

`web/lib/reports-api.ts` parses the existing `ReportResult`. Extra TS keys `followUpDue` / `nationality` / `search` are **not** sent.

`web/components/reports/**` is the room. Loading, stale (“Updating report…”), error `<p role="alert">` without retry, empty period, Basic UpgradePanel, export button with no disabled reason.

Invalid `preset` → `weekly`. Invalid `leadStatus` → empty.

## Entitlements

Nav `/analytics` is always unlocked. Basic weekly 200. Basic advanced filters or custom → API 400. Frontend also locks **monthly**. Core+ rankings. Pro/Enterprise campaign results.

Missing/unknown plan: `isBasicPlan` is false, so the page does not invent a Basic lock or checkout SKU.

## Motion / storage

`adminRouteTransitionKey` is pathname-only. User filter writes use `router.push` to `/analytics` so history restores query state. Missing-query default still `replace`s to `?preset=weekly`. No sessionStorage route identity.
