# BMAD Code Review — Story 19.4 Paddle interval switch

**Implementation HEAD reviewed:** `90e1bc83`  
**Reviewer:** Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor; no cross-model delegation)  
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.

## Layers

- Blind Hunter: completed
- Edge Case Hunter: completed — two-step cancel-then-schedule is not atomic
- Acceptance Auditor: completed — monthly→annual ACs hold; deferred fail-closed holds; cancel disclosure added

## Two-step cancellation disposition

| Question | Finding |
|---|---|
| Clear succeeds, Update fails | Paddle cancel is gone; schedule is not created. Local state is reconciled to match Paddle (no Basic cancel). User message says retry or re-cancel. Not atomic. |
| ResolvePeriodEnd after clear | **Was a hole** if only `ScheduledChange.EffectiveAt` existed. Period end is now captured **before** clear. Missing period end fails before any mutation. |
| Local vs Paddle after partial | After handled failure: both “active, not canceling, no paid schedule.” |
| Retry | Safe: second deferred checkout sees no cancel and schedules `next_billing_period` + `do_not_bill`. |
| Duplicates / webhooks | After success, tenant paid-schedule marker blocks a second schedule. Webhook `ApplySubscription` remains the existing reconciler. Crash between clear and local save can leave stale Basic cancel until webhook or retry. |
| Recovery | Documented: retry the same deferred checkout, or cancel again from Settings → Billing. |

## Cancellation disclosure

Checkout summary now exposes `cancelAtPeriodEnd` without promoting Basic as a paid scheduled plan. Deferred confirm title/copy/action require explicit approval that cancellation is removed and that nothing is charged today.

## Triage

| ID | Source | Severity | Decision | Title |
| -- | ------ | -------- | -------- | ----- |
| 1 | owner+edge | MAJOR | patch | Deferred path skipped shared safety |
| 2 | edge | MAJOR | patch | Period end resolved after cancel clear |
| 3 | edge | MAJOR | patch | Partial two-step left cancel/local mismatch and no retry proof |
| 4 | auditor | MAJOR | patch | Deferred confirm did not disclose cancel removal |
| 5 | keep | — | keep | billing-b2 cancel-then-schedule |
| 6 | auditor | MINOR | defer | Portal-initiated cancel may not be on local summary until sync |
| 7 | auditor | — | defer | Live UAT SHA / Paddle error body |
| 8 | auditor | — | defer | No Paddle dollar preview; sandbox UAT |

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none on this implementation (CI on the new HEAD still required for MERGE READY)

## Final gate

| Gate | Result |
| ---- | ------ |
| Spec | Two-step recovery + disclosure added; 19.4 remains open |
| Implementation | Shared gate + pre-captured period end + partial reconcile |
| Production | NO-GO |
| Merge | Not authorized until owner approval after current-HEAD CI |
