# Traceability — Story 19.4 Option A

| AC / matrix | Test evidence | Result |
| --- | --- | --- |
| A. Active Pro Monthly → Pro Annual preview + PATCH | `Confirm_active_pro_monthly_to_annual_uses_prorated_immediately`, `Preview_active_pro_monthly_to_annual_exposes_provider_money_only` | PASS |
| B. Active Core Monthly → Core Annual | `Confirm_active_core_monthly_to_annual_uses_prorated_immediately` | PASS |
| C. Active Core Monthly → Pro Monthly | `Confirm_active_core_monthly_to_pro_monthly_keeps_next_period_proration` | PASS |
| D. Active Core Monthly → Pro Annual | `Confirm_core_monthly_to_pro_annual_patches_same_subscription` | PASS |
| E. Trialing Monthly → Annual `do_not_bill` | `Confirm_trialing_*`, `Preview_trialing_monthly_to_annual_uses_do_not_bill_and_zero_or_omitted_due` | PASS |
| F. Annual → Monthly deferred | `Checkout_annual_to_monthly_is_deferred`, `Preview_deferred_annual_to_monthly_skips_provider_preview` | PASS |
| G. Pro → Core deferred | `Confirm_deferred_pro_to_core_preserves_period_end_schedule` | PASS |
| H. PastDue rejected | `Checkout_past_due_subscription_is_rejected_without_update`, `Preview_past_due_is_rejected` | PASS |
| I. Scheduled paid downgrade rejected | `Preview_scheduled_paid_downgrade_is_rejected`, checkout scheduled-change tests | PASS |
| J. Pending cancellation immediate | `Preview_pending_cancellation_immediate_change_is_rejected`, deferred two-step tests preserved | PASS |
| K. Preview failure no mutation | `Preview_failure_blocks_confirm_and_does_not_mutate` | PASS |
| L. Stale preview 409 | `Confirm_item_change_after_preview_is_conflict` | PASS |
| M/N. Basic → Pro/Core Checkout | `Checkout_basic_to_pro_still_opens_paddle_checkout`, `Checkout_basic_to_core_still_opens_paddle_checkout` | PASS |
| O. Success without transaction | `Confirm_active_pro_monthly_to_annual_uses_prorated_immediately` asserts null `AmountCharged` | PASS |
| TenantMember 403 | `TenantAuthzIntegrationTests` preview + change | PASS |
| Same-id invariant | `Confirm_does_not_persist_a_different_paddle_subscription_id` | PASS |
| Frontend review/loading/a11y/390 | `plan-change-review.test.ts`, `billing-api.test.ts` | PASS |
