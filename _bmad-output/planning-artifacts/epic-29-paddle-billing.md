---
title: Epic 29 — Paddle Billing Migration (Stripe Removal)
status: done
created: 2026-08-22
updated: 2026-08-23
source: brainstorm-paddle-billing-2026-08-22
constraint: Preserve Epic 14 + in-app billing process. Adapter swap only. No code in this planning change.
---

# Epic 29: Paddle Billing Migration (Stripe Removal)

Replace Stripe with **Paddle Billing** as Cohestra’s sole payment and subscription merchant. **Do not change** how billing and payments are designed for operators — same journeys, same dual dials, same jobs, same admin API routes. Only the merchant adapter, hosted collector, env, copy, and tests change.

**Why now:** Stripe is blocked for the PH-registered / SG-operated entity. Admin has a Paddle sandbox account. There is **no live Stripe revenue**, so IDs can be replaced rather than dual-written.

**FRs preserved:** FR-14 through FR-25 (checkout, trial, portal, period-end cancel/downgrade, delinquency, complimentary, one-trial). In-app billing panel (2026-08-09) stays.

**Not in scope:** New plan SKUs beyond Core/Pro, usage billing, multi-currency catalog, new Settings → Billing IA, dual-running Stripe + Paddle, Epic 19 droplet work.

**Launch list (2026-08-23):** Core **$14.99**/mo or **$152.92**/yr; Pro **$29.99**/mo or **$305.93**/yr; annual = **14.99% off** 12× monthly. Amounts live in PRD §13.3 — catalog must match.

**Hold:** Epic 19 (including 19.4 Stripe UAT) until 29.7 is signed off. Story 19.4 is rewritten to Paddle UAT in 29.6.

---

## Invariant — process that must not change

| Journey | Stays |
|---------|--------|
| Basic self-serve | No card. No Paddle product. |
| Core/Pro signup or in-app upgrade | Choose plan + monthly/annual → hosted checkout → 30-day trial, card required, USD → return to workspace → plan unlocks. |
| One trial | `HasConsumedTrial` — no second free trial. |
| Complimentary / Sponsored | No checkout, no portal, no delinquency. Merchant IDs left unchanged. |
| Settings → Billing | Summary, usage meters, contact, saved card last4, invoices, cancel / resume / scheduled change. |
| Manage billing | Hosted customer portal; return to Settings → Billing. |
| Cancel / downgrade | At **period end**. Current plan limits until then. Over-limit → `ReadOnly_OverLimit`, not Suspended. |
| Resume | Clears period-end cancel. |
| Cancel scheduled change | Restores current paid plan. |
| Delinquency | Days 1–7 `PastDue` (full access); day 8 `OnHold` (read-only); day 29 unpaid → Archived. |
| Trial reminders | Last 7 days: daily email + in-app. |
| Access | `TenantAdminOnly`; billing owner rules unchanged. |
| API | `/api/v1/admin/billing/*` verbs stay. Members never see billing CTAs. |

**Allowed adapter differences (not process changes):**

- Checkout URL is a Paddle transaction checkout (still a redirect `CheckoutUrl`).
- Card collect uses Paddle.js overlay or Paddle update-payment-method URL instead of Stripe Elements / SetupIntent. **Same button, same dialog entry.**
- Statement descriptor may show **Paddle**. Add one FAQ line; do not redesign checkout.
- Webhook events and merchant IDs are Paddle-shaped; tenant **state machine** is unchanged.

---

## Stripe surface inventory (must be gone after 29.6)

### Backend (replace)

| Area | Current | Target |
|------|---------|--------|
| Package | `Stripe.net` 48.2.0 | Paddle Billing REST (official SDK if suitable, else typed `HttpClient`) |
| Settings | `StripeSettings` / `Stripe__*` | `PaddleSettings` / `Paddle__*` |
| Service | `StripeBillingService` : `IBillingService` | `PaddleBillingService` : `IBillingService` |
| Sync | `StripeTenantBillingSync` | `PaddleTenantBillingSync` |
| Downgrade | `StripeSubscriptionDowngradeScheduler` | `PaddleSubscriptionDowngradeScheduler` |
| Webhook | `StripeWebhookController` `/api/v1/system/stripe/webhook` | `PaddleWebhookController` `/api/v1/system/paddle/webhook` |
| Ledger | `StripeWebhookEvent` | `PaddleWebhookEvent` (idempotent on event id) |
| Tenant | `StripeCustomerId`, `StripeSubscriptionId`, `StripeSubscriptionScheduleId` | `PaddleCustomerId`, `PaddleSubscriptionId`, `PaddleSubscriptionScheduleId` |
| Middleware | `IsStripeWebhookPath` | `IsPaddleWebhookPath` (same tenant-skip) |
| DI | `StripeSettings`, Stripe processor | Paddle equivalents only |
| Interface leak | `SyncFromStripeAsync` | `SyncFromProviderAsync` (or `SyncFromPaddleAsync`) |

