---
baseline_commit: d4e689e
---

# Story 14.8: Trial reminders, delinquency jobs, and Basic dormancy

Status: done

## Story

As a Tenant Admin, I want automated trial, unpaid, and free-tier idle notices, so that money and dormancy are handled without Platform Admin Suspend-as-collections.

## Acceptance Criteria

- [x] TrialReminderJob: Trialing within 7d → daily email to admin contact
- [x] Delinquency: PastDue daily notify; day 8 → OnHold; day 29 → Archived; payment restore via webhook
- [x] Complimentary exempt from delinquency
- [x] Basic dormancy: warn day 83, archive day 90; login/reg resets via `LastActivityAt`
- [x] Complimentary Core/Pro exempt dormancy
- [x] State transitions covered by tests

## Dev Agent Record

- `BillingJobsHostedService` (daily): trial, delinquency, dormancy, scheduled plan apply
- `LastActivityAt` on Tenant; touched on login + public registration
- Email notices (in-app = existing BillingBanner shell refresh)

## Change Log

- 2026-07-22: DS 14.8 — billing jobs + dormancy complete.
