# Local Paddle checkout (sandbox)

Paddle **always stores Default payment link as HTTPS**. Saving `http://localhost:8088/...` reverts to `https://localhost:8088/...`. Local nginx on 8088 has no TLS, so that URL is `ERR_SSL_PROTOCOL_ERROR`.

Do not fight the HTTP save. Point Paddle at an HTTPS tunnel that already reaches Docker (the same ngrok you use for webhooks).

## Recover a checkout that already paid

Open **HTTP** on the tenant host (not `https://localhost`):

```
http://creativorare.localhost:8088/dashboard?billing=success&session_id=txn_YOUR_ID
```

Or Settings → Billing → Refresh. Keep the webhook tunnel running.

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

5. Put the origin in `.env` (no trailing slash) and rebuild **web** so overlay `successUrl` matches the dashboard:

   ```bash
   # .env
   NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://YOUR-NGROK-HOST

   docker compose build web --no-cache
   docker compose up -d --force-recreate web
   ```

6. Checkout from the tenant host, not bare localhost:

   `http://creativorare.localhost:8088/billing/checkout?plan=pro&interval=monthly`

7. After pay, Paddle opens `https://YOUR-NGROK-HOST/billing/paddle-return?_ptxn=txn_…`. Cohestra looks up the tenant and sends you to `http://creativorare.localhost:8088/dashboard?billing=success&session_id=txn_…`.

Production Default payment link stays `https://cohestra.app/billing/paddle-return`. Do not put a tenant slug in this field.
