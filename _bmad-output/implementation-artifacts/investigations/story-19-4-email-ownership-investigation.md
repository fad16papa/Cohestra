# Investigation: Story 19.4 — remove Cohestra emails that duplicate Paddle

## Hand-off Brief

1. **What happened.** After Paddle correctly emailed the billing owner, a second Cohestra billing message created duplicate customer communication.
2. **Where the case stands.** There is **no** Cohestra payment-receipt / invoice producer. Immediate Option A confirm and `transaction.completed` do not enqueue `billing.notification`. The overlapping Cohestra mail is `scheduled_downgrade` (and applied-copy invoice sentence). UAT outbox row was **not readable** here.
3. **What's needed next.** Keep Cohestra-owned operational producers. Strip Paddle-owned financial language. Do not revert #444.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 19.4 email ownership |
| Date opened | 2026-10-13 |
| Status | Concluded for classification |
| System | main `6c12d068`; UAT outbox not on this VM |
| Evidence sources | Composer, jobs, webhook, PaddleBillingService, local `outbox_messages` |

## Problem Statement

Owner: Paddle now owns payment/invoice/billing-date customer mail. Cohestra must not send a second email with the same provider facts. Do not delete Cohestra-only operational mail.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `BillingNotificationComposer` | Available | ScheduledDowngrade / Reminder / Applied |
| `BillingJobsHostedService` | Available | Trial, PastDue, OnHold, Dormancy |
| `PaddleBillingService` | Available | Only scheduled-downgrade confirm enqueues |
| `PaddleWebhookProcessor` | Available | No outbox enqueue |
| Local `outbox_messages` | Available | 0 billing.notification rows |
| UAT outbox | Missing | No droplet SSH |

## Confirmed Findings

### Finding 1: Closed set of billing.notification types

**Evidence:** `OutboxPayloads.cs` `BillingNotificationNoticeTypes`

**Detail:** `trial_reminder`, `past_due`, `on_hold`, `dormancy`, `scheduled_downgrade`, `scheduled_downgrade_reminder`, `scheduled_downgrade_applied`. Plus `follow_up_digest` (not a billing lifecycle mail).

### Finding 2: Immediate paid plan change and webhook do not send Cohestra receipts

**Evidence:** `ConfirmPlanChangeAsync` has no composer call. `HandleTransactionCompletedAsync` applies tenant state only.

**Detail:** Tests A/B must lock this absence. There is no producer to delete for payment confirmed / invoice.

### Finding 3: Deferred schedule is the only plan-change email

**Evidence:** `PaddleBillingService.cs` `EnqueueScheduledDowngradeConfirmation` after `ApplyScheduledDowngradeState`. Copy includes “No charge today — your saved payment method will be billed at the new price from that date.”

**Detail:** Paddle already sends subscription / billing-date / no-charge-now. Cohestra still owns “keep current plan access until DATE” and usage/read-only warnings.

### Finding 4: Reminder is usage-gated

**Evidence:** `ProcessScheduledDowngradeRemindersAsync` returns when `warnings.Count == 0`.

**Detail:** Cohestra-only. Keep.

### Finding 5: Applied copy repeats invoice/price

**Evidence:** `EnqueueScheduledDowngradeApplied` “Your next invoice will reflect the {plan} price.”

**Detail:** Workspace-now-on-plan is Cohestra. Invoice/price is Paddle.

### Finding 6: PastDue copy overlaps Paddle dunning; OnHold/Dormancy/Trial do not

**Evidence:** PastDue: “Your last payment did not succeed.” OnHold: workspace read-only. Dormancy: Basic archive. Trial: generic trial-end + manage billing; Paddle coverage not assumed.

## Classification

| Notice | Class | Action |
| ------ | ----- | ------ |
| Payment receipt / invoice | Does not exist | Keep absent |
| `scheduled_downgrade` | Hybrid | Keep; strip charge/invoice/payment-method price language |
| `scheduled_downgrade_reminder` | Cohestra-only | Keep |
| `scheduled_downgrade_applied` | Hybrid | Keep; strip next-invoice/price |
| `trial_reminder` | Cohestra-only (Paddle coverage unproven) | Keep |
| `past_due` | Hybrid | Keep; access-impact copy, not payment-failure receipt |
| `on_hold` | Cohestra-only | Keep |
| `dormancy` | Cohestra-only | Keep |
| `follow_up_digest` | Not billing | Keep |

## UAT email identity

Local outbox empty. UAT Postgres not readable.

**Code-path:** the only Cohestra billing mail that can fire on a plan-change UAT and overlap Paddle “billing date changed” is `scheduled_downgrade` from `EnqueueScheduledDowngradeConfirmation`.

If UAT was **only** an immediate Option A PATCH, Cohestra enqueued **no** `billing.notification`. The duplicate the owner saw is then either a deferred-schedule confirm from the same session, or not a `billing.notification`. Do not invent a receipt producer to delete.

COHESTRA EMAIL NOTICE TYPE: `scheduled_downgrade` (code-path; live UAT row unverified)

TRIGGER: `ScheduleDowngradeExistingSubscriptionAsync` → `EnqueueScheduledDowngradeConfirmation`

PADDLE EQUIVALENT EXISTS: YES (billing-date / subscription scheduled / no charge now). Cohestra-only remainder: workspace access until date + usage warnings.

## Conclusion

**Confidence:** High for inventory and “no receipt producer.” Medium for the exact UAT outbox row.

Do not revert #444. Do not add sandbox-only suppression.