### API / contracts (rename, same shape)

| Current | Target |
|---------|--------|
| `BillingSummaryDto.StripeConfigured` | `BillingConfigured` |
| `PublishableKey` | `ClientToken` (Paddle client-side token) |
| `SetupIntentDto` / `SetupIntentResponse` | Same process; payload is Paddle overlay/checkout token, not Stripe `clientSecret` |
| `ConfirmSetupIntentRequest.SetupIntentId` | Provider setup/transaction id |
| `SyncBillingRequest.CheckoutSessionId` | `TransactionId` (Paddle transaction id) |
| 503 copy “Stripe is not configured” | “Billing is not configured” |

### Frontend (same screens)

| Current | Target |
|---------|--------|
| `@stripe/stripe-js`, `@stripe/react-stripe-js` | Paddle.js (official) |
| `billing-payment-method-dialog.tsx` Elements | Paddle.js overlay or redirect to update-payment-method |
| `syncBillingFromStripeWithAuth` | `syncBillingWithAuth` |
| `stripeConfigured` | `billingConfigured` |
| Copy: “Stripe Checkout”, “Stripe Portal”, “Stripe Tax” | Paddle / generic “checkout” / “billing portal” |

### Config / docs

`.env.example`, `.env.uat.example`, `docker-compose.yml`, `docker-compose.uat.yml`, `appsettings.json`, `docs/deploy/production-droplet-setup.md`, `docs/deploy/enterprise-launch-checklist.md`, legal (`legal-content.ts`), pricing page, signup page, platform complimentary copy.

### Tests (rewrite, same ACs)

`StripeBillingCancelAtPeriodEndTests`, `StripeTenantBillingSyncTests`, `StripeTenantBillingSyncScheduleTests`, `StripeSubscriptionDowngradeSchedulerTests`, `StripeWebhookProcessorTests`, `PlatformTenantServiceTests` (ID fields).

### Do not rewrite (process owners)

`BillingJobsHostedService` cadence and thresholds; `Tenant` plan/status/billing enums; seat/limit gates; banners; complimentary flag behavior; Basic dormancy.

---

## Paddle catalog (sandbox first)

Create in Paddle sandbox **before or during 29.2**:

| Cohestra | Amount (USD) | Paddle |
|----------|--------------|--------|
| Core monthly | **$14.99** | Product `Cohestra Core` + recurring monthly price, 30-day trial |
| Core annual | **$152.92** (14.99% off 12×) | Same product, recurring yearly price, 30-day trial |
| Pro monthly | **$29.99** | Product `Cohestra Pro` + recurring monthly price, 30-day trial |
| Pro annual | **$305.93** (14.99% off 12×) | Same product, recurring yearly price, 30-day trial |
| Basic | Free | **No product** |

Store price IDs as `Paddle__PriceCoreMonthly` etc. (`pri_…`).

Pass `customData`: `{ tenant_id, tenant_slug }` on every checkout/transaction so webhooks can resolve the tenant.

---

## Event map (same tenant outcomes)

| Today (Stripe) | Paddle | Tenant outcome (unchanged) |
|----------------|--------|----------------------------|
| `checkout.session.completed` | `transaction.completed` + `subscription.created` | Store customer/subscription IDs; Plan + Trialing/Active |
| `customer.subscription.updated` | `subscription.updated` | Sync Plan, BillingStatus, interval, trial end, scheduled change |
| `customer.subscription.deleted` | `subscription.canceled` | Paid → Basic+Free (or documented cancel-at-period-end path) |
| `invoice.paid` | `transaction.completed` (renewal) | Clear PastDue/OnHold → Active |
| `invoice.payment_failed` | `transaction.payment_failed` | Start/continue delinquency (`DelinquencyStartedAt`) |

