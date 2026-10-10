# COHESTRA × PADDLE BILLING PRODUCTION-READINESS REPORT

**Date:** 2026-10-08  
**Reviewed commit:** `c82f44eed583766d12330b41901d15c369727949` (`origin/main`, merge of PR #402)  
**Audit branch:** `cursor/paddle-billing-readiness-audit-8d24`  
**Classification:** AUDIT ONLY — not authorization to activate live billing  
**Final recommendation:** **NO-GO** for production / live Paddle cutover

This audit does not implement product fixes, does not create production credentials, does not modify Paddle destinations, and does not switch the merchant to live.

---

## 1. Executive summary

Cohestra has a substantial Paddle Billing integration on `main`: Core/Pro monthly and annual price mapping, server-created checkout transactions, Paddle.js overlay, checkout-return, signed webhooks, period-end cancel/downgrade, delinquency jobs, and server-side plan gates for Basic website builder and Pro conversational forms.

That is **not** production-ready.

Paddle sandbox onboarding at 75% with Step 02 still **In progress** is consistent with the code: Cohestra does **not** implement Paddle’s documented pricing-page pattern (`Paddle.PricePreview()` + `Checkout.open({ items })` on a public pricing page). It implements a SaaS signup → authenticated tenant checkout → overlay-on-transaction-id flow, plus a `/billing/paddle-return` default-payment-link page. Completing Step 02 is a **Paddle dashboard / operator** action, not something this audit can tick.

Launch is blocked by:

1. **Story 19.4** (`paddle-billing-uat-on-droplet`) is still `ready-for-dev` and blocked on UAT HTTPS (19.1 / 19.2).
2. **No sandbox credentials** in this environment — catalog amounts, live overlay checkout, webhook delivery, and upgrade/cancel against Paddle sandbox could not be executed.
3. **Webhook handler failures return HTTP 200**, so Paddle will not retry failed provisioning (contradicts Epic 29: failed handlers must return non-2xx).
4. **No refund / adjustment / chargeback handlers.**
5. **Live vs sandbox is not hard-gated** in `preflight-launch.sh` (warn only).
6. **Manual Paddle account checks** (website approval, live catalog, live notification destination, default payment link) are incomplete.

**Do not switch Paddle to live. Do not merge this audit as a product change. Use it as the gate report.**

---

## 2. Exact reviewed commit SHA

| Field | Value |
|-------|--------|
| SHA | `c82f44eed583766d12330b41901d15c369727949` |
| Subject | Merge pull request #402 from fad16papa/cursor/epic-43-tracker-close-8d20 |
| Base | `origin/main` after fetch (local snapshot was 7 commits behind) |
| Working tree at audit start | Clean |

Historical tracker status is **not** treated as proof the current HEAD works. Evidence below is from this SHA’s source, tests run in this session, and Paddle’s published docs.

---

## 3. Paddle onboarding Step 02 diagnosis

**Status:** **MANUAL VERIFICATION REQUIRED** — do not guess Paddle’s dashboard checkbox, and do not artificially mark onboarding complete.

Paddle’s published quickstart / setup checklist define “Build your pricing page and checkout” as:

1. Initialize Paddle.js with a client-side token (`test_…` in sandbox).
2. Call **`Paddle.PricePreview()`** so the public pricing page shows catalog prices (localized, with tax).
3. Open checkout with **`Paddle.Checkout.open({ items: [{ priceId, quantity }] })`** from that page.
4. Set **Checkout → Checkout configuration → Default payment link** to an HTTPS page that includes Paddle.js.
5. Take a test payment.

Sources: [Paddle Quickstart](https://developer.paddle.com/get-started/quickstart/), [Build a pricing page](https://developer.paddle.com/build/checkout/build-pricing-page), [Set your default payment link](https://developer.paddle.com/build/transactions/default-payment-link/), [Setup checklist](https://developer.paddle.com/build/set-up-checklist).

### What Cohestra actually does

| Paddle Step 02 expectation | Cohestra at `c82f44ee` |
|----------------------------|-------------------------|
| Dynamic prices via `PricePreview` | **Absent.** `/pricing` uses hardcoded USD amounts in `web/lib/marketing/pricing-plans.ts` (FR-20 USD-only). No `PricePreview` call exists in the repo. |
| Open checkout from the pricing page | **Different product path.** CTAs go to `/signup?plan=core\|pro`, then tenant `/billing/checkout`. Overlay uses **server-created `transactionId`**, not `items` from `/pricing`. |
| Default payment link page with Paddle.js | **Implemented** as `/billing/paddle-return` (`web/lib/billing/paddle-return.ts`, `PaddleReturnPageContent`). Overlay opens for unpaid `_ptxn`. |
| Overlay checkout | **Implemented** (`web/lib/billing/paddle-checkout.ts` → `paddle.Checkout.open({ transactionId })`). |

The operator-reported dashboard state (catalog / fulfillment / test complete, pricing+checkout in progress) is therefore **not** evidence that Cohestra lacks checkout code. It is evidence that Paddle’s **onboarding wizard** still considers the pricing-page + checkout configuration incomplete.

### Exact operator actions (dashboard; this VM cannot do them)

1. Sandbox → **Checkout → Checkout configuration → Default payment link** = `https://<sandbox-https-host>/billing/paddle-return` (no tenant slug). Local HTTP localhost is rejected by Paddle (HTTPS required). See `docs/deploy/paddle-sandbox-local-checkout.md`.
2. Confirm a **client-side token** (`test_…`) exists and is the value in `Paddle__ClientToken` for that environment.
3. Open an authenticated Core/Pro checkout and complete overlay with sandbox card `4242…` (trial; no real charge).
4. In the Paddle onboarding UI, complete whatever remaining checkbox Paddle shows for “pricing page and checkout”. If Paddle requires `PricePreview` on `/pricing`, that is a **product decision** against FR-20 USD-only hardcoded prices — do not change it in this audit.
5. Do **not** mark the step complete from Cohestra code or this report.

**Why 75% can coexist with working fulfillment/test:** Paddle’s wizard steps are independent. Catalog, webhook provisioning, and a prior test payment can be complete while the pricing-page/checkout configuration checkbox remains open.

---

## 4. Existing capabilities confirmed working

Confirmed at this SHA by source + automated tests (unit, and where noted integration/e2e):

- Paddle settings spine: `ApiKey`, `ClientToken`, `WebhookSecret`, `Environment` sandbox\|production, four Core/Pro price IDs, 30-day trial (`PaddleSettings`).
- `IsConfigured` = non-empty API key; unconfigured GET billing returns 200 with `BillingConfigured: false`; money APIs 503.
- Checkout only for Core/Pro; Basic has **no** Paddle product (by design).
- USD checkout transactions (`PaddleApiClient.CreateCheckoutTransactionAsync` currency `USD`).
- Upgrade: immediate + `prorated_next_billing_period`. Downgrade / annual→monthly: `next_billing_period` + `do_not_bill`.
- Cancel at period end, resume, cancel scheduled change (unit tests).
- Webhook HMAC (`ts` + `h1`) over request body string; 5-minute tolerance; constant-time compare.
- Duplicate `event_id` ledger + unique index.
- `subscription.created` unlocks plan; `payment_failed` → PastDue; `subscription.canceled` → Basic/Free.
- One-trial rule (`HasConsumedTrial`).
- Admin billing bound to JWT/`ICurrentTenant`, not client tenant id. Members 403 on billing routes (integration).
- Basic website builder blocked server-side (`PlanEntitlementException` / `plan_locked`).
- Conversational registration flow blocked on Core (unit + integration).
- Settings billing UI and 390px presentation (Playwright 43.3).
- Story 38.1: dashboard/clients/billing do not POST `/billing/sync` and do not emit billing 503s when Paddle is unset (Playwright).
- Public `/pricing` loads with Core $14.99 / Pro $29.99 / annual $152.92 / $305.93 (Playwright smoke + curl).
- Production cutover is explicitly gated (`docs/deploy/paddle-production-cutover.md`).

---

## 5. Failed tests and root causes

No billing unit, entitlement, isolation, or targeted integration test **failed** in this session.

| Suite | Result | Notes |
|-------|--------|--------|
| Infrastructure billing unit | 68 passed | See Phase 3 |
| Entitlement / isolation unit | 82 + 48 passed | Includes conversational gate, TenantIsolation |
| Full `Category!=Integration` | 931 passed, 8 skipped, 0 failed | Skips are Redis-rate-limiter / schedule tests needing extra deps |
| Billing + entitlement integration (first run) | 30 passed | Unconfigured Paddle 503, owner 403, Basic website, Core conversational |
| TenantIsolation integration | 32 passed | After DB available |
| Full Integration category (after DROP DATABASE) | 3 passed, 144 skipped | Factory `/ready` failed after destructive DB drop mid-session. **Not a product failure.** Retargeted TenantIsolation run recovered 32/32. |
| Vitest billing/entitlement | 89 passed | |
| Playwright billing-sync + smoke | 7 passed | Live API:8080 + web:3000, Paddle unset |
| Playwright settings-billing 43.3 | 3 passed | Includes 390 viewport |
| Sandbox Paddle API / overlay payment | **BLOCKED** | No `Paddle__*` credentials in this VM |
| Docker Compose smoke | **BLOCKED** | Docker not installed |
| Full Playwright matrix | **Not run** | Out of billing scope; live-stack billing specs above did run |

Known pre-existing flake cited in `AGENTS.md` (`ClientDedupIntegrationTests` phone validation) was **not** re-run as a billing gate.

---

## 6. Security vulnerabilities

Severity uses the project BMAD loop: BLOCKER / MAJOR / MINOR / NIT.

### MAJOR (launch-blocking if going live)

1. **Webhook processing failures acknowledged with HTTP 200.**  
   `PaddleWebhookController` returns `Ok` whenever the signature is valid, including `processed: false` / `"Handler failed."`  
   Evidence: `src/Api/Controllers/V1/PaddleWebhookController.cs:38-44`, `PaddleWebhookProcessor.cs:84-87`.  
   Epic 29 required non-2xx so Paddle retries. Sandbox retries 3 times / 15 minutes; live 60 times / 3 days. A 200 means **no retry**.  
   Combined with handlers that `SaveChanges` before the ledger insert, this can leave **partial tenant state and no redelivery**.

2. **No refund / adjustment / chargeback event handling.**  
   Tracked types are transaction completed/failed and subscription created/updated/canceled/past_due/activated only. Paid `Tenant.Plan` is not automatically revoked if Paddle refunds.

3. **UAT/dev can be pointed at live Paddle.**  
   `preflight-launch.sh` only **warns** on `Paddle__Environment=production`. It does not fail on live-shaped API keys or `live_` client tokens. `PaddleApiClient` selects host from `Environment`, not key prefix. `classify-paddle-env.sh` is advisory (exit 0).

### MAJOR (conditional / deduced)

4. **Paddle customer reuse by operator email** is implemented and unit-tested (`Checkout_reuses_existing_paddle_customer_for_the_same_email`). Signup rejects duplicate emails (`AuthService` / `SelfServeSignupService`), which **reduces** cross-workspace inheritance for self-serve. Residual risk: invited admins / platform-created tenants sharing an email, plus webhook `FirstOrDefault` on `PaddleCustomerId` with no unique constraint.

5. **Anonymous checkout-return** with a valid `txn_*` triggers provider sync and can return JSON including plan, billing status, and client token when overlay should reopen. Intended for Paddle’s default payment link; still an information / sync trigger surface.

### MINOR

6. Signature input is `StreamReader` text, not explicit raw UTF-8 bytes.  
7. Plan mapping falls back to `custom_data.plan` if price IDs are unmapped — dangerous if env price IDs are empty while API key is set (`IsConfigured` checks key only).  
8. No uniqueness / optimistic concurrency on `Tenant` under parallel webhook event ids.  
9. Public webhook/checkout-return routes have no dedicated rate limit.

### Positive controls

- `.env` gitignored; committed `appsettings.json` Paddle secrets empty.  
- Billing admin mutations use current tenant, not body `tenant_id`. Checkout `custom_data` is server-built.  
- Webhook HMAC tests: valid / tampered / stale.  
- Logs reviewed for billing paths use tenant/transaction ids, not API keys.

---

## 7. Entitlement and tenant isolation findings

| Check | Result |
|-------|--------|
| Basic cannot use website builder | **PASS** — `SitePageService.EnsureSitePlanAllowedAsync` throws plan_locked; `AdminSiteEntitlementIntegrationTests` + `WebsiteInquiryIntegrationTests.SubmitWebsiteInquiry_BasicTenant_ReturnsPlanLocked` |
| Core/Pro website / campaigns | **PASS** at plan-gate layer (`TenantPlanGateTests`, site/campaign isolation integration) |
| Pro-only conversational forms | **PASS** — `RegistrationExperiencePlanGate` + `ActivityRegistrationExperiencePlanIntegrationTests.UpdateActivity_CoreTenantConversationalExperience_Returns403PlanLocked` |
| Member cannot hit billing APIs | **PASS** — `TenantAuthzIntegrationTests` 403 on GET/sync/checkout/portal |
| Billing mutations scoped to JWT tenant | **PASS** — `BillingController` + `GetSummary_is_scoped_to_the_requested_tenant` |
| Client `X-Tenant-Id` ignored for public resolution | **PASS** — `TenantResolutionMiddlewareTests.Ignores_X_Tenant_Id_header_for_public_resolution` |
| Entitlements vs paid subscription | **PARTIAL** — gates read `Tenant.Plan`, not live Paddle subscription. Complimentary / stale plan rows can keep feature access until plan is written back. |
| Isolation after refresh/reconcile | **PARTIAL** — 38.1 e2e confirms no spurious sync; live webhook→UI refresh against sandbox **not** executed |

---

## 8. Remaining manual Paddle configuration tasks

Do these in **sandbox** until 19.4 is accepted. Never create a **live** notification destination from this audit.

1. Confirm sandbox catalog: Core/Pro products, four USD prices **$14.99 / $152.92 / $29.99 / $305.93**, 30-day trial on each paid price. (PRD §13.3; do not use old $153.99 / $306.99 sandbox leftovers.)
2. Copy **existing** sandbox `Paddle__*` into the target DEV/UAT `.env` only. Classify with `bash deploy/classify-paddle-env.sh` — expect SANDBOX labels. Never paste values into git or this report.
3. Default payment link → HTTPS `/billing/paddle-return` for that environment.
4. Sandbox notification destination → `https://<host>/api/v1/system/paddle/webhook` with events listed in `docs/deploy/paddle-sandbox-local-checkout.md`. Put that destination’s secret in `Paddle__WebhookSecret`.
5. Complete Paddle onboarding Step 02 in the dashboard after a real overlay test payment.
6. Live account (later, owner-only): website approval, identity/business verification, **separate** live catalog and credentials, live webhook URL, default payment link `https://cohestra.app/billing/paddle-return`. Follow `docs/deploy/paddle-production-cutover.md`. Do not execute without written owner approval after 19.4.

---

## 9. Recommended BMAD epic/stories (no duplicates)

Do **not** open a new Paddle migration epic. Epic 29 and Epic 38 are `done` in the tracker.

| Action | Tracker |
|--------|---------|
| **Execute existing Story 19.4** after 19.1 live URL + 19.2 HTTPS | `19-4-paddle-billing-uat-on-droplet: ready-for-dev` |
| Keep production cutover as the existing ops doc, not a new epic | `docs/deploy/paddle-production-cutover.md` |
| Add acceptance to **19.4** (preferred) or a **minimum corrective story under Epic 19** for the webhook HTTP 200 bug | Same epic; do not spawn Epic 44 for this |
| Refund/adjustment policy | Only if product requires automatic entitlement revoke; otherwise document as manual finance ops. Do not invent a parallel billing epic. |
| Live-key preflight fail-closed | Can be a 19.4 implementation slice |

No new stories were created in this audit.

---

## 10. Prioritized corrective work

**P0 — before any sandbox UAT sign-off that claims webhook recovery**

1. Return non-2xx from `PaddleWebhookController` when `processed == false` and the event is tracked (keep 200 for duplicates and deliberately ignored types).  
2. Do not persist tenant mutations without a successful ledger insert in the same transaction, or persist the ledger first with a “processing” state.

**P0 — before UAT droplet billing**

3. Finish 19.1 / 19.2 gates, then 19.4’s 11-case sandbox checklist on HTTPS.  
4. Confirm default payment link + webhook destination on the UAT host.

**P1 — before live cutover**

5. Make `preflight-launch.sh` fail if UAT sees live-shaped Paddle keys or `Paddle__Environment=production`.  
6. Confirm `IsConfigured` requires price IDs + webhook secret for money routes, or fail checkout clearly when prices are missing.  
7. Decide refund policy: listen for adjustment/refund events vs manual Ops revoke.  
8. Recreate catalog + notification destination in the **live** account; never reuse sandbox `pri_` / `pdl_sdbx` / `test_`.

**P2**

9. Product decision: keep hardcoded USD `/pricing` (FR-20) vs add `PricePreview` solely to satisfy Paddle’s wizard.  
10. Unit-test `BillingJobsHostedService` delinquency day 8 / day 29.  
11. HTTP integration test for `POST /api/v1/system/paddle/webhook` (valid, invalid, duplicate, handler failure status code).

---

## 11. Production launch blockers

| Blocker | Status |
|---------|--------|
| Story 19.4 sandbox UAT on HTTPS not executed | Open |
| Epic 19.1 / 19.2 still not `done` | Open |
| Paddle sandbox overlay payment + webhook delivery not verified in this audit | BLOCKED (no credentials) |
| Webhook non-retry on handler failure | Confirmed code defect |
| Refund/chargeback automation | Absent |
| Live catalog / live credentials / domain approval | MANUAL, not started here |
| Live vs sandbox hard isolation in deploy preflight | Incomplete |
| Owner written approval for live cutover | Required by cutover doc; not given |

Paddle’s 75% onboarding meter is **not** a launch criterion.

---

## 12. Final go / no-go

**NO-GO for production billing. NO-GO for live Paddle credentials. NO-GO for charging real customers.**

**CONDITIONAL GO for continued sandbox/UAT work** once Story 19.4’s dependencies exist, using only sandbox keys, test cards, and isolated test tenants.

Acceptance gate from the mission (all required for PRODUCTION READY):

| Gate | Result |
|------|--------|
| Critical security and isolation | **FAIL** — webhook 200-on-failure; refunds absent; live-key preflight soft |
| Required billing lifecycle tests | **PARTIAL** — unit/integration strong; sandbox lifecycle unexecuted |
| Checkout and webhook verified | **PARTIAL** — code + unit; no signed live webhook round-trip |
| Product and price mappings confirmed | **PARTIAL** — code + marketing page; Paddle catalog IDs empty in this VM |
| Environment isolation verified | **PARTIAL** — defaults sandbox; no hard fail on live keys |
| Manual Paddle account checks complete | **MANUAL / incomplete** |
| Unresolved launch blockers | **Yes** |

---

## Phase 0 — BMAD and repository discovery

Installed BMAD: `_bmad/bmm/config.yaml` (v6.9.0), `_bmad/custom/*`, `.agents/skills/bmad-*`, mandatory loop `_bmad/custom/mandatory-code-review-loop.md`.

Tracker (`sprint-status.yaml`):

- Epic 14 billing journeys: `done`
- Epic 29 Paddle migration 29.1–29.7: `done`
- Epic 38 (38.1 billing-sync … 38.6 overlays): `done`
- Epic 19: `in-progress`; **19.4 ready-for-dev** (blocked on 19.1 URL + 19.2 HTTPS)
- Story 43.3 billing presentation: `done`

Implementation files (non-exhaustive): `src/Infrastructure/Billing/*`, `src/Api/Controllers/V1/BillingController.cs`, `PaddleWebhookController.cs`, `PaddleCheckoutReturnController.cs`, `web/lib/billing/*`, `web/components/billing/*`, `web/app/pricing`, `deploy/classify-paddle-env.sh`, `docs/deploy/paddle-*.md`.

DEV / UAT / PROD: compose defaults `Paddle__Environment=sandbox`; UAT compose still sandbox unless `.env` overrides; production requires owner `.env` live keys. This VM had **no** `.env` and empty appsettings secrets.

---

## Phase 1 — Architecture capability matrix

| Capability | Status | Evidence |
|------------|--------|----------|
| Paddle SDK / API | Implemented | Typed `HttpClient` (`PaddleApiClient`); frontend `@paddle/paddle-js` |
| Product/price mapping | Implemented (env) | Four `Paddle__Price*` IDs; Basic none |
| Basic / Core / Pro | Implemented | Checkout Core/Pro only; Basic free |
| Monthly / annual | Implemented | ResolvePriceId + upgrade/downgrade scheduler |
| Pricing page | Implemented (static USD) | `/pricing`; not Paddle PricePreview |
| Checkout session | Implemented | `POST /api/v1/admin/billing/checkout` |
| Paddle.js overlay | Implemented | `openPaddleCheckoutOverlay` |
| Success / cancel / fail | Implemented | dashboard reconcile; `canceled=1`; incomplete resume |
| Checkout return validation | Implemented | resolver + paid vs unpaid redirect |
| Subscription persistence | Implemented | Tenant Paddle ids + plan/status |
| Webhook + signature | Implemented | raw body string + HMAC |
| Idempotency | Implemented | `PaddleWebhookEvents.EventId` unique |
| Concurrency / ordering | Partial | duplicate event_id only; no tenant RowVersion |
| Retry recovery | **Fail** | HTTP 200 on handler failure |
| Sync / reconcile | Implemented | admin POST sync + checkout-return |
| Trial | Implemented | 30 days, one-trial |
| Upgrade / downgrade | Implemented | immediate proration / period-end |
| Cancel | Implemented | period-end + resume |
| Payment failure / past-due | Implemented | webhook + jobs day 8 OnHold / day 29 Archive |
| Refund | **Absent** | |
| Tenant isolation | Implemented (admin API) | JWT tenant; webhook custom_data + customer match |
| Server entitlements | Implemented | plan gates, not live subscription object |

---

## Phase 2 — 25-point checklist

| ID | Requirement | Status | Evidence | Gap | Recommended action |
|----|-------------|--------|----------|-----|--------------------|
| A1 | Basic/Core/Pro products and prices mapped | **PARTIAL** | Code maps four `pri_` IDs; marketing page amounts match PRD; Basic has no product | This VM has empty price IDs; Paddle catalog not queried | Operator classify sandbox `.env` and confirm amounts in dashboard |
| A2 | Monthly and annual cycles | **PARTIAL** | `ResolvePriceId`, upgrade/downgrade unit tests, marketing annual prices | No sandbox transaction for annual vs monthly | Include both intervals in 19.4 |
| A3 | Checkout opens with correct tenant/product/plan | **PARTIAL** | Server `custom_data` tenant_id/slug/plan/interval; overlay uses transactionId; checkout page query params | No live overlay in this VM | 19.4 overlay on tenant host |
| A4 | Cancelled/failed checkout never provisions paid access | **PARTIAL** | Return paid only if plan Core/Pro after sync; unpaid → incomplete; overlay closed does not set paid | No live cancelled-card run; `ClearUnverifiedPaidPlan` untested | Add unit test; 19.4 cancel overlay case |
| A5 | Duplicate actions do not create extra subscriptions | **PARTIAL** | Throws if `PaddleSubscriptionId` set; UI `starting` flag; event_id idempotency | No API mutex; empty local id + existing Paddle sub can create another | Guard checkout by listing customer subscriptions |
| B1 | Successful subscription → state + entitlements | **PASS** | `ProcessAsync_subscription_created_unlocks_plan`; `Sync_from_completed_transaction_unlocks_pro` | Sandbox e2e not run | 19.4 case 1/5/6 |
| B2 | Upgrade/downgrade effective-date and proration | **PASS** (code/unit) | Upgrade `immediately` + `prorated_next_billing_period`; downgrade `next_billing_period` + `do_not_bill` | Not exercised against Paddle API | 19.4 case 7 |
| B3 | Cancellation and scheduled cancellation | **PASS** (unit) | Cancel/resume/cancel-scheduled tests; webhook canceled → Basic | Not against sandbox | 19.4 case 8 |
| B4 | Renewals, payment failures, past-due | **PARTIAL** | `payment_failed` → PastDue; jobs day 8/29; PastDue still full access (policy) | Jobs untested; no renewal origin e2e | Unit-test jobs; 19.4 dunning |
| B5 | Refund and failed-payment vs approved policy | **FAIL** / **NOT IMPLEMENTED** (refunds) | Failed payment implemented; **zero** refund handlers in `src/` | Policy gap | Product decision + handler or manual runbook |
| C1 | Webhook signatures vs raw payload | **PASS** | Controller reads body then `TryValidate`; unit tests tamper/stale/valid | StreamReader vs bytes | Keep; add HTTP integration test |
| C2 | Duplicate / out-of-order cannot corrupt | **PARTIAL** | Duplicate event_id ignored; unique index | Different event ids last-write-wins; no ordering | Document; consider version/updated_at |
| C3 | Retry/recovery does not duplicate; retries happen | **FAIL** | Duplicates 200 `{duplicate:true}` (good); **failures also 200** (bad) | Paddle will not retry | P0 controller status fix |
| C4 | Client-supplied tenant cannot access another | **PASS** (admin) **PARTIAL** (system) | JWT tenant; webhook mismatch guard; checkout-return weaker | Anonymous txn probe | Keep payment-link; avoid extra JSON leak if possible |
| C5 | Credentials, secrets, failure logs | **PASS** (repo) **MANUAL** (ops) | gitignore `.env`; empty appsettings; classify script; logs use ids | No production log review | 19.4 log scan; never commit secrets |
| D1 | Basic Website Builder server-side | **PASS** | SitePageService + integration 403 plan_locked | — | Keep |
| D2 | Core/Pro entitlements match actual plan | **PARTIAL** | Gates use `Tenant.Plan` after sync | Not live Paddle; complimentary/stale plan | 19.4 UI + API after pay |
| D3 | Pro-only conversational forms | **PASS** | Gate + integration 403 on Core | — | Keep |
| D4 | Billing mutations isolated | **PASS** | Controller + tenant-scoped service tests + member 403 | Webhook cross-tenant by design | Keep custom_data server-side |
| D5 | State consistent after refresh/nav/reconcile | **PARTIAL** | 38.1 e2e; dashboard reconcile gate | No paid-plan refresh after sandbox pay | 19.4 |
| E1 | Live account / domain approval | **MANUAL** | Cutover + Paddle setup checklist | No dashboard access | Owner: Website approval |
| E2 | Live products/prices/credentials separate | **PARTIAL** | Docs + `IsSandbox` API host; examples are sandbox-shaped | No live account inspection; preflight soft | Cutover checklist; fail-closed preflight |
| E3 | Production webhook config (inspect only) | **MANUAL** | Documented URL/events; **not created** | Must not create live destination now | After 19.4 + owner approval |
| E4 | DEV/UAT cannot accidentally use live | **PARTIAL** | Defaults sandbox; empty keys here; classify labels LIVE | Preflight warns only | Fail UAT on live key/`production` |
| E5 | Monitoring, rollback, incident, controlled launch | **PARTIAL** | Cutover rollback = restore `.env` + DB dump; launch checklist logs | No Paddle-specific alerting; 19.4/19.5 open | Finish Epic 19 ops |

---

## Phase 3 — Automated testing (executed)

Commit for all runs: `c82f44eed583766d12330b41901d15c369727949`.  
Environment: Cursor Cloud Ubuntu 24.04. Snapshot lacked .NET/Postgres/Redis despite `AGENTS.md`; SDK 9.0.318, PostgreSQL 16, Redis 7, and `web/node_modules` were installed **for this audit only**. No production config was changed.

| Command | Environment | Pass/fail/skip | Artifacts | Failure / risk |
|---------|-------------|----------------|-----------|----------------|
| `dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj --filter FullyQualifiedName~Infrastructure.Tests.Billing` | local, in-memory EF | 68 passed | `/tmp/paddle-audit/dotnet-billing-unit.txt` | None |
| Entitlement/auth/middleware filter | local | 82 passed | `/tmp/paddle-audit/dotnet-entitlement-unit.txt` | None |
| `FullyQualifiedName~SiteSectionPlanGate\|TenantAccessEvaluator\|Category=TenantIsolation` (unit) | local | 48 passed | `/tmp/paddle-audit/dotnet-isolation-unit.txt` | None |
| `dotnet test Cohestra.sln --filter Category!=Integration` | local | 931 passed, 8 skipped, 0 failed | `/tmp/paddle-audit/dotnet-unit-all.txt` | Skips = Redis/rate-limit/schedule |
| Billing/authz/site/conversational/inquiry integration | `CI=true`, Postgres+Redis, `cohestra_test` | 30 passed | `/tmp/paddle-audit/dotnet-integration-billing.txt` | None |
| `Category=TenantIsolation` integration | same | 32 passed | `/tmp/paddle-audit/dotnet-isolation-integration.txt` | None |
| `Category=Integration` full after DROP DATABASE | same | 3 passed, 144 skipped | `/tmp/paddle-audit/dotnet-integration-all.txt` | Factory `/ready` after drop — **environment**, not product |
| `cd web && npm test -- lib/billing/ …` | Node 22, vitest 3.2.7 | 89 passed | `/tmp/paddle-audit/vitest-billing.txt` | None |
| Playwright `billing-sync-38-1` + `smoke` | API :8080, web :3000, Paddle unset | 7 passed | `/tmp/paddle-audit/playwright-billing-smoke.txt` | None |
| Playwright `settings-billing-43-3` | same | 3 passed | `/tmp/paddle-audit/playwright-settings-billing.txt` | None |
| Playwright checkout overlay / Paddle test card | — | **BLOCKED** | — | No sandbox client token |
| `docker compose` smoke | — | **BLOCKED** | — | Docker not installed |
| Checkout mobile E2E (`/billing/checkout`) | — | **BLOCKED** / not covered | — | No dedicated spec; 43.3 covers settings billing at 390px |

Live probes (Paddle unset):

- `POST /api/v1/system/paddle/webhook` with empty JSON → **503** `Paddle webhook secret is not configured.`
- `GET /api/v1/admin/billing` unauthenticated → **401**
- `GET /pricing` → **200**, amounts $14.99 / $29.99 / $152.92 / $305.93

---

## Phase 4 — Paddle sandbox verification

| Item | Status |
|------|--------|
| Catalog products/prices via API | **BLOCKED** — `Paddle__ApiKey` not present |
| Checkout settings / default payment link | **MANUAL** — dashboard; code expects `/billing/paddle-return` |
| Checkout initialization | **PARTIAL** — overlay code + unit tests; no token to initialize Paddle.js against sandbox |
| Test transaction completion | **BLOCKED** |
| Subscription create/provision | **PASS** in unit fakes; **BLOCKED** vs sandbox |
| Webhook delivery | **BLOCKED**; local endpoint 503 without secret |
| Payment failure | **PASS** unit; **BLOCKED** sandbox |
| Upgrade/downgrade | **PASS** unit; **BLOCKED** sandbox |
| Cancellation | **PASS** unit; **BLOCKED** sandbox |
| UI entitlement after pay | **BLOCKED** sandbox; **PASS** injected-state e2e 43.3 |

No sandbox mutations were attempted. No live credentials were used.

---

## Phase 5 — Security and environment protection (audit compliance)

| Safeguard | Observed |
|-----------|----------|
| Did not print API keys / webhook secrets | Yes |
| Did not commit `.env` | No `.env` present; gitignore includes `.env` |
| Did not use live payment credentials | None present |
| Did not trigger real charges | Yes |
| Did not modify production Paddle config | Yes |
| Did not change customer subscriptions | Yes |
| Did not activate live billing | Yes |
| Did not run destructive **production** migrations | Test DB `cohestra_test` was dropped/recreated once (documented skip storm) |
| Did not deploy to production | Yes |
| Did not bypass subscription validation to green tests | Yes |

---

## Phase 6 — BMAD specialist review

This was an **audit**, not an implementation story. The mandatory IMPLEMENT → BUILD → TEST → CODE REVIEW loop was **not** used to close a story. No product code was changed.

| Discipline | How it was covered | Outcome |
|------------|--------------------|---------|
| Investigation | `bmad-investigate` activated; case file `investigations/paddle-billing-production-readiness-investigation.md` | Concluded: not production-ready |
| Architecture | Composer 2.5 explore of `src/Infrastructure/Billing` + API controllers | Integration present; retry/refund gaps |
| Frontend | Composer 2.5 explore of web billing/pricing | Overlay + return page present; no PricePreview |
| Environment / QA inventory | Composer 2.5 explore of compose, preflight, tests | 19.4 open; CI has no Paddle secrets |
| Security | Composer 2.5 adversarial review of billing | MAJOR webhook 200; refunds; live-key preflight |
| NFR / release | `bmad-testarch-nfr` used as evidence framing (not a full TEA create-mode run) | Reliability gap on webhooks |
| Adversarial | `bmad-review-adversarial-general` stance applied to billing HEAD | Findings in §6 |
| Code review skill | `bmad-code-review` loaded; **not** executed as story step-file (no implementation HEAD to accept) | N/A |
| UX designer agent | **Not used** for architecture, security, or release decisions (per mission) | — |
| Product entitlements | Unit + integration + 43.3 e2e | Server gates hold; live plan sync unverified |
| Release-readiness | Cutover doc + Epic 19 tracker | NO-GO |

Corrective implementation was **not** applied in this audit.

---

## Model, agents, and skills used

| Role | What |
|------|------|
| Primary model | Grok 4.6 (this agent) |
| Secondary model | Composer 2.5 (explore subagents: backend architecture, frontend checkout, env/tests, security) |
| Auto | Disabled (per mission) |
| Skills read/followed | `bmad-investigate`, `bmad-help`, `bmad-code-review` (load only), `bmad-testarch-nfr` (evidence framing), `bmad-review-adversarial-general`, `_bmad/custom/mandatory-code-review-loop.md` |
| Agents invented | None |
| UI-focused agent for release | Not used |

---

## Appendix A — Price table (product, not Paddle catalog proof)

From `web/lib/marketing/pricing-plans.ts` and Epic 29 / PRD:

| Plan | Monthly | Annual (14.99% off) | Paddle product |
|------|---------|---------------------|----------------|
| Basic | Free | n/a | None |
| Core | $14.99 | $152.92 | `Paddle__PriceCoreMonthly` / `Annual` |
| Pro | $29.99 | $305.93 | `Paddle__PriceProMonthly` / `Annual` |
| Enterprise | Custom | n/a | Manual; no self-serve checkout |
