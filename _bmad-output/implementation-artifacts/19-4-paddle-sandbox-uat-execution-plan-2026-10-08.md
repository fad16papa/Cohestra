# Story 19.4 — Paddle sandbox UAT execution plan

**Date:** 2026-10-08  
**Story:** existing `19-4-paddle-billing-uat-on-droplet.md` — **do not duplicate** a new story.  
**Skills applied:** BMAD story context (`bmad-dev-story` halt: no SSH / no merge / no charge), test-design risk ranking (`bmad-testarch-test-design` Create-mode cases), Mandatory Code Review Loop.  
**Model:** Grok 4.6 only.  
**Environment:** Paddle **sandbox** + UAT HTTPS (`https://uat.cohestra.app`). Never live keys. Never print, commit, or paste secrets.

## Halt conditions (this agent)

- Do **not** merge PR #404 without explicit owner authorization.  
- Do **not** run a real (non-sandbox) charge.  
- Do **not** activate live Paddle / `Paddle__AllowLive` on production.  
- Do **not** mark 19.1 / 19.2 / 19.4 done.  
- Cloud Agent has **no droplet SSH** and **no Paddle dashboard login**. Owner executes dashboard + droplet steps.

## Gate before the walk

1. Owner authorizes merge of PR #404 (`47ebb1b5` at merge-gate; re-verify HEAD if the branch moved).  
2. Owner deploys that HEAD to the UAT droplet (`cohestra-uat`). Public stack today is **not** proven to be `47ebb1b5`.  
3. On droplet, classify without printing values: `bash deploy/classify-paddle-env.sh` — expect **sandbox** API key / `test_` client token / four `pri_…` / `Paddle__Environment=sandbox`.  
4. Confirm `PUBLIC_BASE_URL=https://uat.cohestra.app` (or equivalent locked UAT host). `Paddle__AllowLive` must stay **false**. Live keys must not be present.  
5. Apply EF migrations including `paddle_adjustment_cursors` (API startup applies migrations).  
6. Paddle **sandbox** dashboard steps below.

## Paddle dashboard onboarding — Step 02 (owner)

Sandbox account only. Do not open the live account.

| Setting | Required value |
|---------|----------------|
| Website / checkout domain approval | `uat.cohestra.app` and `*.uat.cohestra.app` (Request website approval / checkout domain allow-list as Paddle presents it) |
| Default payment link | `https://uat.cohestra.app/billing/paddle-return` — marketing apex, **never** a tenant slug |
| Notification destination | `https://uat.cohestra.app/api/v1/system/paddle/webhook` (**new** destination vs local ngrok; own secret) |
| Destination secret | Put **only** in droplet `Paddle__WebhookSecret`; recreate `api` after change |
| Subscribed events | `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.activated`, **`adjustment.created`**, **`adjustment.updated`** |

`transaction.created` is **not** enough. Cohestra ignores it.

Unsigned public probe already returns `400 Missing Paddle-Signature header.` — a webhook secret is configured on the **current** public API. After #404 deploy, confirm the destination secret still matches.

Catalog: reuse existing sandbox Core/Pro × monthly/annual `pri_…` (PRD §13.3). Do not create a duplicate catalog unless classification shows IDs missing or live-shaped.

## Risk-ranked cases

P0 = blocks 19.4 acceptance. P1 = required lifecycle. P2 = policy-bound / residual.

### P0 — Checkout, provision, entitlements

| ID | Case | How | Expect |
|----|------|-----|--------|
| C1 | Real sandbox checkout (overlay) | Tenant admin → Billing → Core monthly. Paddle **sandbox** test payment method only. | Overlay opens on tenant host; CSP allows `sandbox-buy.paddle.com` / `sandbox-cdn.paddle.com`. |
| C2 | Monthly Core | Complete C1. | `transaction.completed` + `subscription.created` (or `updated`) → tenant `Plan=Core`, `BillingInterval=Monthly`, `BillingStatus=Active` (or trial Active). UI shows Core. |
| C3 | Annual Core | Separate tenant or after cancel. Core annual price. | `Plan=Core`, `BillingInterval=Annual`. |
| C4 | Monthly Pro | Checkout Pro monthly. | `Plan=Pro`, monthly. Pro entitlements (vs Core gates) visible. |
| C5 | Annual Pro | Checkout Pro annual. | `Plan=Pro`, annual. |
| C6 | Subscription provisioning | After paid/trial checkout. | `Tenant.PaddleCustomerId` + `PaddleSubscriptionId` set. Site/plan gates match mapped `pri_…`. |
| C7 | Webhook signature | Valid destination delivery. | HTTP **200**; ledger row `paddle_webhook_events`. |
| C8 | Invalid signature | POST without / with wrong `Paddle-Signature`. | HTTP **400**; no plan change. |
| C9 | Checkout return | Hosted fallback `_ptxn` on apex `/billing/paddle-return`. | Redirects to `{slug}.uat.cohestra.app/dashboard` via `custom_data.tenant_id`. Overlay `onCompleted` may skip apex when JS works. |
| C10 | Page refresh | Refresh overlay tab / return URL before and after complete. | No double plan grant. Same `event_id` replay → **200** duplicate. |

