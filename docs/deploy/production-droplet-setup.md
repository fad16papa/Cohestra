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

## Story 19.4

After 29.7, run **Paddle billing UAT on droplet** — not Stripe.
