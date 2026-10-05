# Story 42.3 role / plan / state matrix

Unchanged permissions. Frontend does not replace server authorization.

| Actor / state | Reorder basic items | Reorder/insert columns | Notes |
|---|---|---|---|
| Basic TenantOperator | Yes | Insert locked (named) | Can reorder existing basic blocks |
| Core / Pro / Enterprise TenantOperator | Yes | Yes if entitled | Existing 36.4/36.7 |
| TenantAdmin / TenantMember | Yes if activity permission allows | Same as today | |
| Draft / Published | Yes | Yes | Dirty after reorder |
| Archived / read-only | No — handle and cluster disabled | No | Perceivable disabled |
| Saving / save error | Reorder still local draft | — | No auto-save on drag |
| No selection | Reorder still allowed | — | Selection unchanged unless user selects |
| Selected nested block | Stays selected after move | — | Inspector follows `selectedBlockId` |

Plan-gated **inserts** stay named and explain the required plan. This story does not unlock inserts.
