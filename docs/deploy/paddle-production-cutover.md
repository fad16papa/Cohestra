# Paddle production cutover checklist

**Do not execute** without explicit owner approval after UAT / Story 19.4 is accepted.

This is SANDBOX → LIVE. Live credentials are a final production owner gate. Epic 19 UAT must not request them.

## Before cutover

- [ ] Story 19.4 sandbox journey passed on the UAT HTTPS URL  
- [ ] Owner approved live cutover in writing  
- [ ] Live Paddle catalog exists (separate from sandbox). Do not reuse `pri_…` / `pdl_sdbx_…` / `test_…` in production  
- [ ] Postgres dump taken  

## Live values (owner-supplied, droplet `.env` only)

| Key | Live shape |
|-----|------------|
| `Paddle__ApiKey` | live server key — must **not** contain `sdbx` |
| `Paddle__ClientToken` | starts with `live_` |
| `Paddle__WebhookSecret` | secret of the **live** notification destination |
| `Paddle__Environment` | `production` → `https://api.paddle.com/` |
| `Paddle__PriceCoreMonthly` / `Annual` | live `pri_…` |
| `Paddle__PriceProMonthly` / `Annual` | live `pri_…` |

Classify with `bash deploy/classify-paddle-env.sh` — expect LIVE labels, never print values.

## Live notification destination

- URL: `https://<production-host>/api/v1/system/paddle/webhook`  
- Events: `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.activated`  
- Own webhook secret — not the sandbox destination secret  

## Live dashboard

- Default payment link: `https://cohestra.app/billing/paddle-return` (marketing apex, no tenant slug)  
- Website approval requested in Paddle  
- Overlay `successUrl` is the tenant dashboard  

## After env change

```bash
bash deploy/preflight-launch.sh
docker compose -f docker-compose.uat.yml up -d --build
# rebuild web if PUBLIC_BASE_URL / return origin changed
```

- [ ] `classify-paddle-env.sh` shows LIVE API key + `live_` client token  
- [ ] One real or Paddle-approved live checkout verification  
- [ ] Webhook delivery + signature on production URL  
- [ ] Tenant plan/entitlement updates  
- [ ] No secret in `docker compose logs api`  

## Rollback

Restore previous `.env` (sandbox or prior live), rebuild, restore DB dump if subscriptions were written.
