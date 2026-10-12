# Investigation: Story 19.4 Paddle-hosted / provider-verified plan change

## Hand-off Brief

1. **What happened.** Owner confirmed Pro Monthly → Pro Yearly, then expected a Paddle-backed review before the charge. Cohestra PATCH'd the existing subscription in-app and returned to Billing.
2. **Where the case stands.** Concluded. Direct in-app update is Confirmed as intentional. Ordinary Checkout is Unsafe for this matrix (creates a new subscription). Customer Portal cannot switch catalog plans. Official same-subscription path is `PATCH /subscriptions/{id}/preview` then `PATCH /subscriptions/{id}`.
3. **What's needed next.** Owner review of the recommended preview-then-PATCH flow. Do not implement until authorized. No sandbox mutation.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 19.4 product correction — Paddle-verified plan change |
| Date opened | 2026-10-12 |
| Status | Concluded |
| System | `origin/main` `7ef2b539`; UAT still `364fc5c6` (deploy not performed) |
| Evidence sources | Cohestra billing code, official Paddle docs, owner observation, UAT classify (sandbox, earlier session) |

## Problem Statement

Owner hypothesis: after "Switch to yearly now", Cohestra should show Paddle before committing the billing change. Do not create a second subscription.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `PaddleBillingService.CreateCheckoutSessionAsync` | Available | Routes existing paid/trialing/past-due Core/Pro to `UpgradeExistingSubscriptionAsync` |
| `UpgradeExistingSubscriptionAsync` | Available | `UpdateSubscriptionItemsAsync` then `CompletedInApp: true` |
| Frontend `completedInApp` | Available | Redirects internally; does not open Paddle Checkout |
| Confirmation copy | Available | Generic "Paddle calculates the exact credit when you confirm" |
| `IPaddleApiClient` | Available | Has PATCH subscription, portal sessions, payment-method transaction. **No preview method** |
| Paddle preview API | Available | `PATCH /subscriptions/{id}/preview` |
| Paddle Customer Portal | Available | Deep links: view, cancel, update payment method only |
| Paddle Checkout | Available | `items` checkout creates a **new** subscription |
| Live sandbox mutation | Missing | Forbidden this run |

## Confirmed Findings

### Finding 1: Direct in-app PATCH is the current paid-change path

**Evidence:** `src/Infrastructure/Billing/PaddleBillingService.cs:91-93,458-565`; `web/components/billing/checkout-page-content.tsx:281-283`

**Detail:** `CanUpgradeExistingSubscription` is true when `PaddleSubscriptionId` is set and plan is Core/Pro and status is Trialing/Active/PastDue. That path never opens Checkout. It PATCH's items on the **same** subscription id and returns `CompletedInApp: true`. Frontend then `window.location.href = checkout.result.checkoutUrl` (in-app success URL).

### Finding 2: Confirmation happens before any Paddle number is shown

**Evidence:** `web/lib/billing/checkout-validation.ts:229-253`; `checkout-page-content.tsx:873-891`

**Detail:** Active monthly→annual shows "Yearly billing starts now… Paddle calculates the exact credit when you confirm." Confirm button calls `startCheckout` which immediately mutates. No preview API call exists.

### Finding 3: Ordinary Checkout creates a new subscription

**Evidence:** Paddle overlay checkout journey (`developer.paddle.com/concepts/sell/overlay-checkout`): completing checkout with `items` creates a subscription. Paddle customers may have **multiple** subscriptions. Cohestra stores a single `Tenant.PaddleSubscriptionId`.

**Detail:** Opening Checkout with `items: [{ price_id: Pro Yearly }]` for an existing customer would emit `subscription.created` for a **second** subscription. That is duplicate entitlement risk. Option C is **rejected**.

Checkout **is** correct for: Basic → Core/Pro, new paid subscription, payment-method-required first purchase. Also used for payment-method update via `update-payment-method-transaction` (zero-value txn on the **same** subscription — not a plan change).

### Finding 4: Customer Portal cannot perform the required plan matrix

**Evidence:** `developer.paddle.com/build/customers/integrate-customer-portal` — portal session deep links are only `view_subscription`, `cancel_subscription`, `update_subscription_payment_method`.

**Detail:** Plan replacement is documented as API (`PATCH` items) or **seller** dashboard, not customer-portal hosted plan switch. Portal cannot be the Pro Monthly → Pro Yearly or Core Monthly → Pro Monthly vehicle. Cohestra already uses portal for Manage payment / invoices. Keep that. Do not force portal for catalog switches.

