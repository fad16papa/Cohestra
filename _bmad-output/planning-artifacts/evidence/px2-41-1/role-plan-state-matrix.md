# Story 41.1 role / plan / state matrix

| Actor / state | Expected |
| --- | --- |
| TenantAdmin Basic weekly | Analytics content. No UpgradePanel. |
| TenantAdmin Basic monthly/custom/filters | Existing Core UpgradePanel. Weekly still reachable. |
| TenantAdmin Core/Pro/Enterprise | Existing allowed capabilities. Campaign block only when `campaignResults.available`. |
| TenantMember | Same operator access. No admin-only invention. |
| Unauthenticated | Auth/login handling. |
| Role denial (403) | Denied state. Never UpgradePanel. |
| Missing/unknown plan | No Basic assumption. No invented checkout SKU. |
| Loading | h1 Analytics + “Loading report…”. |
| Stale | “Updating report…” polite live region. Previous results hidden until the new key matches. |
| Empty period | “No registrations in this period.” Not success copy. Export disabled with reason. |
| Recoverable error | ProductErrorState + Try again. |
| Export failure | Toast with server detail. Room heading unchanged. |