### P1 — Change, cancel, failure, isolation

| ID | Case | How | Expect |
|----|------|-----|--------|
| U1 | Upgrade Core → Pro | In-app / portal schedule or immediate per existing Epic 29 behavior. | Plan becomes Pro (or scheduled Pro + period-end). Webhook `subscription.updated`. |
| U2 | Downgrade Pro → Core | Same. | Deferred to period end when `ShouldDeferPlanChange` applies; scheduled fields set; current Pro remains until effective. |
| K1 | Cancel at period end | Billing cancel. | Access remains until period end; scheduled Basic visible. |
| K2 | Renewal | Leave a sandbox subscription to renew (or Paddle sandbox simulate). | Stays Active; `transaction.completed` does not corrupt plan. |
| F1 | Failed payment | Sandbox decline / failed invoice. | `transaction.payment_failed` → PastDue + `DelinquencyStartedAt`. Complimentary tenants skip. |
| F2 | Retry / dunning | Subsequent successful payment. | `ApplyInvoicePaid` → Active; delinquency cleared. |
| W1 | Webhook replay | Paddle Notifications → replay same event. | **200** duplicate; no second ledger row; plan unchanged. |
| W2 | Retryable failure | If handler cannot complete (e.g. tenant unresolved). | **503**; no ledger; Paddle retries; later success writes once. |
| I1 | Tenant isolation | Two UAT tenants; checkout tenant A. | Tenant B plan unchanged. `custom_data.tenant_id` never grants the other workspace. |

### P2 — Refund, dispute, residual policy

Do **not** invent entitlement revoke. Record evidence; escalate if product wants different behavior.

| ID | Case | How | Expect **today** (code on #404) |
|----|------|-----|--------------------------------|
| R1 | Approved refund | Sandbox refund in Paddle dashboard. | Ingest `adjustment.*`; **plan / BillingStatus unchanged**; warning log. |
| R2 | Approved chargeback | Sandbox dispute/chargeback if available; else signed fixture on UAT after deploy. | PastDue (FR-23 analog). Complimentary: ingest, no status change. |
| R3 | Pending / rejected adjustment | Non-`approved` status. | Ledger ingest; no entitlement change. |
| R4 | Delayed chargeback after recovery | Chargeback → PastDue → successful payment → **new** `event_id` approved chargeback. | **Residual:** may re-enter PastDue. Owner item (3). Same-`event_id` retry stays idempotent. Do not auto-restore on `reversed`. |

## Operator walk (owner workstation)

Use two UAT tenants (example `creativorare` + a second slug). Login as tenant admin, not platform operator, for checkout.

1. **Preflight** — `https://uat.cohestra.app/ready` Healthy; tenant host HTTPS; classify sandbox; `AllowLive` false.  
2. **Step 02** — domains + default payment link + notification destination (events including adjustments). Recreate `api` after secret change.  
3. **C1–C6** — Core monthly on tenant A; confirm Billing UI + a Core-gated surface. Repeat Pro/annual on tenant B or after cancel.  
4. **C7–C10 / W1** — Paddle notification log 200; replay; unsigned POST still 400; refresh return URL.  
5. **U1–U2 / K1** — upgrade, downgrade schedule, cancel-at-period-end.  
6. **F1–F2** — decline then successful retry.  
7. **I1** — tenant B unchanged throughout tenant A lifecycle.  
8. **R1–R4** — refund ingest-only; chargeback PastDue; record R4 result for owner policy.  
9. **Logs** — `docker compose logs api` (UAT project): failures observable; **no API key / webhook secret / client token** in log lines.  
10. **Evidence pack** — date, HEAD SHA on droplet (`git rev-parse HEAD`), screenshot or log excerpt per P0/P1 case, Paddle notification row status. **Redact secrets.**

Sandbox test payment methods: Paddle sandbox docs only. Never a live card. Never `COHESTRA_ALLOW_LIVE_PADDLE=1` on UAT.

## Code already covering (do not re-implement)

- Units: `PaddleWebhookProcessorTests`, `PaddleCredentialGuardTests`, `PaddleBillingServiceTests`, `TenantBillingPlanSyncTests`, `PaddleSignatureTests`.  
- Integration: `PaddleWebhookIntegrationTests` (serial).  
- UAT host lock: live keys rejected even with `AllowLive` when `PublicWeb:BaseUrl` is `uat.cohestra.app`.  
- Story 29.7 automated adapter coverage is **done**; this plan is **droplet** sandbox acceptance.

## After the walk

- If a defect is found: fix on the remediation branch → BUILD → TEST → `bmad-code-review` on the **new** HEAD (Mandatory Code Review Loop).  
- If only owner policy remains: keep 19.4 open until P0/P1 pass; do not invent refund revoke.  
- Production cutover stays in `docs/deploy/paddle-production-cutover.md` — **do not execute**.

## Next BMAD implementation step

Owner merge of PR #404 → owner deploy to UAT → owner executes this plan (sandbox). This Cloud Agent does not start the walk from here.
