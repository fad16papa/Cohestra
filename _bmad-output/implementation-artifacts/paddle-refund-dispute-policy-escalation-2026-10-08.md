# Paddle refund / dispute policy — implemented vs escalated

**Date:** 2026-10-08  
**Story:** supports Epic 19 / Story 19.4 UAT; does **not** create a new epic.  
**Status:** partial implementation + **owner decision required** before live billing.

## Product truth (revalidated)

- **FR-23** is unpaid-invoice delinquency (`payment_failed` → PastDue → OnHold → archive). It is **not** a refund or dispute spec.
- PRD post-MVP / thin policy: “Simple refund / cancel policy (documented + Stripe refunds)” — keep policy thin; festival-grade refunds are out of the one-stop definition.
- Complimentary tenants (`IsComplimentary`): no FR-23.

No ratified product rule says “merchant refund immediately revokes Core/Pro entitlements.” Auto-revoke is therefore **not** implemented.

## Implemented in this remediation (sandbox-safe)

| Paddle event | Action / status | Cohestra behavior |
|--------------|-----------------|-------------------|
| `adjustment.created` / `adjustment.updated` | any, tenant unresolved | HTTP **503**, no ledger row (Paddle retries) |
| same | tenant `IsComplimentary` | ingest, **no** billing-status change |
| same | status ≠ `approved` | ingest, no entitlement change |
| same | `action=chargeback` + `approved` | `ApplyInvoicePaymentFailed` (PastDue + delinquency clock) — FR-23 analog for lost funds |
| same | `action=refund` + `approved` | ingest + warning log; **plan / BillingStatus unchanged** |
| same | other actions (credit, etc.) | ingest only |

Webhook failures that cannot complete (missing tenant, Paddle API fetch failed, invalid handler payload) no longer ACK **200**. Retryable → **503**; invalid JSON / missing event id → **400**; duplicates / ignored types → **200**.

## Escalated — owner must decide before live cutover

These are **business-policy** decisions. Engineering will not invent them.

1. **Merchant refund vs entitlement**  
   After an approved `refund`, should Cohestra immediately drop to Basic/Free, keep the paid plan until `subscription.canceled`, or start FR-23 PastDue?
2. **Partial refunds**  
   Paddle adjustments can be partial. Full vs partial: revoke, ignore, or pro-rate (no pro-rate engine exists)?
3. **Chargeback lifecycle**  
   Today only `approved` chargebacks enter PastDue. What about `pending_approval`, `rejected`, or later `reversed`? Should a won dispute restore Active?
4. **Operator refunds in Paddle dashboard** vs in-app  
   There is no Cohestra refund API. Confirm dashboard-only is acceptable for MVP.
5. **Customer-visible copy**  
   Billing UI does not explain refund/dispute state. Required for UAT/live?

Until (1)–(3) are decided in writing, Story 19.4 sandbox UAT should still verify **ingest + logs + chargeback→PastDue**, not entitlement revoke on refund.

## Residual (recorded 2026-10-08, PR #404 review)

**Cross-event chargeback vs recovery:** `paddle_adjustment_cursors` orders **adjustment** notifications only. A delayed approved `chargeback` with a **new** `event_id` that arrives after a later `transaction.completed` / `subscription.updated` (Active restore) can still re-enter PastDue. Same-`event_id` Paddle retries stay idempotent (200 duplicate). Do not invent auto-restore on `rejected`/`reversed`. Owner item (3) must cover this before live cutover. Story 19.4 sandbox should include: chargeback → PastDue, then successful payment, then confirm whether a delayed chargeback replay (new event id) is in-scope to ignore.

## Explicitly out of scope

- Live Paddle activation, live catalog, charging real customers.
- New stories duplicating 19.4 or Epic 29 (29.3 remains done; this is a defect fix on that spine).
