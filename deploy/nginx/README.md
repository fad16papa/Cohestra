# nginx (Docker)

The stack exposes **one public entry point** through an nginx container — the same routing for local Compose and UAT/production.

## Routes

| Path | Backend |
|------|---------|
| `/` | Next.js (`web:3000`) |
| `/api/*` | API (`api:8080`) |
| `/health`, `/ready` | API |
| `/openapi/*` | API |

## Local development

Cohestra Docker project: **`cohestra-infra`** (set in `docker-compose.yml`). Independent from **lead-generation-crm**.

```bash
docker compose up --build
```

Open **http://localhost** (nginx on port 80). Set `PUBLIC_BASE_URL=http://localhost` in `.env` if you override defaults.

Docker Desktop links:

| Service | Direct URL | Notes |
|---------|------------|--------|
| **nginx** | http://localhost | **Use this** — same routing as UAT |
| **web** | http://localhost:3000 | Next.js only (no `/api` proxy) |
| **api** | http://localhost:8080/ready | API only |

If port 80 is in use (common on Windows), set in `.env`:

```bash
NGINX_HTTP_PORT=8088
PUBLIC_BASE_URL=http://localhost:8088
```

Then rebuild web after changing `PUBLIC_BASE_URL`:

```bash
docker compose up -d --build web
```

## UAT / production (shared droplet)

Compose project **`cohestra-uat`** publishes Cohestra nginx on **`127.0.0.1:8180` only**
(diagnostics). Public `:80` / `:443` belong to **`lead-generation-crm-nginx-1`**.
That container must proxy the Cohestra hostname to **`http://cohestra-uat-nginx:80`**
on `cohestra_uat_edge`. See `deploy/host-proxy/`. Do not use `127.0.0.1:8180` from
inside the existing nginx container.

```bash
bash deploy/uat-port-audit.sh
bash deploy/validate-uat-isolation.sh
bash deploy/uat-compose.sh up -d --build
```

Set `PUBLIC_BASE_URL` to the **Cohestra UAT hostname**, not the existing application host.

Do not run `setup-temporary-https.sh` / `switch-https-domain.sh` on the shared droplet
(`COHESTRA_SHARED_HOST_UAT` defaults to true).

## Temporary HTTPS (no client domain yet)

Use **nip.io + Let's Encrypt** for a real certificate without buying a domain:

```bash
# On droplet — add LETSENCRYPT_EMAIL to .env first
bash deploy/setup-temporary-https.sh
```

See **`docs/deploy/temporary-https-nipio.md`** for full steps, renewal, and rollback.

Files:

| File | Purpose |
|------|---------|
| `app.conf` | HTTP only + ACME webroot (before cert / renewal) |
| `app-ssl.conf.template` | HTTPS template — `__DOMAIN__` replaced at setup |
| `active-ssl.conf` | Generated active config (gitignored) |

## HTTPS with client domain

When DNS points to the droplet:

```bash
bash deploy/switch-https-domain.sh uat.example.com you@example.com
```

Legacy manual notes: `ssl.conf.example` (host-mounted certs) — prefer the Certbot flow above.

## Host public reverse proxy (shared droplet)

`deploy/host-proxy/` has **example** vhosts that proxy a new Cohestra hostname to
`http://cohestra-uat-nginx:80` on `cohestra_uat_edge`. Do not replace the
existing application’s server block.

## Legacy host nginx

`uat.conf` was for nginx installed on the Ubuntu host when Cohestra owned `:80`.
On the shared droplet that model is retired.