Idempotency: ledger unique on Paddle notification/event id. Failed handlers return non-2xx so Paddle retries. Verify `Paddle-Signature`.

---

## Story 29.1: Paddle provider spine (config, domain, DI)

As a **developer**,
I want **Paddle configuration, tenant merchant IDs, and webhook ledger wired with Stripe removed from DI**,
So that **later stories can implement checkout against one merchant without leftover Stripe settings**.

**Acceptance Criteria:**

**Given** application configuration  
**When** billing is configured  
**Then** `Paddle` section exists: `ApiKey`, `ClientToken`, `WebhookSecret`, `Environment` (`sandbox` \| `production`), four Core/Pro price IDs, `TrialPeriodDays` (default 30)  
**And** `IsConfigured` is true only when `ApiKey` is non-empty  
**And** no `Stripe` section, `StripeSettings`, or `Stripe__*` env bindings remain in the running app

**Given** `Tenant`  
**When** the migration runs  
**Then** `StripeCustomerId`, `StripeSubscriptionId`, `StripeSubscriptionScheduleId` are replaced by `PaddleCustomerId`, `PaddleSubscriptionId`, `PaddleSubscriptionScheduleId`  
**And** unique filtered indexes exist on the Paddle customer and subscription IDs  
**And** `stripe_webhook_events` is replaced by `paddle_webhook_events` (event id unique)

**Given** DI  
**When** the API starts  
**Then** `IBillingService` is `PaddleBillingService` (may still throw “not implemented” on money methods until 29.2–29.5)  
**And** `IPaddleWebhookProcessor` is registered  
**And** `Stripe.net` is not referenced

**Given** tenant resolution  
**When** `POST /api/v1/system/paddle/webhook` is called  
**Then** it is allowed without a tenant Host (same pattern as today’s Stripe webhook path)  
**And** `/api/v1/system/stripe/webhook` is gone

**Given** complimentary / platform copy  
**When** platform sets Sponsored  
**Then** comments and audit notes say Paddle IDs are left unchanged (behavior unchanged)

---

## Story 29.2: Core/Pro checkout and 30-day trial via Paddle

As a **Tenant Admin**,
I want **to start a Core/Pro trial via the same checkout journey we already designed**,
So that **paid limits unlock without a new billing UI — Paddle is just the collector**.

**Acceptance Criteria:**

**Given** Paddle prices for Core/Pro × monthly/annual in USD only  
**When** `POST /api/v1/admin/billing/checkout` runs  
**Then** the API returns `CheckoutUrl` (Paddle transaction checkout URL), trial disclaimer, `TrialIncluded` / `TrialEndsAt`  
**And** checkout is USD recurring, **30-day trial**, card required  
**And** Basic has no Paddle price  
**And** complimentary tenants cannot start checkout

**Given** `/signup?plan=core|pro` or in-app upgrade from Basic (existing screens)  
**When** checkout completes  
**Then** tenant stores `PaddleCustomerId`, `PaddleSubscriptionId`, synced `Plan`, `BillingStatus` Trialing (or Active if post-trial), `BillingInterval`, `TrialEndsAt`  
**And** upgrade from Basic lifts plan limits when Trialing/Active

**Given** trial disclaimer UX (existing checkout/signup copy, Stripe words removed)  
**When** checkout is shown  
**Then** copy still says: not charged while trial active; billing starts on `{trial_end_date}` unless canceled

**Given** one-trial-per-tenant  
**When** `HasConsumedTrial` is true  
**Then** checkout does not grant a second free trial

**Given** success/cancel URLs  
**When** checkout is created  
**Then** URLs stay on the current workspace host (existing allowlist)  
**And** success return still lands the existing billing-success / sync path (transaction id may replace `session_id` query param)

**Given** existing subscription upgrade path (saved card / in-app complete)  
**When** the tenant already has a Paddle customer and payment method  
**Then** the same “completed in app” vs redirect split is preserved — implement with Paddle subscription/transaction APIs, not a new screen

---

## Story 29.3: Paddle webhooks and tenant billing sync

As a **platform**,
I want **idempotent Paddle webhooks to drive the same tenant billing fields we already use**,
So that **plan gates and banners stay correct without operators touching Stripe**.

**Acceptance Criteria:**

