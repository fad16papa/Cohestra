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

## UAT / production

```bash
docker compose -f docker-compose.uat.yml up -d --build
```

Set `PUBLIC_BASE_URL` to the URL operators use in the browser, e.g.:

- No domain yet: `http://YOUR_DROPLET_IP`
- With domain: `https://uat.example.com`

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

## Legacy host nginx

`uat.conf` was for nginx installed on the Ubuntu host. **Prefer the Docker nginx service** so local and production match.
