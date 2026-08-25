# Production droplet billing (Paddle)

Epic 19 droplet work stays on hold until Epic 29.7 sandbox sign-off. Do **not** put Stripe keys on the droplet.

## Environment

Copy from `.env.uat.example` and set:

| Variable | Purpose |
|---|---|
| `Paddle__ApiKey` | Server API key (`pdl_sdbx_…` for sandbox, live key only at public launch) |
| `Paddle__ClientToken` | Paddle.js client token |
| `Paddle__WebhookSecret` | Notification destination secret |
| `Paddle__Environment` | `sandbox` until public launch, then `production` |
| `Paddle__PriceCoreMonthly` | `pri_…` |
| `Paddle__PriceCoreAnnual` | `pri_…` |
| `Paddle__PriceProMonthly` | `pri_…` |
| `Paddle__PriceProAnnual` | `pri_…` |
| `Paddle__TrialPeriodDays` | `30` |

## Webhook

Paddle notification destination:

`https://{domain}/api/v1/system/paddle/webhook`

Subscribe at least: `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.updated`, `subscription.canceled`.

Pass `custom_data.tenant_id` and `custom_data.tenant_slug` on every checkout transaction (the API does this).

## Default payment link

Paddle allows **one** default payment link per environment (sandbox vs live). It must be the **marketing apex**, not a tenant slug host. After checkout Paddle appends `?_ptxn=txn_…`; Cohestra looks up `custom_data.tenant_id` and redirects to `{slug}.…/dashboard`.

| Environment | Default payment link |
|---|---|
| Local Docker (`PUBLIC_BASE_URL=http://localhost:8088`) | `http://localhost:8088/billing/paddle-return` |
| Production | `https://cohestra.app/billing/paddle-return` |
| nip.io UAT | `https://{ip-dashed}.nip.io/billing/paddle-return` |

Do **not** use `https://localhost:…` (local nginx is HTTP). Do **not** put `{slug}.cohestra.app` or `{slug}.localhost` in this field — every workspace would return to that one slug.

Paddle still **rewrites http localhost success/return URLs to https**. Overlay checkout on local Docker therefore does **not** pass `successUrl` to Paddle.js; `checkout.completed` navigates to `http://{slug}.localhost:8088/dashboard` instead. If a hosted checkout still lands on `https://localhost:8088/billing/paddle-return` (`ERR_SSL_PROTOCOL_ERROR`), open the HTTP tenant URL:

`http://{slug}.localhost:8088/dashboard?billing=success&session_id=txn_…`

Sandbox default payment link can stay `http://localhost:8088/billing/paddle-return` for overlay. For hosted-checkout UAT, point it at the HTTPS ngrok apex (`https://{tunnel}/billing/paddle-return`) so Paddle's TLS rewrite has a real certificate; Cohestra then redirects to `{slug}.localhost`.

Approve the apex domain in Paddle (Request website approval). Production overlay `successUrl` is the tenant dashboard (`https://{slug}.cohestra.app/dashboard`).

API startup logs the exact URL when `Paddle__ApiKey` is set (`Paddle Checkout settings → Default payment link must be …`).

## Story 19.4

After 29.7, run **Paddle billing UAT on droplet** — not Stripe.
