# Traceability — Story 19.4 email ownership

**HEAD:** `30942b26c97faf8e951367f84228872a34b63ec1`
**Spec:** `_bmad-output/specs/spec-story-19-4-email-ownership/SPEC.md`

| ID | Requirement | Tests | Status |
| -- | ----------- | ----- | ------ |
| CAP-1 | Immediate paid change and `transaction.completed` do not enqueue a Cohestra receipt | `A_Immediate_paid_plan_change_does_not_enqueue_cohestra_billing_confirmation`; `B_Transaction_completed_does_not_enqueue_payment_receipt` | Covered |
| CAP-2 | Scheduled downgrade keeps usage/read-only warning; no charge/invoice/price | `C_Scheduled_downgrade_keeps_usage_warning_without_paddle_financial_copy`; `C_Scheduled_downgrade_reminder_keeps_usage_warning`; deferred/confirm operational tests | Covered |
| CAP-3 | PastDue / OnHold / Dormancy remain; PastDue is access-impact | `D_OnHold_access_impact_notification_remains`; `D_PastDue_is_access_impact_not_payment_receipt`; `E_Dormancy_notification_remains` | Covered |
| CAP-4 | Retained notices use `Tenant.AdminContactEmail` | `F_Retained_notifications_use_admin_contact_email`; recipient tests unchanged | Covered |
| CAP-5 | Applied mail has no invoice/price | `G_Applied_and_scheduled_copy_do_not_repeat_invoice_or_price` | Covered |
| Empty owner | Do not stamp sent if no enqueue | `Empty_admin_contact_does_not_enqueue_or_count_as_sent` | Covered |
| #444 | Paddle customer email stays `AdminContactEmail` | Existing `PaddleBillingRecipientTests` | Covered (unchanged) |

## Quality gate

**PASS** for this slice's automated acceptance. Live UAT outbox confirmation remains out of scope.
