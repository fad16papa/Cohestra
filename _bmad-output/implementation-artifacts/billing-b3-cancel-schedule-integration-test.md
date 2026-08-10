---
baseline_commit: 9437732
---

# Story billing-b3: Integration test — cancel-at-period-end with active schedule

Status: done

## Story

As a **developer**,
I want **automated coverage of cancel-at-period-end when a Stripe subscription schedule is active**,
So that **PR #170 regressions (schedule release before cancel) cannot ship unnoticed**.

## Acceptance Criteria

- [x] **AC1** Test exercises `StripeBillingService.CancelSubscriptionAtPeriodEndAsync` with mocked Stripe HTTP (no live keys).
- [x] **AC2** Asserts schedule release API called before subscription cancel update.
- [x] **AC3** Asserts tenant scheduled downgrade fields cleared and subscription cancel-at-period-end applied.

## Tasks

- [x] Add `StripeBillingCancelAtPeriodEndTests` with HTTP mock handler
- [x] Story done, commit, push, PR

## Dev Agent Record

### File List

- `src/Infrastructure.Tests/Billing/StripeBillingCancelAtPeriodEndTests.cs`

## Change Log

- 2026-08-10: Story created from billing follow-ups B3.
- 2026-08-10: Added Stripe HTTP mock integration test for cancel-with-schedule flow.
