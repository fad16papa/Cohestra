# Review flow (Option A)

## Immediate paid change (e.g. Active Pro Monthly → Pro Yearly)

```
Settings → Billing → Change plan
  → select Pro + Yearly
  → Cohestra GET/POST preview (read-only PATCH /subscriptions/{id}/preview)
  → "Review billing change"
       Current: Pro Monthly          (Cohestra labels from mapped live price)
       New: Pro Yearly
       Credit: <update_summary.credit if present>
       Due now: <immediate_transaction.details.totals.grand_total + currency>
       Next renewal: <next_billed_at>
       New recurring: <recurring_transaction_details totals>
  → Cancel  |  Confirm yearly billing
  → PATCH /subscriptions/{id}  (same items + proration_billing_mode as preview)
  → "Yearly billing is active."
       txn/invoice, amount charged, currency, next renewal
       only from PATCH/webhook/list-transactions
  → Settings → Billing refreshed; invoice history lists the Paddle txn
```

Webhook `subscription.updated` / transaction webhooks remain source of truth if UI races.

## Copy rules

- Preserve a confirmation step. Replace generic "Paddle calculates the exact credit when you confirm" with provider fields when present.
- If preview fails: do not guess; block confirm or keep non-numeric generic copy and say review is unavailable — product default: **block confirm** for immediate-charge cases.
- Button: "Confirm yearly billing" / "Confirm plan change" — not "Open Paddle Checkout".

## New subscription (unchanged)

```
Basic → Core/Pro
  → ordinary Paddle Checkout overlay
  → return URL
  → webhook provisions single PaddleSubscriptionId
```

## Implementation notes (not authorized until owner accepts)

- Add `PreviewSubscriptionUpdateAsync` on `IPaddleApiClient` → `PATCH subscriptions/{id}/preview`.
- Split existing `CreateCheckoutSessionAsync` paid path: preview endpoint (no mutation) vs confirm endpoint (current PATCH).
- Frontend: load preview before opening the dialog; `completedInApp` remains for confirm, not for preview.
- Tests: mock preview payload; assert no second `CreateCheckoutTransactionAsync` / `CreateSubscriptionAsync` on paid change.
- No sandbox mutation in the design phase.