**Given** `POST /api/v1/system/paddle/webhook`  
**When** a notification arrives  
**Then** `Paddle-Signature` is verified with `Paddle__WebhookSecret`  
**And** missing/invalid signature → 400  
**And** unconfigured secret → 503

**Given** tracked events (`transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.payment_failed`)  
**When** they arrive  
**Then** handlers are idempotent on event/notification id  
**And** tenant is resolved from `customData.tenant_id` (or stored Paddle customer/subscription id) and **rejected** on customer/tenant mismatch  
**And** `PaddleTenantBillingSync` updates Plan, BillingStatus, interval, trial, scheduled fields, merchant IDs  
**And** unknown/incomplete subscription statuses map to **safe** states (not silent Active)

**Given** `POST /api/v1/admin/billing/sync`  
**When** called after checkout return (with transaction id) or as a manual refresh  
**Then** it pulls latest Paddle subscription state and applies the same sync helper  
**And** 503 when Paddle is not configured (generic “Billing unavailable” copy)

**Given** handler failure  
**When** sync throws  
**Then** the event is **not** ledgered as success; response is non-2xx so Paddle retries

---

## Story 29.4: In-app billing details and payment method (same screens)

As a **Tenant Admin**,
I want **the existing Settings → Billing panel to show contact, card, invoices, and let me add/update a card**,
So that **I manage money the same way — Paddle hosts the card form instead of Stripe**.

**Acceptance Criteria:**

**Given** `GET /api/v1/admin/billing` and `GET .../details`  
**When** the admin opens Settings → Billing  
**Then** the existing panel still shows plan, usage, limits, scheduled change, contact, payment method last4/brand/exp, invoices  
**And** `billingConfigured` + `clientToken` replace `stripeConfigured` + `publishableKey`  
**And** complimentary / unconfigured environments still hide merchant actions (same empty states, generic copy)

**Given** add/update card (existing dialog entry)  
**When** the admin starts payment-method setup  
**Then** Cohestra does **not** use Stripe Elements or SetupIntent  
**And** the same dialog (or same button) opens Paddle.js overlay **or** redirects to Paddle update-payment-method / portal URL  
**And** on success, details refresh and last4/brand update  
**And** Members still cannot reach this flow

**Given** `PATCH /api/v1/admin/billing/contact`  
**When** name / email / phone are updated  
**Then** Paddle customer contact is updated; local tenant contact rules stay the same

**Given** invoices list  
**When** details load  
**Then** invoices come from Paddle transactions/invoices mapped to the existing `BillingInvoice` shape (`Id`, dates, amount cents, currency, status, pdf/hosted URL if Paddle provides them)

---

## Story 29.5: Customer portal, period-end cancel, resume, scheduled change

As a **Tenant Admin**,
I want **to manage billing in a hosted portal and cancel/downgrade at period end exactly as we designed**,
So that **plan changes still apply at period end and over-limit locks stay the same**.

**Acceptance Criteria:**

**Given** a paid/trialing tenant Admin  
**When** they use Manage billing  
**Then** `POST /api/v1/admin/billing/portal` returns a Paddle customer portal URL  
**And** return URL restores Settings → Billing (existing allowlist)  
**And** complimentary tenants cannot open portal  
**And** Members never see the entry point

**Given** `POST .../subscription/cancel`  
**When** cancel-at-period-end is requested  
**Then** Paddle subscription is set to cancel at current period end  
**And** tenant `ScheduledPlan` / `ScheduledPlanEffectiveAt` follow existing FR-24 rules  
**And** current plan limits remain until period end

**Given** `POST .../subscription/resume`  
**When** a period-end cancel is pending  
**Then** cancel is cleared and scheduled Basic is removed (existing resume behavior)

**Given** `POST .../subscription/cancel-scheduled-change`  
**When** a paid downgrade/interval change is pending  
**Then** the Paddle scheduled change is released and tenant scheduled fields clear (existing behavior)

**Given** webhook `subscription.updated` at period end  
**When** cancel or downgrade applies  
**Then** Plan/BillingStatus update per FR-24  
**And** over-limit → `ReadOnly_OverLimit` (not `Suspended`)

**Given** in-app plan change with proration  
**When** the existing checkout page applies an immediate paid change  
**Then** Paddle proration/disable-proration flags implement the **same user-visible rule** already shown (immediate change, proration on next invoice) — no new copy except replacing the word Stripe

