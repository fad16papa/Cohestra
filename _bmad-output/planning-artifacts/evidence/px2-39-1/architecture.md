# Story 39.1 route / redirect / navigation architecture

Recorded 2026-09-30 before application-code changes.

## Decision

One desktop IA source: `web/lib/admin-nav.ts` (`adminNavItems` + `isAdminNavItemActive` + breadcrumbs). Command palette and More sheet consume it. Do not fork a second rail list.

Canonical room URLs live in `web/lib/admin-canonical-routes.ts` so redirects, filter-bar replaces, and dashboard links cannot drift.

## Desktop rail (≥768)

| Order | Label | href |
| --- | --- | --- |
| 1 | Dashboard | `/dashboard` |
| 2 | Clients | `/clients` |
| 3 | Activities | `/activities` (+ existing children) |
| 4 | Follow-up | `/follow-up` |
| 5 | Analytics | `/analytics` |
| 6 | Cohestra AI | `/ai` |
| 7 | Website | `/dashboard/website` |
| 8 | Campaigns | `/campaigns` |

Compact 768–1023: existing `w-16` + `sr-only` labels. Expanded ≥1024: `lg:w-60`. No new motion.

## Redirects (silent, query-preserving)

| From | To |
| --- | --- |
| `/reports` | `/analytics` |
| `/intelligence` | `/ai` |
| `/needs-attention` | `/ai` |
| `/settings` | `/settings/profile` |

Server `redirect()` in the old route files. Search params copied verbatim (including `preset`).

## Rooms

| Route | Presentation in 39.1 |
| --- | --- |
| `/analytics` | Existing Reports UI; `h1` **Analytics**. Internal `router.replace` uses `/analytics`. |
| `/follow-up` | Stub: `h1` Follow-up + empty / loading / error primitives. Feature owner **40.2**. |
| `/ai` | Stub: `h1` Cohestra AI + empty / loading / error primitives. Feature owner **41.2**. |
| `/settings/profile` | Existing Settings page content. |

## Footer

TenantAdmin: profile / team / billing hrefs as DESIGN.md §3.1. Billing visibility unchanged (`Basic` or billing owner). TenantMember: Settings `/settings/profile` only.

## Out of this story

Mobile tab order (39.2), entitlement locks (39.3), page-header visual (39.4), error/404 (39.5).
