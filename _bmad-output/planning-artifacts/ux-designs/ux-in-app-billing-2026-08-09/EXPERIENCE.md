---
title: In-app billing UX
status: final
created: 2026-08-09
updated: 2026-08-09
---

# EXPERIENCE — In-app billing

## Information Architecture

`/settings/billing` sections (paid tenants):

1. **Plan summary** — plan, status, trial end, scheduled cancellation
2. **Payment method** — card on file or add CTA
3. **Billing information** — name, email, and mobile (country first → auto prefix → local number)
4. **Invoice history** — list with PDF download
5. **Plan management** — change plan (checkout), cancel / resume subscription

Basic tenants: existing upgrade panel unchanged.

## Key flow — Priya adds a card

1. Priya opens Settings → Billing on `load-pro-alpha`.
2. She clicks **Add payment method**; modal opens with Stripe Payment Element.
3. She enters card; Cohestra confirms SetupIntent server-side and sets default PM.
4. Modal closes; card shows as "Visa ending in 4242" without leaving the app.

## Voice and tone

- Reassure: "Card details are processed securely by Stripe."
- Avoid mentioning "portal" or external billing site.

## Accessibility

- Modal: `role="dialog"`, labelled title, focus trap via browser default on form controls.
- Invoice PDF links open in new tab with `rel="noreferrer"`.
