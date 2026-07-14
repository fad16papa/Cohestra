# DigitalOcean UAT deployment (Ubuntu + Docker)

Deploy Activity Lead to a single DigitalOcean droplet for client UAT or production. Stack: **nginx (Docker) → Next.js + ASP.NET Core API → PostgreSQL + Redis**, all via Docker Compose.

## Recommended droplet

| Setting | Recommendation |
|---------|----------------|
| OS | Ubuntu 22.04 or 24.04 LTS |
| Size | **2 GB RAM / 1 vCPU** minimum (4 GB recommended for campaigns + builds) |
| Region | Closest to operators (Philippines → Singapore or Bangalore) |
| Backups | Enable weekly droplet backups before UAT |

## Architecture on the droplet

```
Internet (:80 HTTP, :443 when TLS is configured)
    │
    ▼
nginx container (deploy/nginx/app.conf)
    ├── /          → web:3000   (Next.js)
    └── /api/*     → api:8080   (ASP.NET Core)
                          │
                    postgres + redis (Docker network)
                    also bound to 127.0.0.1:5432 / :6379 for SSH tunnels
```

**Local dev uses the same nginx routing** — only `docker-compose.yml` vs `docker-compose.uat.yml` differs (secrets, Production env, port binds).

Postgres and Redis are **not** on the public internet. Use **[SSH tunnels for pgAdmin & RedisInsight](./database-tools.md)**.

## 1. DNS (optional until you have a domain)

**No domain yet:** set `PUBLIC_BASE_URL=http://YOUR_DROPLET_IP` and open the app at `http://YOUR_DROPLET_IP`.

**With a domain:** create an **A record**, e.g. `uat.creativorare.com` → droplet public IP. Then set `PUBLIC_BASE_URL=https://your-domain` after TLS is configured.

## 2. DigitalOcean cloud firewall

Create or attach a firewall with **inbound** rules only for:

| Port | Purpose |
|------|---------|
| 22 | SSH |
| 80 | HTTP (Docker nginx) |
| 443 | HTTPS (when TLS certs are mounted) |

Do **not** open 5432, 6379, 3000, or 8080 publicly.

## 3. Server bootstrap

SSH into the droplet:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

git clone <your-repo-url> cohestra
cd cohestra
bash deploy/uat-bootstrap.sh
```

The bootstrap script installs Docker (if missing), copies `.env.uat.example` → `.env`, and starts the stack **including nginx**.

## 4. Configure secrets

Edit `.env` on the server:

```bash
nano .env
```

Required values:

| Variable | Notes |
|----------|-------|
| `PUBLIC_BASE_URL` | Browser URL — `http://DROPLET_IP` or `https://your-domain` |
| `POSTGRES_PASSWORD` | Strong random password |
| `JWT_SIGNING_KEY` | At least 32 characters (`openssl rand -base64 48`) |
| `SendGrid__ApiKey` | Live Mail Send API key ([setup guide](./sendgrid-production.md)) |
| `SendGrid__FromEmail` | Verified sender — campaigns (default: `noreply@cohestra.app`) |
| `SendGrid__FromName` | Display name (default: Cohestra) |

Optional:

| Variable | Notes |
|----------|-------|
| `NGINX_HTTP_PORT` | Default `80` — change if port conflict |
| `SendGrid__RegistrationFromEmail` | OTP / registration mail |
| `EmailBranding__WebsiteUrl` | Footer link in emails |
| `LANDING_*` / `NEXT_PUBLIC_LANDING_*` | **Fallback-only** — seeds a fresh Site Page on first deploy and powers env landing when no published site exists. After Epic 9, edit homepage copy in **Website builder**; do not rebuild `web` for copy changes. See also `SiteLanding__*` on the **api** service in `docker-compose.uat.yml`. |

**Website Builder (Epic 9):** After the site-page seed runs, `GET /api/v1/public/site` is the primary homepage source. `LANDING_*` variables are fallback-only for disaster recovery or fresh databases — not the normal operator workflow.

**Operator account:** seeding is **disabled**. Create the single operator at `${PUBLIC_BASE_URL}/register` (email + OTP verification).

Generate secrets:

```bash
openssl rand -base64 24   # postgres
openssl rand -base64 48   # JWT
```

Rebuild after changing `PUBLIC_BASE_URL` (baked into the web image):

```bash
docker compose -f docker-compose.uat.yml up -d --build web
```

