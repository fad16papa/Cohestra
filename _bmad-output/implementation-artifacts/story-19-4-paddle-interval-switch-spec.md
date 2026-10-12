---
status: in-review
story: 19.4
title: Fix Paddle subscription interval switch
---

# Story 19.4 defect — Paddle subscription interval switch

## Intent

UAT `POST /api/v1/admin/billing/checkout` for an existing Pro monthly subscription switched to annual returns HTTP 400 `Checkout unavailable` / `Could not update your subscription`. This is not the return-URL defect. Immediate item updates hard-coded `proration_billing_mode=prorated_next_billing_period`, which Paddle forbids for billing-frequency changes and for trials.

## Scope

- Choose Paddle `effective_from` and `proration_billing_mode` from live subscription status and plan/interval transition.
- Trialing monthly → annual (Core and Pro): `immediately` + `do_not_bill`; preserve trial.
- Active monthly → annual (Core and Pro): `immediately` + `prorated_immediately` with honest “starts now / credit / next renewal in one year” copy and confirmation.
- Active same-frequency Core → Pro: keep `prorated_next_billing_period`.
- Annual → monthly: keep deferred `next_billing_period` + `do_not_bill`.
- Past due, paused/canceled, non-cancel scheduled changes, and multi-item or quantity ≠ 1: reject on both immediate and deferred paths before any Paddle mutation.
- Immediate + pending cancellation: reject; user must resume first.
- Deferred + pending cancellation on an otherwise safe single-item subscription: authorized billing-b2 behavior — clear cancel, then schedule the downgrade. The two Paddle calls are not atomic. Period end is captured before clear. If schedule fails after clear, local state is reconciled to “not canceling” and retry completes the schedule. Checkout must disclose and confirm that cancellation will be removed.
- Same plan + interval: no-op.
- Provider 400/409/429/5xx: safe user message, no entitlement change, no leaked Paddle detail.
- Keep billing-owner auth, tenant isolation, and #439 return-URL allow-list.
- Sync checkout `plan` / `interval` query with selected UI state.

## Out of scope

- Merge or UAT deploy without owner authorization
- Live Paddle charges or production credentials
- Recreating nginx, certificates, timers, or merging #437 / #438
- Closing Story 19.4 before sandbox lifecycle verification

## Acceptance (Given / When / Then)

- Given a trialing Pro or Core monthly subscription, when the owner switches to annual, then Paddle is called with `do_not_bill` and the trial remains.
- Given an active Pro or Core monthly subscription, when the owner switches to annual, then Paddle is called with `prorated_immediately` and the UI states that yearly billing starts now with credit.
- Given an active Core monthly subscription, when the owner switches to Pro monthly, then Paddle is called with `prorated_next_billing_period`.
- Given an active annual subscription, when the owner switches to monthly, then the change is deferred to period end.
- Given past due, paused/canceled, a non-cancel scheduled change, or extra items, when checkout is posted for an immediate or deferred change, then the API returns an actionable 400 and does not PATCH, clear a cancellation, or change entitlements.
- Given an immediate upgrade while cancellation is pending, then the API rejects without mutation.
- Given a deferred annual→monthly (or paid downgrade) on a safe single-item subscription with cancel-at-period-end, then checkout discloses that cancellation will be removed, the user confirms, cancel is cleared, and the downgrade is scheduled (billing-b2).
- Given clear-cancel succeeds and the schedule PATCH fails, then entitlements stay on the current plan, local cancel artifacts are cleared to match Paddle, the user is told to retry, and a second attempt finishes the schedule.
- Given Paddle 400/409/429/5xx, when the update fails, then entitlements stay unchanged and the user message contains no provider internals.
- Given checkout `?interval=monthly` while the owner selects yearly, then the URL, banner, and POST body stay on annual.
