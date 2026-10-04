# Story 40.3 role / plan / state matrix

| Actor | Plan | List | Profile | Export | Campaign bar | Open in Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| TenantAdmin | Basic | yes | yes | full list + hint | upgrade → billing | if Due now |
| TenantAdmin | Core | yes | yes | filtered | upgrade → billing | if Due now |
| TenantAdmin | Pro / Enterprise | yes | yes | filtered | Add to campaign | if Due now |
| TenantMember | Basic | yes | yes | full list + hint | ask-admin copy if shown | if Due now |
| TenantMember | Core | yes | yes | filtered | ask-admin | if Due now |
| TenantMember | Pro / Enterprise | yes | yes | filtered | Add to campaign | if Due now |

Member never gains Team/Billing. Server `TenantOperator` is authoritative. Campaign API stays `RequireProPlan`.

## UI states

| Surface | States |
| --- | --- |
| List | loading, global empty, no-match, recoverable error, populated, paging empty |
| Profile | loading (`h1` Client), error, not-found/denied via existing error, populated (`h1` name) |
| Export | disabled when `totalCount=0`; Basic filtered → still exports unfiltered |
| Campaign | hidden/locked below Pro; consenting IDs only |
