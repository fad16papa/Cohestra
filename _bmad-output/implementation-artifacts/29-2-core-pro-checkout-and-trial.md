---
status: done
story_id: 29.2
story_key: 29-2-core-pro-checkout-and-trial
---

# Story 29.2: Core/Pro checkout and 30-day trial

Status: done

## Story

As a **Tenant Admin**,
I want **to start Core/Pro the same way as before, now through Paddle**,
so that **the 30-day trial and one-trial rule still hold**.

## Acceptance Criteria

- Checkout still uses `POST /api/v1/admin/billing/checkout` and the existing checkout page.
- First paid subscribe includes a 30-day trial disclaimer; card is collected.
- `HasConsumedTrial` tenants get an immediate-charge disclaimer; webhook/sync strips a catalog trial if Paddle starts one.
- Complimentary tenants cannot checkout.
- Saved payment method still subscribes in-app (`CompletedInApp`).
- Host allowlist for success/cancel URLs is unchanged.

## Notes

Paddle hosted checkout URL is returned. The checkout page opens Paddle.js overlay when a client token + `txn_` id are available, otherwise redirects.
