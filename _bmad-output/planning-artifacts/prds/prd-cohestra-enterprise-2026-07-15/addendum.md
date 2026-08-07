# Cohestra Enterprise PRD — Addendum

Technical mechanism decisions referenced by the PRD. Canonical architecture decisions live in `architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` (status: **final**).

## Product boundary

| Product | Repository | Tenancy | Status |
|---------|------------|---------|--------|
| **Cohestra Enterprise** | `fad16papa/Cohestra` | Multi-tenant SaaS | This PRD |
| **lead-generation-crm** | Separate repo | Single operator | Unchanged |

## Tenancy model (ratified — AD-1)

**Selected for v1:** Shared PostgreSQL database, shared schema, `TenantId` column on all business tables.

**Rejected for v1:**
- Schema-per-tenant — operational overhead too high for initial scale
- Database-per-tenant — same
- Row-level security only without app filters — defense in depth requires EF global filters + middleware

## Tenant resolution

**Production:** `{tenant-slug}.cohestra.app` → nginx → web/API with `Host` header resolution.

**Local development options:**
1. `/etc/hosts` entries: `ikigai.localhost`, `tgh.localhost` — preferred for tenant-scoped testing
2. Env override: `DEV_TENANT_SLUG=ikigai` when using plain `localhost` (optional; **not** set in default Docker web container — bare `localhost` serves marketing apex)
3. Document in README (spine AD-4 / local-dev convention)

## Identity model (ratified — AD-7)

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
| 14 Onboarding + billing | FR-1, FR-6, FR-19–24, UJ-1–2 |
| 15 Public surfaces | FR-11–13, FR-14 |
| 22 Plan limit enforcement | FR-27 |
| 23 Dashboard operator UX | FR-15 (UI extension) |
| 28 Transactional outbox | FR-28 |

## Dashboard metrics API (shipped 2026-08-07 — FR-15)

**Endpoint:** `GET /api/v1/admin/dashboard/metrics`

**Extended response fields (tenant-scoped):**
- `registrationsTrend` — `{ date, count }[]` for last `trendDays` (default 30)
- `registrationsInPeriod` / `registrationsInPreviousPeriod` — WoW delta inputs
- `leadStatusBreakdown` — `{ new, contacted, active, inactive }`
- Existing: KPI counts, `activityPerformance`, `followUpCoveragePercent`, `periodDays`, `computedAt`

**Web:** Three views (Overview / Graphs / Tables) on `/dashboard`; view choice persisted in `localStorage`. Recharts for trend area, activity bar, lead pipeline donut (stacked layout in Graphs). 60s poll interval.

## Plan limit enforcement (shipped 2026-08-07 — FR-27)

**Backend:** `TenantPlanLimitValidator` — shared `used >= limit` checks for communities, publish, monthly registrations. Called from `ActivityService`, `CommunityService`, `RegistrationService`. `TenantAccessService` applies `ReadOnly_OverLimit` after downgrade (FR-24).

**Frontend:** `PlanLimitAlert` on activities list, create activity, publish controls, communities page. `plan-limit-utils.ts` mirrors sidebar LimitMeter math.

**Seat exception:** Invites block when **over** seat cap, not at exact cap.

## Transactional outbox (shipped 2026-08 — FR-28)

**Pattern:** `IOutboxPublisher` writes `OutboxMessages` in the same EF transaction as business mutations. Background worker claims with lease, dispatches via typed handlers.

**Message types:** `RegistrationConfirmation`, `BillingNotification`, `CampaignRecipient`.

**Campaigns:** Send API returns 202 + poll; completion when outbox item dispatched.

**Idempotency:** Dedupe index on `(TenantId, MessageType, IdempotencyKey)` prevents double-send.

## Cloud development workflow

No droplet deployment required for enterprise v1 development. Build via Cursor Cloud Agents; verify with `dotnet test` and `docker compose` in agent VM or developer machine.

## Billing & Stripe (ratified 2026-07-16, updated 2026-07-18)

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
5. Customer Portal link for upgrade / payment method / interval change; **cancel and downgrade at `current_period_end`** (FR-24)

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

### Delinquency jobs (FR-23 — P3 Option A)

Clock starts at `DelinquencyStartedAt` = time of `invoice.payment_failed` (trial end or renewal).

| Job | Schedule | Action |
|-----|----------|--------|
| `PastDueNotifier` | Daily | Days 1–7 (`PastDue`): daily email + in-app |
| `OnHoldNotifier` | Weekly | Days 8–28 (`OnHold`): weekly email + in-app; enforce read-only |
| `DelinquencyEnforcer` | Daily | Day 8: `PastDue` → `OnHold`; Day 29: archive tenant (`Tenant.Status=Archived`) |

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
