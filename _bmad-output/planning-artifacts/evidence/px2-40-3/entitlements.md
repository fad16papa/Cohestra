# Story 40.3 entitlement findings

Investigated frontend `isCoreOrAbove` / `isProPlan` and backend `ExportListCsvAsync` + `RequireProPlan`.

| Action | Frontend | Backend authority |
| --- | --- | --- |
| List / profile / PATCH status / date / messenger log | no plan gate | `TenantOperator` |
| CSV | Basic: toast + still download; Core+: filters sent | Basic ignores filters; Core+ applies filters |
| Campaigns compose | `isProPlan` | `[RequireProPlan]` |

Do not infer from frontend plan strings alone. Direct API remains authoritative. No new lock.