### Finding 5: Paddle subscription update preview is the official pre-commit API

**Evidence:** `PATCH /subscriptions/{subscription_id}/preview` — previews without applying. Response includes `immediate_transaction`, `next_transaction`, `recurring_transaction_details`, `update_summary` (credit, charge, result), `next_billed_at`, `currency_code`. "You don't need to do any of your own calculations." Cannot preview `past_due` except clearing `scheduled_change`.

**Detail:** Official upgrade/downgrade guide: GET subscription → PATCH preview → PATCH apply with the same body. Frequency changes allow `prorated_immediately`, `full_immediately`, `do_not_bill` only — matching Cohestra's `#440` policy.

### Finding 6: Cohestra has no preview client method

**Evidence:** `src/Infrastructure/Billing/IPaddleApiClient.cs` — `UpdateSubscriptionItemsAsync` PATCHes `/subscriptions/{id}` only.

## Deduced Conclusions

### Deduction 1: Owner "see Paddle" need is provider-calculated review, not Checkout chrome

The official Paddle-backed review for an **existing** subscription is the preview payload, not overlay Checkout. Overlay Checkout is for new transactions/subscriptions. Showing Paddle-calculated credit/due-now/next renewal in Cohestra **before** PATCH satisfies trust without a duplicate subscription.

### Deduction 2: Immediate collection still happens on Paddle after confirm

`prorated_immediately` on automatic collection creates a Paddle transaction and charges the saved payment method. That **is** Paddle payment. The missing piece is showing `update_summary` / `immediate_transaction.totals` **before** that PATCH.

## Hypothesized Paths

### Hypothesis 1: Current bypass is a bug

**Status:** Refuted — intentional `CanUpgradeExistingSubscription` + `CompletedInApp`.

### Hypothesis 2: Checkout can update the same subscription

**Status:** Refuted — Checkout + items creates a new subscription.

### Hypothesis 3: Customer Portal can switch Pro Monthly → Pro Yearly on the same subscription

**Status:** Refuted for the required matrix — no plan-change deep link / hosted catalog switch.

### Hypothesis 4: Preview + same-subscription PATCH is the supported architecture

**Status:** Confirmed from Paddle upgrade/downgrade guide + preview API.

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Trigger | Settings → Billing → Change plan → Pro Yearly → confirm "Switch to yearly now" |
| Condition | Existing `PaddleSubscriptionId`, Active, Core/Pro |
| Mutation | `UpdateSubscriptionItemsAsync` PATCH same id, `prorated_immediately` |
| UI | `completedInApp` → internal redirect |

## Case matrix (recommended action)

| Case | Action |
| ---- | ------ |
| Active Pro monthly → Pro annual | Preview + PATCH same sub (`prorated_immediately`) |
| Active Core monthly → Core annual | Same |
| Active Core monthly → Pro monthly | Preview + PATCH same sub (`prorated_immediately`) |
| Active Core monthly → Pro annual | Preview + PATCH same sub (`prorated_immediately`) |
| Active annual → monthly (same tier) | Deferred schedule (existing `#440`); preview of scheduled change if Paddle returns totals; else period-end copy without guessed money |
| Active Pro → Core (any interval) | Deferred schedule; do not immediate PATCH |
| Trialing monthly → annual | Preview (`do_not_bill`) then PATCH same sub; due now must be provider 0 / omitted if null |
| PastDue | Reject plan change; payment-method Checkout/portal (existing) |
| Scheduled cancellation | Existing two-step resume-then-change; then preview |
| Scheduled downgrade | Reject until undo |
| Missing payment method | Reject immediate charge; send to payment-method update (Checkout on **same** sub txn) |
| Basic → Core/Pro (new) | Ordinary Paddle Checkout (preserve) |

## Conclusion

**Confidence:** High

Recommended flow: **Option A** — Paddle subscription preview, Cohestra review UI with provider numbers only, then PATCH the same `PaddleSubscriptionId`. Reject Option C. Do not force Customer Portal for catalog switches. Preserve new-subscription Checkout. No live sandbox mutation this run.

## Recommended Next Steps

Owner reviews this design. Implementation is a later authorized story increment: preview API client, preview endpoint, two-phase UI, completion state from trusted Paddle transaction fields, webhook remains source of truth.
