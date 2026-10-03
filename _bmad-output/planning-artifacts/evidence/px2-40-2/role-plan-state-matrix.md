# Story 40.2 role / plan / state matrix

Date: 2026-10-03  
Owner: Grok 4.6

## Roles × plans

Follow-up is `ALWAYS_UNLOCKED`. Clients API is `TenantOperator`. No new entitlement.

| Actor | Basic | Core | Pro | Enterprise |
| --- | --- | --- | --- | --- |
| TenantAdmin | View room, filter, open `/clients/{id}` | same | same | same |
| TenantMember | View room, filter, open permitted `/clients/{id}` | same | same | same |

Members must not see new workspace-setting, team, billing, or checkout controls on this room. Those surfaces stay on their existing admin-only routes.

Server 401/403 remains the denial authority. The room must not invent a client-side “member cannot view Follow-up” lock.

## Room states

| State | Visible h1 | Body | Totals |
| --- | --- | --- | --- |
| Loading | Follow-up | Named skeleton / `aria-busy` | Hidden or not claimed |
| Recoverable error | Follow-up | `ProductErrorState` + Try again | Not claimed |
| Permission denial | Follow-up | Access copy | Not claimed |
| Global empty | Follow-up | “No one needs follow-up.” | Needs-attention = 0; Healthy chip may be > 0 |
| Filter empty | Follow-up | “No one in {Category}.” | Needs-attention > 0; selected category total = 0 |
| Populated | Follow-up | Current category page + honest pager | Chip counts from server; Healthy excluded from needs total |
| Page empty after data change | Follow-up | Reconcile to last valid page; do not claim global-empty | Counts stay server-authoritative |

## Category × needs-attention

| Category | Listable | In needs-follow-up / needs-attention total |
| --- | --- | --- |
| Due now | Yes | Yes |
| At risk | Yes | Yes |
| Opportunity | Yes | Yes |
| Healthy | Yes | **No** |

## Continuity states (must not change)

| Surface | State |
| --- | --- |
| Dashboard `?view=` | query > preference > overview; re-select no-op |
| Dashboard Needs follow-up | 5-row preview; error ≠ empty |
| Epic 37 | pathname-only enter |
| 39.3 locks | Campaigns/Website/Analytics unchanged |