---

## Story 29.6: Stripe excision — packages, copy, env, docs, tests, Epic 19.4

As a **platform operator**,
I want **zero Stripe dependencies or launch instructions left in the repo**,
So that **droplet and local env cannot be pointed at a merchant we cannot use**.

**Acceptance Criteria:**

**Given** repo search for `Stripe`, `stripe`, `@stripe`, `Stripe.net`, `sk_test_`, `whsec_`  
**When** 29.6 is done  
**Then** no runtime or docs references remain except historical notes in closed Epic 14 retros / this epic’s “was Stripe” mapping  
**And** `web/package.json` has no `@stripe/*`  
**And** `Infrastructure.csproj` has no `Stripe.net`

**Given** env examples and compose  
**When** reviewed  
**Then** only `Paddle__*` bindings exist (ApiKey, ClientToken, WebhookSecret, Environment, four prices, TrialPeriodDays)  
**And** docker-compose (local + uat) passes those into the API

**Given** legal, pricing, signup, checkout, billing panel, upgrade panel, platform complimentary, load-test seeder comments  
**When** rendered  
**Then** user-visible copy says checkout / billing portal / Paddle where a merchant must be named  
**And** “Stripe Tax is not enabled in v1” is replaced with MoR tax language (Paddle collects/remits tax; prices USD)

**Given** Epic 19  
**When** 29.6 lands  
**Then** Story 19.4 in `epics-cohestra-enterprise.md` and `sprint-status.yaml` is renamed to **Paddle billing UAT on droplet** with Paddle env ACs  
**And** launch checklist + `production-droplet-setup.md` billing rows use Paddle

**Given** automated tests  
**When** `dotnet test` and web typecheck/build run  
**Then** former Stripe billing tests exist under Paddle names and assert the **same** Epic 14 outcomes  
**And** platform complimentary tests use Paddle ID field names

---

## Story 29.7: Paddle sandbox UAT — Epic 14 process regression

As a **platform operator**,
I want **to walk the original billing process against Paddle sandbox**,
So that **we prove the swap before unblocking Epic 19**.

**Acceptance Criteria:**

**Given** local Docker (or equivalent) with Paddle **sandbox** keys, four `pri_` prices, webhook tunnel to `/api/v1/system/paddle/webhook`  
**When** operator runs the Epic 14 money path  
**Then** evidence is recorded (date, screenshots or log excerpts) for:

1. Basic signup — no checkout  
2. Core monthly checkout — trial, card required, plan unlocks, webhook + sync  
3. One-trial rule — second upgrade has no free trial  
4. Settings → Billing — contact, card last4, invoices  
5. Add/update card via the existing entry point  
6. Cancel at period end — access remains; scheduled Basic visible  
7. Resume — cancel cleared  
8. Downgrade / interval change — scheduled fields + period-end apply  
9. Failed payment (sandbox) — PastDue path starts (`DelinquencyStartedAt`)  
10. Complimentary tenant — no checkout/portal; jobs skip  
11. Member — no billing CTAs

**Given** 29.7 sign-off  
**When** sprint status is updated  
**Then** Epic 29 is `done` (or last story `done`)  
**And** Epic 19 moves from `blocked` back to `in-progress`  
**And** 19.4 is the Paddle droplet UAT story, not Stripe

---

## Sequence and dependencies

```
29.1 spine
  → 29.2 checkout
  → 29.3 webhooks/sync ──┬→ 29.4 details + card
                         └→ 29.5 portal + lifecycle
                              → 29.6 Stripe excision + rewrite 19.4
                                   → 29.7 sandbox UAT
                                        → unhold Epic 19
```

29.4 and 29.5 may proceed in parallel after 29.3. 29.6 must not start until 29.2–29.5 compile and tests cover the money paths.

---

## Dev notes (for create-story later)

- Prefer **redirect checkout** (`CheckoutUrl`) so `checkout-page-content.tsx` flow stays.
- Paddle.js is required for overlay card update; do not add Stripe.js “temporarily”.
- `customData.tenant_id` is mandatory on transactions.
- Sandbox vs live: `Paddle__Environment`; never use live keys in local/CI.
- No dual-write of Stripe + Paddle IDs.
- Hosted collector may show “Paddle” on the card statement — FAQ one-liner only.
