# Epic 19 — Paddle sandbox readiness

**Date:** 2026-09-06  
**Owner decision:** UAT and Story 19.4 use **existing Paddle sandbox** credentials. No live keys. No payment cutover.  
**Verdict:** **PASS** (integration contract) — Paddle does **not** block Story 19.1.

This Cloud Agent VM has **no** local `.env`. Sandbox values live on the owner’s existing local Cohestra setup. Copy them onto the UAT droplet `.env` only. Do not paste them into git, PRs, chat, or BMAD artifacts.

## 1. Current integration discovered

| Surface | What exists |
|---------|-------------|
| Settings | `PaddleSettings` (`Paddle` section) — `src/Infrastructure/Billing/PaddleSettings.cs` |
| API client | `PaddleApiClient` — base URL from `IsSandbox` |
| Billing | `PaddleBillingService` via `IBillingService` |
| Webhooks | `POST /api/v1/system/paddle/webhook` — signature then process |
| Checkout return | `GET /api/v1/system/paddle/checkout-return` + web `/billing/paddle-return` |
| Overlay | `@paddle/paddle-js` with **client token from the billing API**, not `NEXT_PUBLIC_*` |
| Catalog | Four **price IDs** map Core/Pro × monthly/annual. No product IDs. |
| Persistence | `Tenant.PaddleCustomerId` / `PaddleSubscriptionId` / `PaddleSubscriptionScheduleId`; `PaddleWebhookEvents` for idempotency |
| Startup | App starts with empty Paddle. Checkout returns 503 until `ApiKey` is set. |

Environment switch (do not hard-code URLs elsewhere):

- `Paddle:Environment` / `Paddle__Environment` empty or `sandbox` → `https://sandbox-api.paddle.com/`
- `production` → `https://api.paddle.com/`
- Paddle.js: `test_…` → sandbox, `live_…` → production

## 2. Configuration keys (existing names only)

| Key | Class | Notes |
|-----|--------|--------|
| `Paddle__ApiKey` | BACKEND SECRET | Server only. `IsConfigured` = key present. Sandbox contains `sdbx`. |
| `Paddle__ClientToken` | FRONTEND PUBLIC TOKEN | Returned on authenticated billing summary / checkout-return for Paddle.js. Sandbox starts with `test_`. |
| `Paddle__WebhookSecret` | WEBHOOK SECRET | Server only. Per notification destination. |
| `Paddle__Environment` | NON-SECRET | Default `sandbox`. |
| `Paddle__PriceCoreMonthly` | CATALOG IDENTIFIER | `pri_…` |
| `Paddle__PriceCoreAnnual` | CATALOG IDENTIFIER | `pri_…` |
| `Paddle__PriceProMonthly` | CATALOG IDENTIFIER | `pri_…` |
| `Paddle__PriceProAnnual` | CATALOG IDENTIFIER | `pri_…` |
| `Paddle__TrialPeriodDays` | NON-SECRET | Default `30`. |
| `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN` | NON-SECRET | HTTPS origin for overlay return (ngrok local / UAT apex). Not a credential. |

No `NEXT_PUBLIC_PADDLE_API_KEY`. Do not invent new names.

Classify without printing values: `bash deploy/classify-paddle-env.sh`.

## 3. Sandbox credentials on this VM

| Value | Classification |
|-------|----------------|
| Paddle API key | NOT PRESENT |
| Client token | NOT PRESENT |
| Webhook secret | NOT PRESENT |
| Environment | repo default `sandbox` (appsettings) |
| Four price IDs | NOT PRESENT |
| `TrialPeriodDays` | `30` (appsettings default) |

Repo examples and `appsettings.json` are empty placeholders. GitHub Actions has no Paddle secrets. `.env` is gitignored and missing here.

## 4. Existing sandbox catalog

Cohestra stores **price IDs only**, configured in env, not in the database.

Reuse the owner’s existing local sandbox `pri_…` values on UAT. Do **not** create duplicate products/prices because UAT is a new host.

