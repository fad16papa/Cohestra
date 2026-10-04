# Story 40.5 role / plan / state matrix

Continuity is navigation context only. It never authorizes a route, entitlement, or foreign row.

| Actor / state | Continuity behavior |
| --- | --- |
| TenantAdmin | Full room access. `ctx` restores the originating room when entitled. |
| TenantMember | Same navigation. Existing member locks (billing, website, campaigns) still apply. A breadcrumb cannot open a locked room. |
| Basic / Core / Pro / Enterprise | No entitlement change. UpgradePanel contracts unchanged. |
| Missing / unknown plan | Existing shell fallback. Continuity does not invent plan access. |
| Populated rooms | Journey hrefs carry typed `ctx`. |
| Empty rooms | Fallback crumbs use the canonical parent. |
| Denied / not-found / error | Back uses `canonicalParentHref` / `mobileBackAction`. |
| Suspended / OnHold | Existing billing banner and route guards remain authoritative. |
| Direct deep link | Missing `ctx` → canonical parent (Clients, Activities, Dashboard). |
| Refreshed deep link | `ctx` is in the URL, so crumbs/Back survive. |
| Expired session | Auth guard sends the operator to login. Continuity is not consulted. |
| Invalid return context | Parser returns null. Fallback parent. Never `location.assign` of raw input. |
| Cross-tenant destination | Tenant host + JWT isolation. Foreign UUIDs 404 / access denied. |

Owner-only billing and existing UpgradePanel contracts are untouched.
