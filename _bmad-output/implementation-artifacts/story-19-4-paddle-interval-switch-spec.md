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
- Past due, scheduled change/cancel, and multi-item or quantity ≠ 1: reject without calling update.
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
- Given past due, scheduled change, scheduled cancel, or extra items, when checkout is posted, then the API returns an actionable 400 and does not PATCH the subscription.
- Given Paddle 400/409/429/5xx, when the update fails, then entitlements stay unchanged and the user message contains no provider internals.
- Given checkout `?interval=monthly` while the owner selects yearly, then the URL, banner, and POST body stay on annual.
