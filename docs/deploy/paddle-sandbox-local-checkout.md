# Local Paddle checkout (sandbox)

Paddle **always stores Default payment link as HTTPS**. Saving `http://localhost:8088/...` reverts to `https://localhost:8088/...`. Local nginx on 8088 has no TLS, so that URL is `ERR_SSL_PROTOCOL_ERROR`.

Do not fight the HTTP save. Point Paddle at an HTTPS tunnel that already reaches Docker (the same ngrok you use for webhooks).

The return page (`/billing/paddle-return`) only proves Paddle sent you back. The workspace plan updates when Cohestra reads the transaction (checkout-return sync) or when the Paddle webhook arrives. If you land on `/dashboard` without `?billing=success&session_id=txn_…`, Settings → Billing stays **Basic**.

## Recover a checkout that already paid

Open **HTTP** on the tenant host (not `https://localhost`), using the `_ptxn` from the ngrok URL:

```
http://creativorare.localhost:8088/dashboard?billing=success&session_id=txn_YOUR_ID
```

Or Settings → Billing → Refresh billing status. Keep the webhook tunnel running.

Confirm Paddle sandbox **Notifications** still points at the **current** ngrok host (`https://YOUR-NGROK-HOST/api/v1/system/paddle/webhook`). A restarted free ngrok URL will not deliver webhooks until you update it.

## Manual sandbox walk (working return)

1. Docker is up on port 8088 (`PUBLIC_BASE_URL=http://localhost:8088`).
2. Start ngrok at the repo’s HTTP port (example):

   ```bash
   ngrok http 8088
   ```

   Copy the `https://….ngrok-free.dev` origin (no path). If ngrok restarts, the host changes — repeat steps 3–5.

3. Paddle sandbox → **Checkout settings → Default payment link**:

   ```
   https://YOUR-NGROK-HOST/billing/paddle-return
   ```

   Save. HTTPS is required; this host actually has a certificate.

4. Paddle **Notifications** destination (webhook) should be the same host:

   ```
   https://YOUR-NGROK-HOST/api/v1/system/paddle/webhook
   ```

   Edit the destination and subscribe at least:

   - `transaction.completed`
   - `transaction.payment_failed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.past_due`
   - `subscription.activated`

   `transaction.created` is **not** enough. Cohestra ignores it. A Failed log of only that event will never move a workspace off Basic.

   Put the destination secret in `.env` as `Paddle__WebhookSecret` (same value as the Paddle destination secret) and recreate **api**:

   ```bash
   docker compose up -d --force-recreate api
   ```

   If every row is **Failed** after 3 attempts, Paddle never got HTTP 2xx. Click a row and read the response:

   | Response | Meaning |
   |---|---|
   | `403` HTML / ngrok warning | Free ngrok blocked the POST. Keep the tunnel up; paid ngrok or `cloudflared tunnel --url http://localhost:8088` avoids this. |
   | `503` `Paddle webhook secret is not configured` | `Paddle__WebhookSecret` is empty in the API container. |
   | `400` `Invalid Paddle-Signature` | Secret in `.env` does not match this destination. |
   | `502` / timeout | Docker/nginx on 8088 is down, or ngrok is pointing at the wrong port. |

   Probe the tunnel (expect `400 Missing Paddle-Signature` if the API is reachable and the secret is set):

   ```bash
   curl -i -X POST https://YOUR-NGROK-HOST/api/v1/system/paddle/webhook \
     -H "Content-Type: application/json" \
     -d "{}"
   ```

5. Put the origin in `.env` (no trailing slash) and rebuild **web** so overlay `successUrl` matches the dashboard:

   ```bash
   # .env
   NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://YOUR-NGROK-HOST

   docker compose build web --no-cache
   docker compose up -d --force-recreate web
   ```

6. Checkout from the tenant host, not bare localhost:

   `http://creativorare.localhost:8088/billing/checkout?plan=pro&interval=monthly`

7. After pay, Paddle opens `https://YOUR-NGROK-HOST/billing/paddle-return?_ptxn=txn_…`. Cohestra looks up the tenant. If Paddle has activated Core/Pro, you go to the dashboard. If the transaction is still unpaid (`transaction.created` only), you return to Settings → Billing with an incomplete-checkout notice — that is expected, not a successful trial.

Production Default payment link stays `https://cohestra.app/billing/paddle-return`. Do not put a tenant slug in this field.
