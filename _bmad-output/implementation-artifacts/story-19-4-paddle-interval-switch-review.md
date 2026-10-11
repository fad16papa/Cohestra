# BMAD Code Review — Story 19.4 Paddle interval switch

**Implementation HEAD reviewed:** `88d433272dc77ff1cac61e22496e6dafbcfbbbfd`  
**Reviewer:** Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, same model; no cross-model delegation)  
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.

## Layers

- Blind Hunter: completed
- Edge Case Hunter: completed — deferred path could mutate before shared safety
- Acceptance Auditor: completed — immediate monthly→annual ACs still hold; deferred fail-closed now matches policy

## Deferred-path disposition

| Question | Finding |
|---|---|
| Annual→monthly + scheduled cancel | **Authorized billing-b2**, not a defect: clear cancel, then schedule. Immediate upgrades still reject pending cancel. |
| Past-due can enter deferred? | **Was yes** — MAJOR. Now rejected before PATCH or `ClearScheduledChange`. |
| Paused/canceled can enter deferred? | **Was yes** if tenant status was stale Active. Now rejected. |
| Multi-item / qty > 1 updated by deferred? | **Was yes** (`UpdateSubscriptionItemsAsync` replaces all items). Now rejected. |
| Scheduled changes consistent? | Tenant marker and Paddle `scheduled_change=update` now reject on both paths. |
| Contradict 19.4 fail-closed? | Yes, before this patch, for past-due / restricted / extra items. |
| Is cancel-clear authorized? | Yes — billing-b2 AC1. Kept only after shared safety (single item, not past due/paused). |

Shared gate: `RejectBeforeMutation(subscription, status, allowPendingCancel)`. Item checks run before the cancel exception.

## Triage

| ID | Source | Severity | Decision | Title |
| -- | ------ | -------- | -------- | ----- |
| 1 | owner+edge | MAJOR | patch | Deferred path skipped `RejectImmediateUpdate` |
| 2 | edge | MAJOR | patch | `allowPendingCancel` skipped item-count/quantity checks |
| 3 | edge | MINOR | patch | Deferred used a second GET and `Items[0].Price.Id` only |
| 4 | auditor | — | keep | billing-b2 cancel-then-schedule on safe deferred changes |
| 5 | auditor | MINOR | defer | Checkout summary hides Basic cancel; deferred dialog does not say it will resume the subscription |
| 6 | auditor | — | defer | Live UAT SHA / Paddle error body missing |
| 7 | auditor | — | defer | No Paddle dollar-amount preview |
| 8 | auditor | — | defer | Authorized sandbox UAT after merge/deploy |

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none  

Immediate monthly→annual remains: trial `do_not_bill`; active `prorated_immediately`; same-frequency `prorated_next_billing_period`; live price interval; unmapped price fail-closed; sanitized provider errors.

## Final gate

| Gate | Result |
| ---- | ------ |
| Spec | Refined cancel vs unsafe-state policy; 19.4 remains open |
| Implementation | Shared pre-mutation gate |
| Product/UX acceptance | Not claimed |
| Production | NO-GO |
| Merge | Not authorized |
