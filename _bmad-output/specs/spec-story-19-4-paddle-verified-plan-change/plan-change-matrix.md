# Plan-change matrix

Each row: existing Cohestra tenant + live Paddle subscription unless noted.

| Case | Mechanism | Paddle hosted screen | Preview | Mutation |
| ---- | --------- | -------------------- | ------- | -------- |
| Active Pro monthly → Pro annual | Same-subscription PATCH | No | Required (`prorated_immediately`) | Immediate PATCH after confirm |
| Active Core monthly → Core annual | Same-subscription PATCH | No | Required (`prorated_immediately`) | Immediate PATCH after confirm |
| Active Core monthly → Pro monthly | Same-subscription PATCH | No | Required (`prorated_immediately`) | Immediate PATCH after confirm |
| Active Core monthly → Pro annual | Same-subscription PATCH | No | Required (`prorated_immediately`) | Immediate PATCH after confirm |
| Active annual → monthly (same tier) | Deferred schedule (`ShouldDeferPlanChange`) | No | Optional; show money only if preview returns it | Period-end item replace / scheduled change (existing `#440`) |
| Active Pro → Core (any interval) | Deferred schedule | No | Optional | Period-end |
| Trialing monthly → annual | Same-subscription PATCH | No | Required (`do_not_bill`) | Immediate PATCH; due now must be provider 0 or omitted |
| PastDue any plan change | Reject | Payment-method Checkout **or** portal on **same** subscription | Not available (`past_due`) | None until recovered |
| Scheduled cancellation | Resume/clear then treat as Active | No | After resume | Existing two-step cancel recovery then preview |
| Scheduled paid downgrade | Reject until undo | No | None | None |
| Missing payment method + immediate charge | Reject; send to payment-method update | Payment-method Checkout on same-sub txn | None | None until PM on file |
| Basic → Core/Pro, new paid, first PM | Ordinary Checkout | Yes (Checkout overlay) | N/A | New subscription **once** |
| Complimentary | Reject Checkout (existing) | No | None | None |

## Portal vs Checkout vs PATCH

| Tool | Same subscription? | Use |
| ---- | ------------------ | --- |
| Customer Portal | Yes (view/cancel/card) | Manage payment, invoices, cancel. **Not** catalog plan switch. |
| Checkout `items` | **No** — new subscription | New paid start only. |
| Checkout payment-method txn | Yes (zero-value or past-due txn) | Card update / past-due pay. |
| `PATCH …/preview` | Yes (no mutation) | Review. |
| `PATCH …/{id}` | Yes | Apply previewed catalog change. |