## 5. Verify nginx (Docker)

No host nginx install required. Config lives at `deploy/nginx/app.conf`.

```bash
curl -sI http://YOUR_DROPLET_IP/ | head -3
curl -s http://YOUR_DROPLET_IP/ready
docker compose -f docker-compose.uat.yml logs nginx
```

## 6. HTTPS

### Option A — Temporary (no client domain)

Use **nip.io** so Let's Encrypt can issue a cert for `129-212-235-2.nip.io` (hyphens instead of dots in your IP):

```bash
# Add to .env: LETSENCRYPT_EMAIL=you@example.com
bash deploy/setup-temporary-https.sh
```

Full guide: **`docs/deploy/temporary-https-nipio.md`**. Does not wipe database or uploads.

### Option B — Client domain

When DNS is ready:

```bash
bash deploy/switch-https-domain.sh uat.creativorare.com you@example.com
```

1. Point DNS **A record** to the droplet
2. Run the script above (or follow **`deploy/nginx/README.md`**)
3. Use `https://your-domain` in the browser — `PUBLIC_BASE_URL` is updated automatically

Until HTTPS is configured, HTTP on port 80 works for IP-based UAT (with browser limitations on clipboard / UUID).

## 7. Smoke test

On the server:

```bash
bash deploy/uat-smoke.sh
PUBLIC_BASE_URL=http://YOUR_DROPLET_IP bash deploy/uat-smoke.sh
```

Manual browser checks:

1. Open `${PUBLIC_BASE_URL}/` — redirects to `/register` (first setup) or `/login`
2. Complete operator registration + email OTP
3. Dashboard loads metrics
4. Create/publish a test activity
5. Public registration link works on mobile
6. Settings → Email delivery checklist green
7. Optional: send test campaign after SendGrid DNS is complete

## 8. pgAdmin & RedisInsight (from your laptop)

See **[database-tools.md](./database-tools.md)** for SSH tunnel commands and connection settings.

## 9. SendGrid (required)

Complete **[SendGrid production setup](./sendgrid-production.md)** before handoff.

Sandbox is **disabled** on this deploy. The API will not start in Production without valid SendGrid config.

## 10. Operations

### Logs

```bash
docker compose -f docker-compose.uat.yml logs -f nginx api web
```

### Restart / update

```bash
docker compose -f docker-compose.uat.yml up -d
# Rebuild web if PUBLIC_BASE_URL changed:
docker compose -f docker-compose.uat.yml up -d --build web

# New release:
git pull
docker compose -f docker-compose.uat.yml up -d --build
```

Migrations apply automatically on API startup.

### Backup Postgres

```bash
docker compose -f docker-compose.uat.yml exec postgres \
  pg_dump -U crm cohestra > backup-$(date +%F).sql
```

## 11. Security checklist

- [ ] `.env` not committed to git
- [ ] Unique `JWT_SIGNING_KEY` per environment
- [ ] Postgres/Redis not in public firewall (only 127.0.0.1 on droplet)
- [ ] Only nginx ports 80/443 exposed publicly
- [ ] HTTPS enabled before sharing URL widely (when domain available)
- [ ] SendGrid API key only on server
- [ ] `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` (defaults in compose)
- [ ] Single operator created via `/register`, not dev credentials

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (nginx on `:80`, same routing as prod) |
| `docker-compose.uat.yml` | UAT / production-style (Production env, secrets required) |

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login works but API calls fail CORS | `PUBLIC_BASE_URL` mismatch — must match browser URL exactly |
| Web calls wrong API | Rebuild web with correct `PUBLIC_BASE_URL` build arg |
| `/ready` unhealthy | Postgres or Redis down — `docker compose ... ps` and logs |
| Campaigns fail | SendGrid config — see [sendgrid-production.md](./sendgrid-production.md) |
| 502 from nginx | web/api containers down — `docker compose ... logs web api` |
| pgAdmin cannot connect | SSH tunnel not running — [database-tools.md](./database-tools.md) |

## Related docs

- [deploy/nginx/README.md](../../deploy/nginx/README.md) — routing, port overrides, HTTPS
- [github-actions-cd.md](./github-actions-cd.md) — CI/CD to droplet
- [UAT polish checklist](./uat-polish-checklist.md)
- [database-tools.md](./database-tools.md) — pgAdmin & RedisInsight
- [sendgrid-production.md](./sendgrid-production.md)
- [README](../../README.md) — local development
