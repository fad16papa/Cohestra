# Cohestra Enterprise PRD — Addendum

Technical mechanism decisions referenced by the PRD. Architecture workflow (`bmad-architecture`) may supersede or ratify these.

## Product boundary

| Product | Repository | Tenancy | Status |
|---------|------------|---------|--------|
| **Cohestra Enterprise** | `fad16papa/Cohestra` | Multi-tenant SaaS | This PRD |
| **lead-generation-crm** | Separate repo | Single operator | Unchanged |

## Tenancy model (proposed — ratify in architecture)

**Selected for v1:** Shared PostgreSQL database, shared schema, `TenantId` column on all business tables.

**Rejected for v1:**
- Schema-per-tenant — operational overhead too high for initial scale
- Database-per-tenant — same
- Row-level security only without app filters — defense in depth requires EF global filters + middleware

## Tenant resolution

**Production:** `{tenant-slug}.cohestra.app` → nginx → web/API with `Host` header resolution.

**Local development options:**
1. `/etc/hosts` entries: `ikigai.localhost`, `tgh.localhost`
2. Env override: `DEV_TENANT_SLUG=ikigai` when using plain `localhost`
3. Document in README when architecture locks choice

## Identity model (proposed)

Extend ASP.NET Identity:
- `ApplicationUser` (global identity)
- `TenantMembership` (UserId, TenantId, Role)
- JWT claims: `sub`, `tenant_id`, `role`, optional `platform_admin`

Remove: `AuthService` single-operator gate (`GetExistingOperatorAsync` block).

## Migration strategy (brownfield)

1. Add `Tenants` table + seed `default` tenant for dev
2. Add nullable `TenantId` to core tables
3. Backfill all rows → `default` tenant
4. Set `TenantId` non-nullable
5. Add composite unique indexes (e.g., `(TenantId, Slug)` on Activities)
6. Enable EF global query filters

Platform 0 Docker project name: `cohestra-infra` (local).

## SendGrid (ratified)

**PRD default:** Shared platform key with per-tenant verified sender identity (From email/name per tenant).

## Epic mapping (from CC proposal)

| Epic | PRD sections |
|------|----------------|
| 11 Tenant foundation | FR-1–3, FR-8 |
| 12 Identity & RBAC | FR-4–7 |
| 13 API scoping | FR-9–10 |
| 14 Onboarding + billing | FR-1, FR-6, FR-19–23, UJ-1–2 |
| 15 Public surfaces | FR-11–13, FR-14 |

## Cloud development workflow

No droplet deployment required for enterprise v1 development. Build via Cursor Cloud Agents; verify with `dotnet test` and `docker compose` in agent VM or developer machine.

## Billing & Stripe (ratified 2026-07-16, updated 2026-07-16)

### Stripe environments

| Environment | Stripe mode | Keys |
|-------------|-------------|------|
| Local dev | **Test mode (sandbox)** | `sk_test_…` / `pk_test_…` in `.env` |
| CI / integration tests | **Test mode** | Stripe CLI or test webhook fixtures |
| Staging / UAT | **Test mode** | Separate Stripe test account recommended |
| Production | **Live mode** | `sk_live_…` / `pk_live_…` in secrets only |

Use [Stripe test cards](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`) for dev. No real charges in test mode.

### Currency

**USD only.** All Stripe Prices use `currency: usd`. No geo-based currency conversion or multi-currency Prices in v1.

### Subscription flow

1. Open self-serve signup → **Basic: free**, no Stripe · **Core/Pro:** Stripe Checkout, monthly or annual, 30-day trial
2. Stripe Checkout: `mode: subscription`, `trial_period_days: 30`, payment method required, USD
3. Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Map to `Tenant.Plan`, `Tenant.BillingStatus`, `Tenant.BillingInterval`, `Tenant.TrialEndsAt`
5. Customer Portal link for upgrade / cancel / payment method / interval change

### Intro USD Prices (Stripe dashboard)

| Plan | Monthly | Annual (2 mo free) | Stripe |
|------|---------|-------------------|--------|
| Basic | **Free** | — | No Stripe product |
| Core | $29 | $290 | Checkout + webhooks |
| Pro | $79 | $790 | Checkout + webhooks |

Annual discount subject to pricing study (§13.9).

### Trial reminders (FR-21)

- Background job (daily): tenants `Trialing` with `TrialEndsAt` within 7 days
- Daily email + in-app notification to all Tenant Admins until trial ends

### Delinquency jobs (FR-23)

| Job | Schedule | Action |
|-----|----------|--------|
| `PastDueNotifier` | Daily | Week 5 (`PastDue`): daily email + in-app |
| `OnHoldNotifier` | Weekly | Weeks 6–8 (`OnHold`): weekly email + in-app; enforce read-only |
| `DelinquencyEnforcer` | Daily | Transition `PastDue` → `OnHold` at week 5 end; `OnHold` → `Deleted` after week 8 |

Week boundaries computed from `TrialEndsAt` (trial start ≈ `TrialEndsAt - 30 days`).

### Config

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_CORE_MONTHLY=price_…
STRIPE_PRICE_CORE_ANNUAL=price_…
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_ANNUAL=price_…
```
