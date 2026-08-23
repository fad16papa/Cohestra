---
status: done
story_id: 29.4
story_key: 29-4-in-app-billing-details-and-payment-method
---

# Story 29.4: In-app billing details and payment method

Status: done

## Story

As a **Tenant Admin**,
I want **the same Settings → Billing panel**,
so that **contact, card last4, and invoices still appear after the merchant swap**.

## Acceptance Criteria

- `GET /api/v1/admin/billing/details` loads Paddle customer, default card, subscription period, and recent transactions.
- Add/update card uses the same dialog; Paddle.js overlay + `update-payment-method` transaction replace Stripe Elements.
- Contact update still PATCHes through the existing route (Paddle customer name/email).
- Complimentary tenants do not manage cards.
