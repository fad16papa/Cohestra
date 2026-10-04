# Story 40.4 — role / plan / state matrix

Date: 2026-10-04  
Server remains authoritative. Do not convert authorization failures into upgrade panels.

## Roles

| Surface | TenantAdmin | TenantMember |
| --- | --- | --- |
| Open `/activities` and `/activities/{id}` | Yes | Yes |
| Create / publish / unpublish / archive | Yes | Yes (`TenantOperator`) |
| Form / Design edit on Draft/Published | Yes | Yes |
| Form / Design on Archived | Read-only | Read-only |
| Cap banner | Yes | Yes |
| Cap upgrade CTA | Yes | Hidden (`showUpgradeLink` admin-only) |
| Workspace / billing settings | Yes | No |

## Plans

| Plan | Published-activity cap (server) | List/detail | Cap banner |
| --- | --- | --- | --- |
| Basic | 1 | Same UI | When dial warn/blocked |
| Core | 3 | Same UI | Same |
| Pro | 10 | Same UI | Same |
| Enterprise | 999 | Same UI | Unlikely |

Create is blocked when published dial is blocked. Archive remains a recovery write.

## Activity statuses

| Status | Default unfiltered list | Filtered view | Studios |
| --- | --- | --- | --- |
| Draft | Actionable group, by requested sort | Only drafts | Editable |
| Published | Actionable group, by requested sort | Only published | Editable (schedule locked until unpublish) |
| Archived | After all actionable rows | Only archived | Read-only |

## Room states

| State | Signal | Must not look like |
| --- | --- | --- |
| Empty tenant | 0 items, no filters | No-match, error, “all caught up” |
| No-match | 0 items, filters on | Global empty, error |
| Loading | Skeleton, h1 preserved | Empty |
| API error | `ProductErrorState` retry | Empty success |
| Unauthorized / denied | 401/403 copy | Upgrade panel, empty |
| Not found | 404 on detail | Generic error only |
| Cap reached | Named banner from shell dials | Inferred from card count |
| Archive success | Status text Archived; list regroups | Optimistic vanish |
| Archive failure | Record still visible; dialog error | Silent success |
| Follow-up source with id | Existing `/clients?activityId=` / `/clients/{id}` | Invented `/activities` link from name |
| Follow-up source name only | Caption text | Fabricated href |

## Isolation

List and get are tenant-filtered. Cross-tenant id → 404. Follow-up and Clients destinations stay on the authenticated tenant.
