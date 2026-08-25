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

Paddle allows **one** default payment link per environment (sandbox vs live). It must be the **marketing apex**, not a tenant slug host. After hosted checkout Paddle appends `?_ptxn=txn_…`; Cohestra looks up `custom_data.tenant_id` and redirects to `{slug}.…/dashboard`.

**Paddle always stores this URL as HTTPS.** Saving `http://localhost:8088/...` will revert to `https://localhost:8088/...` — that is Paddle, not a Cohestra bug. Local nginx has no TLS, so `https://localhost:8088` is `ERR_SSL_PROTOCOL_ERROR`.

Local sandbox: use the **ngrok HTTPS** apex (same tunnel as the webhook) and set `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN`. Step-by-step: [paddle-sandbox-local-checkout.md](./paddle-sandbox-local-checkout.md).

| Environment | Default payment link |
|---|---|
| Local Docker sandbox | `https://{ngrok-host}/billing/paddle-return` |
| Production | `https://cohestra.app/billing/paddle-return` |
| nip.io UAT | `https://{ip-dashed}.nip.io/billing/paddle-return` |

Do **not** put `{slug}.cohestra.app` or `{slug}.localhost` in this field — every workspace would return to that one slug.

If a tab still lands on `https://localhost:8088/billing/paddle-return`, recover with:

`http://{slug}.localhost:8088/dashboard?billing=success&session_id=txn_…`

Approve the production apex in Paddle (Request website approval). Production overlay `successUrl` is the tenant dashboard (`https://{slug}.cohestra.app/dashboard`).

API startup logs the Cohestra apex return path when `Paddle__ApiKey` is set. Sandbox dashboards will still show HTTPS.

## Story 19.4

After 29.7, run **Paddle billing UAT on droplet** — not Stripe.
