---
title: In-app billing (replace Stripe Customer Portal)
status: final
created: 2026-08-09
updated: 2026-08-09
---

# PRD — In-app billing

## Problem

Paid workspace admins clicking **Manage billing** were redirected to Stripe Customer Portal (`billing.stripe.com`). Product requirement: **keep operators inside Cohestra** for payment method, contact info, invoices, and subscription cancellation.

## Scope change

Epic 14 Story 14.7 originally specified Stripe-hosted portal for money UX. This PRD supersedes portal redirect for tenant admins with an in-app billing experience. Stripe Checkout for new subscriptions remains hosted (unchanged).

## Goals

- FR-IB-1: Settings → Billing shows payment method, billing contact, invoice history, and plan actions without leaving Cohestra.
- FR-IB-2: Add/update payment method via Stripe Payment Element + SetupIntent (PCI stays with Stripe).
- FR-IB-3: Edit billing name/email synced to Stripe Customer.
- FR-IB-4: List recent invoices with PDF / hosted links (Stripe-hosted PDF URLs only — no invoice storage in Cohestra DB).
- FR-IB-5: Cancel subscription at period end and undo cancellation in-app.
- FR-IB-6: Portal API remains for backward compatibility / jobs but is not linked from UI.

## Non-goals (v1)

- Downgrade Core → Basic via in-app UI (still period-end via cancel).
- Stripe Tax, multiple payment methods, ACH.
- Replacing Stripe Checkout for first subscription purchase.

## Success metrics

- Zero tenant-admin billing flows require `billing.stripe.com` for routine management.
- Payment method save success rate comparable to portal baseline.

## Open items

- ~~Plan downgrade scheduling UI (Core ↔ Pro interval change) — defer; use checkout upgrade path + cancel for now.~~ **Superseded** — see `prd-billing-trust-downgrade-notifications-2026-08-10/addendum.md`
- Downgrade / billing-trust email matrix — see same addendum
