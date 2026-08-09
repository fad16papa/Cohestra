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
1. `/etc/hosts` entries: `ikigai.localhost`, `tgh.localhost`
2. Env override: `DEV_TENANT_SLUG=ikigai` when using plain `localhost`
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

## Client CRM & lead queue (FR-29–32 — Epic 23)

### Relationship to Platform 0 PRD

Inherited behavior remains authoritative for domain rules: master profile (FR-5), dedup (FR-6), relationship timeline (FR-7), WhatsApp/Viber click-to-message (FR-14/15 in Platform 0 numbering). Enterprise PRD **§4.8** adds **operator UX and Pro handoff** — not new dedup rules.

### FR-27 (shipped 2026-08-08)

- Column: `Tenants.RegistrationTimeZoneId` (varchar 64, IANA, default `UTC`)
- Helper: `RegistrationPeriod.ForTenant(now, timeZoneId)` for calendar-month boundaries
- Signup: optional browser timezone hint on `PublicSignupRequest`
- Settings: Tenant Admin PATCH `/api/v1/admin/tenant/registration-timezone`
- Shell/limit meter displays timezone label on registration dial

### List API extensions (FR-29)

Extend `GET /api/v1/clients` response items with:

| Field | Source |
|-------|--------|
| `phone` | Master profile (masked optional in list — show full to authenticated operator) |
| `lastOutreachAt` | Max occurred-at of timeline events: `whatsapp_*`, `viber_*`, `email_campaign_sent` |
| `lastOutreachLabel` | Human label for tooltip |
| `referralSource` | Master profile |
| `nextFollowUpAt` | FR-32 — nullable date |

Existing query params already wired in web: `mergeSuspect`, `createdWithinDays`, `registeredWithinDays`, `leadStatus`, `nationality`, `search`. FR-29 adds UI exposure + `referralSource` filter param + `followUpDue` boolean filter.

### Profile layout (FR-30)

No API change required — presentation reorder in `web/components/clients/*`. Timeline preview = first N events from existing `timeline` array.

### Campaign handoff (FR-31)

- `POST /api/v1/campaigns/draft/from-clients` with `{ clientIds: uuid[] }` → draft campaign + segment
- Reuse consent filter server-side; 403 on Basic/Core with upgrade code

### Follow-up date (FR-32)

- Column: `Clients.NextFollowUpAt` (date, nullable)
- PATCH on client update endpoint
- Timeline event on change

### UX companion

Run `bmad-ux` update for `EXPERIENCE.md` §Clients — UJ-5 journey, queue/table column spec, mobile card layout, sticky outreach bar.

### Out of scope (explicit)

- Deal stages / kanban pipeline
- Lead scoring
- Per-client assignment (defer until multi-seat workflows mature)
- One-click duplicate merge (remain flag-only unless promoted)
- Automated messenger sends

## Basic tier usage limits revision (2026-08-09)

**Change:** Basic published activities **3 → 4**; registrations/month **150 → 250**.

**Trigger:** Pricing competitive review + tier-limits brainstorm (activation-first path). Marketing landing updated; code enforced in `TenantPlanLimits.cs` (merged PR #150).

**Rationale:**
- Event-heavy ICP (Built for **Events** first) often runs weekly series + one-offs — 150 regs/mo and 3 activities caused early blocks before CRM/follow-up aha.
- 250 regs remains **half of Core** (500) — upgrade path preserved.
- Core/Pro limits unchanged; pricing ($29 / $79) unchanged.

**Deferred (not in this change):**
- Graceful public page at 100% reg cap (waitlist / contact organizer)
- Stronger 80% limit upgrade messaging in admin shell
- Pricing page competitive positioning copy (“priced on registrations, not database size”)
