---
baseline_commit: d4e689e
---

# Story 14.7: Customer Portal, period-end cancel/downgrade, over-limit

Status: done

## Story

As a Tenant Admin, I want to manage payment method, cancel, and plan changes in Stripe Customer Portal, so that changes apply at period end and over-limit locks are clear.

## Acceptance Criteria

- [x] Manage billing → Stripe Customer Portal; return URL to Settings → Billing; Members blocked
- [x] Cancel/downgrade scheduled via webhook period-end semantics (`ScheduledPlan`)
- [x] ReadOnly_OverLimit: admin write guard + public reg block when usage exceeds caps
- [x] Basic billing shows upgrade CTAs only
- [x] Stripe-hosted money UX only

## Dev Agent Record

- `POST /api/v1/admin/billing/portal`
- `StripeTenantBillingSync` scheduled plan + period-end handling
- `ITenantAccessService` + `TenantWriteAccessMiddleware`
- Public registration blocked when access denies

## Change Log

- 2026-07-22: DS 14.7 — portal + over-limit enforcement complete.
