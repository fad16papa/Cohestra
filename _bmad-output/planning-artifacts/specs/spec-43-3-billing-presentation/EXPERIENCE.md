---
id: experience-43-3-billing-presentation
status: ready
created: 2026-10-07
---

# EXPERIENCE — Story 43.3 Billing

## Foundation

43.1 Settings chrome. Shell BillingBannerBar remains the ambient warning. The Billing page supplies detail and action, not a second identical banner.

## Hierarchy

1. h1 Billing
2. Plan + humanized status
3. Attention / next action (only when needed)
4. Plan/payment management
5. Secondary contact/invoices

## Copy

- Incomplete: “Checkout has not activated a paid plan yet. Resume checkout or refresh billing status.”
- Sandbox extras only when Paddle environment is sandbox.
- Paddle-return error: no localhost developer URL.
- Complimentary: “This workspace is on a complimentary plan. Checkout is not used.”

## 390

Stack plan/status and actions. Wrap owner email. min-h-11 on Refresh, portal, resume/cancel.

## Accessibility

One main, one h1. Trialing `role=status`. Past due / OnHold `role=alert`. Scheduled change `role=status`. Not color-only.