Before 19.4 checkout, classify those IDs as present and confirm they belong to the **sandbox** account (same `sdbx` API key). Sandbox and live catalogs are separate.

## 5. Webhook route

Canonical path (already implemented):

`POST /api/v1/system/paddle/webhook`

UAT URL once HTTPS exists:

`https://<uat-host>/api/v1/system/paddle/webhook`

Do not add a second endpoint. Events handled: `transaction.completed`, `transaction.payment_failed`, `subscription.created|updated|canceled|past_due|activated`. Duplicates return `200` `{ duplicate: true }` via `PaddleWebhookEvents.EventId`.

Related (not the webhook): `GET /api/v1/system/paddle/checkout-return`, marketing `/billing/paddle-return`.

## 6. Local → UAT credential reuse

| Value | Reuse same sandbox account? |
|-------|-----------------------------|
| API key | **Yes** — account-level sandbox key. |
| Client token | **Yes** — same Paddle.js sandbox token. |
| Price IDs | **Yes** — same sandbox catalog. |
| Environment | **Yes** — `sandbox`. |
| Webhook secret | **No (usually)** — secret is per notification destination. Local ngrok URL ≠ UAT HTTPS URL. Prefer a **second sandbox destination** aimed at the UAT webhook URL, with its own secret only in droplet `.env`. |
| Return origin | **No** — set `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN` (and `PUBLIC_BASE_URL`) to the UAT HTTPS apex. Rebuild `web`. |

Do not rotate the API key or client token for neatness.

Paddle Default payment link is one URL per environment. UAT should use `https://<uat-apex>/billing/paddle-return` (see `docs/deploy/production-droplet-setup.md`). That is a Paddle dashboard setting, not a Cohestra env var.

## 7. Owner still needs to provide

Do **not** paste secrets into git, chat, or BMAD files.

| Item | Blocks |
|------|--------|
| DigitalOcean / SSH (or token to create the droplet) | **19.1** |
| SendGrid Mail Send key + verified from-addresses | **19.1** (UAT compose will not start without it) |
| Copy existing **local** `Paddle__ApiKey`, `Paddle__ClientToken`, four `Paddle__Price*` onto droplet `.env` | 19.4 (not 19.1) |
| reCAPTCHA site + secret | 19.3 |
| After 19.2 HTTPS: create sandbox **notification destination** for the UAT webhook URL; put that destination’s secret in droplet `Paddle__WebhookSecret` only | 19.4 |

No live Paddle values. No duplicate catalog unless classification shows the local IDs are missing or live.

## 8. Does Paddle block Story 19.1?

**No.** `IsConfigured` is false when `ApiKey` is empty. `/ready` does not require Paddle. 19.1 proves nginx + api + web + postgres + redis + `uat-smoke.sh`.

Optional: put sandbox `ApiKey` / `ClientToken` / prices on the droplet at 19.1 so the process is already in sandbox mode. Full checkout/webhook acceptance is 19.4.

## 9. Deferred to Story 19.4

1. Successful sandbox checkout (test card only — no real charge)  
2. Webhook signature accepted  
3. Invalid signature rejected (unit coverage already in `PaddleSignatureTests`)  
4. Duplicate delivery idempotent (`PaddleWebhookProcessorTests`)  
5. Subscription created + plan/entitlement mapped from price IDs  
6. Subscription update / cancel where Paddle sandbox supports it  
7. Replay does not corrupt state  
8. Failures observable in logs; **no secret in logs**  
9. UAT notification destination + destination secret  
10. Default payment link = UAT apex `/billing/paddle-return`  

Live cutover is a **later** checklist. Do not execute without explicit owner approval.

## Security (already true in code)

- API key: server HTTP client Bearer only. Not in Next public env, not in billing DTOs.  
- Client token: intended for Paddle.js via authenticated billing/checkout-return.  
- Webhook secret: server verify only.  
- Startup log records the **default payment link path**, not the API key.
