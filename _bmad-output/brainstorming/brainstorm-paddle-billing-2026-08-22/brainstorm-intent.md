# Brainstorm intent — Paddle billing swap (preserve process)

**Date:** 2026-08-22  
**Stance:** Ideate for me (analysis → stories)  
**Goal:** Replace Stripe with Paddle without changing Cohestra billing/payment process. Hold Epic 19 until this ships. No implementation in this session.

## Chosen direction

Epic **29** is a **merchant adapter replacement** of Epic 14.4–14.8 plus the later in-app billing panel. It is not a new billing product.

- **Keep:** dual dials (`Plan` + `BillingStatus`), complimentary exemption, one-trial rule, 30-day card-required trial, USD Core/Pro prices, checkout → return → sync, Settings → Billing panel, portal, period-end cancel/downgrade/resume, scheduled plan change, delinquency jobs, banners, seat/limit gates, `/api/v1/admin/billing/*` routes, `TenantAdminOnly`.
- **Change:** every Stripe-named adapter (SDK, env, IDs, webhooks, hosted collector, copy).
- **Hold:** Epic 19 (including 19.4 Stripe UAT). Rewrite 19.4 to Paddle UAT after 29.7.

## Critical discoveries

1. `IBillingService` already exists, but DTOs, controller, and UI leak Stripe (`StripeConfigured`, `SyncFromStripe`, SetupIntent, `@stripe/*`).
2. There are **no live Stripe customers** — tenant Stripe columns can be replaced, not dual-written.
3. The only journey that cannot be a 1:1 API clone is **in-app card collect** (Stripe SetupIntent + Elements). Preserve the **same button and screen**; swap the hosted collector to Paddle.js overlay or Paddle update-payment-method URL.
4. Checkout can stay a **redirect**: Paddle transaction checkout URL maps to today's `CheckoutUrl`.
5. Jobs (`BillingJobsHostedService`) are already merchant-agnostic except where they call `StripeTenantBillingSync`. Keep job cadence and state machine; retarget the sync helper.

## Downstream

- Epic + stories: `_bmad-output/planning-artifacts/epic-29-paddle-billing.md`
- Sprint hold: `sprint-status.yaml` + change proposal
- Next: `bmad-create-story` for **29.1** when Admin is ready to implement
