---
baseline_commit: ead04fa
---

# Story billing-b2: Resume subscription + active schedule (dual-state fix)

Status: done

## Story

As a **tenant admin** managing billing in Settings,
I want **Keep subscription and plan scheduling to behave predictably when cancel-at-period-end and a paid schedule coexist**,
So that **I am not surprised by silent downgrades or conflicting end-of-period outcomes**.

## Acceptance Criteria

- [x] **AC1** Scheduling paid downgrade/interval while `cancel_at_period_end=true` clears cancel in Stripe before creating schedule; tenant Basic cancellation artifacts cleared.
- [x] **AC2** Resume (`cancel_at_period_end=false`) never releases an active Stripe schedule.
- [x] **AC3** Keep subscription shows confirm when `cancelAtPeriodEnd` and pending paid schedule (plan ≠ Basic, future effective date).
- [x] **AC4** Resume clears orphan tenant scheduled fields when Stripe has no `scheduleId` but tenant still has scheduled paid plan metadata.
- [x] **AC5** Unit tests cover scheduler resume/clear helpers and cancel-before-schedule gate.

## Tasks

- [x] Backend: clear cancel before schedule in `ScheduleDowngradeExistingSubscriptionAsync`
- [x] Backend: stale schedule cleanup on resume in `UpdateSubscriptionCancelAtPeriodEndAsync`
- [x] Frontend: `hasPendingPaidScheduleChange` helper + resume confirm dialog
- [x] Tests: `StripeSubscriptionDowngradeSchedulerTests` (+ helpers)
- [x] Mark story done, commit, push, PR

## Dev Agent Record

### Completion Notes

- Forged B2 rejected auto-release on resume; implemented fix-at-source (clear cancel when scheduling paid change) plus resume confirm dialog and orphan tenant cleanup.
- Resume path does not call schedule release — `ShouldReleaseScheduleBeforeCancelAtPeriodEnd` remains cancel-only.

### File List

- `src/Infrastructure/Billing/StripeBillingService.cs`
- `src/Infrastructure/Billing/StripeSubscriptionDowngradeScheduler.cs`
- `src/Infrastructure.Tests/Billing/StripeSubscriptionDowngradeSchedulerTests.cs`
- `web/lib/billing/checkout-validation.ts`
- `web/lib/billing/checkout-validation.test.ts`
- `web/components/billing/in-app-billing-panel.tsx`

## Change Log

- 2026-08-10: Story created from forged B2 spec.
- 2026-08-10: Implemented dual-state billing trust fixes (backend + Settings UI + tests).
