# Story 41.3 role × plan × state matrix

Baseline: `ac5538e1`  
Resolver: `resolveNavEntitlement("campaigns")` + API 403  
Do not change plan math, prices, Paddle, or TenantOperator.

| Plan | Role | Nav | `/campaigns` | `/campaigns/new` | `/campaigns/{id}` | Checkout |
| --- | --- | --- | --- | --- | --- | --- |
| Basic | TenantAdmin | locked Pro | UpgradePanel | UpgradePanel | UpgradePanel | Start Pro trial |
| Basic | TenantMember | locked Pro | UpgradePanel ask-admin | ask-admin | ask-admin | None |
| Core | TenantAdmin | locked Pro | UpgradePanel | UpgradePanel | UpgradePanel | Start Pro trial |
| Core | TenantMember | locked Pro | ask-admin | ask-admin | ask-admin | None |
| Pro | TenantAdmin | unlocked | content | content | content | None on room |
| Pro | TenantMember | unlocked | content | content | content | None |
| Enterprise | TenantAdmin | unlocked | content | content | content | None |
| Enterprise | TenantMember | unlocked | content | content | content | None |
| Missing / null / unknown | Admin or Member | pending | pending status, no SKU | pending | pending | None |
| Shell not ready | any | pending | loading skeleton | loading | loading | None |
| Recognized Pro+, API 403 without `plan_locked` | any TenantOperator | unlocked chrome | ProductErrorState denied | denied | denied | None |
| API 403 `plan_locked` | Admin | locked or open chrome | UpgradePanel | UpgradePanel | UpgradePanel | Existing Pro |
| API 403 `plan_locked` | Member | locked or open chrome | ask-admin | ask-admin | ask-admin | None |
| Unauthenticated | — | login | login | login | login | — |
| Cross-tenant campaign id | other tenant JWT | n/a | n/a | n/a | 404 / not found, not another tenant’s body | — |
| Suspended / OnHold | existing shell | existing | existing | existing | existing | existing |

## List content states (unlocked)

| State | Presentation |
| --- | --- |
| loading | PageHeader + ListSkeleton |
| empty | ProductEmptyState compose CTA |
| error | ProductErrorState + Try again |
| denied | ProductErrorState, no UpgradePanel |
| populated | subject, sent-at, visible status text, sent/failed/skipped counts |
| paging | Previous/Next when `totalCount` > `pageSize` |

## Compose states (unlocked)

| State | Presentation |
| --- | --- |
| pristine | no leave warning; send blocked with reason |
| dirty | `beforeunload`; status “Unsaved draft” |
| invalid / incomplete | named send-block reason |
| preview loading | “Loading recipients…” / “Waiting for recipient preview…” |
| preview failure | alert + retry |
| zero recipients | cannot open confirm |
| ready | count from preview `withEmailCount` |
| confirmation open | AlertDialog irreversible copy |
| sending | Send disabled; “Sending…” |
| queued / sending result | not success; link to detail |
| partial / failed / completed | sent, failed, skipped distinguished |

Role denial never becomes an UpgradePanel. Unknown plan never becomes Basic and never receives a checkout SKU.
