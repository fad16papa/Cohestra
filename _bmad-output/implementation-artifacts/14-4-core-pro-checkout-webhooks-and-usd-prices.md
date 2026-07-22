---
baseline_commit: b124a08ac3cfb2838321ac943a84cf78cf64ea00
---

# Story 14.4: Core/Pro Checkout, webhooks, and USD Prices

Status: review

## Story

As a **Tenant Admin**,
I want to **start a Core/Pro trial via Stripe Checkout (direct or upgrade from Basic)**,
So that **paid plan limits unlock without a custom billing UI**.

## Acceptance Criteria

1. **Given** Stripe Prices for Core/Pro × monthly/annual in USD only  
   **When** Checkout runs  
   **Then** `currency: usd`, `mode: subscription`, `trial_period_days: 30`, card required  
   **And** Basic has no Stripe Price/product

2. **Given** direct signup `/signup?plan=core|pro` or in-app upgrade from Basic  
   **When** Checkout completes successfully  
   **Then** Tenant stores `StripeCustomerId`, `StripeSubscriptionId`, synced `Plan`, `BillingStatus=Trialing` (or Active if post-trial), `BillingInterval`, `TrialEndsAt`  
   **And** upgrade from Basic lifts plan limits when subscription becomes Trialing/Active

3. **Given** trial disclaimer UX  
   **When** Checkout is shown  
   **Then** copy includes: not charged while trial active; billing starts on `{trial_end_date}` unless canceled

4. **Given** webhooks (`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid`, `invoice.payment_failed`)  
   **When** events arrive  
   **Then** handlers are idempotent on `event.id` and sync Tenant billing fields  
   **And** test keys are used in local/CI; live keys only in production

5. **Given** one-trial-per-tenant product rule  
   **When** a tenant already completed a trial  
   **Then** upgrade path does not grant a second free trial

## Tasks / Subtasks

- [x] Task 1: Stripe settings + Checkout session API (AC: 1, 2, 5)
  - [x] 1.1 Pin Stripe.NET; `StripeSettings` + price ID config
  - [x] 1.2 `IBillingService` / `StripeBillingService` — create Checkout session (USD subscription, trial when eligible)
  - [x] 1.3 Replace `BillingController` stub — GET summary, POST checkout (TenantAdminOnly)

- [x] Task 2: Webhooks + tenant sync (AC: 2, 4)
  - [x] 2.1 `StripeWebhookEvent` table for idempotent `event.id`
  - [x] 2.2 `StripeWebhookController` at `/api/v1/system/stripe/webhook`
  - [x] 2.3 Handlers for required event types; sync Plan/BillingStatus/Interval/TrialEndsAt/Stripe IDs
  - [x] 2.4 `HasConsumedTrial` on Tenant — one-trial-per-tenant

- [x] Task 3: Web signup + upgrade UX (AC: 2, 3)
  - [x] 3.1 Pass `plan` + `interval` through signup → verify → tenant checkout page
  - [x] 3.2 Trial disclaimer on signup/checkout surfaces
  - [x] 3.3 Auth handoff to tenant subdomain for post-verify checkout

- [x] Task 4: Tests + verify
  - [x] 4.1 `StripeTenantBillingSyncTests`
  - [x] 4.2 Webhook processor tests (fixture payloads)
  - [x] 4.3 `dotnet build` + `npm run build`

## Dev Agent Record

### Agent Model Used

Cursor Composer (cloud agent)

### Completion Notes List

- Pinned Stripe.NET 48.2.0; `StripeSettings` with price IDs and trial days in appsettings + docker-compose.
- `StripeBillingService` creates Checkout sessions (subscription mode, optional 30-day trial when `HasConsumedTrial=false`).
- `StripeWebhookProcessor` idempotent on `event.id`; syncs tenant billing on all required webhook types.
- Web: `/signup?plan=` → verify → tenant `/billing/checkout` with auth handoff hash; trial disclaimer copy.
- Admin upgrade: `POST /api/v1/admin/billing/checkout` from tenant subdomain (TenantAdminOnly).

### File List

- `src/Application/Billing/IBillingService.cs`
- `src/Contracts/Billing/BillingContracts.cs`
- `src/Domain/Billing/StripeWebhookEvent.cs`
- `src/Domain/Tenants/Tenant.cs`
- `src/Infrastructure/Billing/*`
- `src/Infrastructure/Persistence/Migrations/*AddStripeBilling*`
- `src/Infrastructure/Persistence/Configurations/*`
- `src/Api/Controllers/V1/BillingController.cs`
- `src/Api/Controllers/V1/StripeWebhookController.cs`
- `src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Infrastructure/Infrastructure.csproj`
- `src/Api/appsettings.json`
- `docker-compose.yml`
- `.env.example`
- `src/Infrastructure.Tests/Billing/*`
- `web/lib/billing/billing-api.ts`
- `web/lib/auth-handoff.ts`
- `web/components/billing/checkout-page-content.tsx`
- `web/app/(admin)/billing/checkout/page.tsx`
- `web/components/legal/signup-page-content.tsx`
- `web/components/legal/signup-verify-page-content.tsx`
- `_bmad-output/implementation-artifacts/14-4-core-pro-checkout-webhooks-and-usd-prices.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-22: DS 14.4 — Stripe Checkout, webhooks, signup plan flow; status → review.

## Ultimate context engineering tip

Story 14.4 = **Stripe Checkout for Core/Pro trials + idempotent webhooks syncing Tenant billing fields** — settings/price IDs first, then admin checkout API, webhook processor, wire `/signup?plan=` into post-verify checkout. Customer Portal is Story 14.7.

### Story completion status

review — DS complete; ready for CR.
