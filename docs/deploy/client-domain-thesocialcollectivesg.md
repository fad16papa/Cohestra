# Client domain — thesocialcollectivesg.com

Deploy Activity Lead on the client domain with a **public landing page at `/`** and the **operator app at `/login`, `/register`, `/dashboard`, etc.** — one domain, one droplet, no database wipe.

**Droplet public IP:** `129.212.235.2`  
**Domain:** `thesocialcollectivesg.com` (confirm spelling in GoDaddy)

## URL map (single domain)

| URL | Purpose |
|-----|---------|
| `https://thesocialcollectivesg.com/` | **Marketing landing page** (public) |
| `https://thesocialcollectivesg.com/login` | Operator sign-in |
| `https://thesocialcollectivesg.com/register` | First operator setup |
| `https://thesocialcollectivesg.com/dashboard` | Admin app (after login) |
| `https://thesocialcollectivesg.com/register/{slug}` | Public event registration |

`PUBLIC_BASE_URL` must be **`https://thesocialcollectivesg.com`** (no path suffix).

---

## Phase 1 — GoDaddy DNS

1. GoDaddy → **thesocialcollectivesg.com** → **DNS**
2. Turn **off** domain forwarding for `@` and `www`
3. Remove old A records pointing to GoDaddy parking (`76.223.105.230`, etc.)
4. Add:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `129.212.235.2` |
| A | `www` | `129.212.235.2` |

5. Wait 5–30 minutes, then verify:

```bash
nslookup thesocialcollectivesg.com
# Must show 129.212.235.2
```

---

## Phase 2 — Update droplet `.env`

SSH to the droplet:

```bash
cd ~/lead-generation-crm
git pull
sed -i 's/\r$//' deploy/*.sh
nano .env
```

Add or update:

```bash
# Domain (origin only — no /login suffix)
PUBLIC_BASE_URL=https://thesocialcollectivesg.com
LETSENCRYPT_EMAIL=you@example.com

# Landing page copy (baked into web image at build)
LANDING_SITE_NAME=The Social Collective
LANDING_TAGLINE=Community activities. Meaningful connections.
LANDING_DESCRIPTION=Join our events, register in seconds, and stay connected with the communities you care about.
LANDING_EYEBROW=Singapore · Community events
LANDING_OPERATOR_CTA=Operator sign in
```

**Website Builder (Epic 9):** After the first deploy with the site-page seed, the **published Site Page** in the database is the primary homepage source (`GET /api/v1/public/site`). The `LANDING_*` variables above are **fallback-only** — used to seed a fresh database and as disaster recovery if the Site Page row is missing. Changing homepage copy no longer requires rebuilding the `web` container; use the Website builder (admin) or update `SiteLanding__*` on the **api** service for a fresh seed only.

Ensure nginx can serve HTTP for ACME (if not on HTTPS yet):

```bash
# If nginx crash-loops, use HTTP config first:
NGINX_CONFIG_PATH=./deploy/nginx/app.conf
```

---

## Phase 3 — Deploy (safe — no Postgres wipe)

**Do not run** `docker compose down -v`.

```bash
cd ~/lead-generation-crm

# HTTPS + domain (after DNS propagates)
bash deploy/switch-https-domain.sh thesocialcollectivesg.com you@example.com

# Or if already on nip.io HTTPS, the script above switches cert + PUBLIC_BASE_URL
# Rebuild is included in the script; if you pulled new landing page code first:
docker compose -f docker-compose.uat.yml up -d --build web api nginx
```

What changes:

- Let's Encrypt certificate for `thesocialcollectivesg.com`
- nginx HTTPS config
- `PUBLIC_BASE_URL` in `.env`
- **web** + **api** containers rebuilt

What does **not** change:

- `postgres_data` volume (all clients, activities, operators kept)
- `redis_data`, `campaign_assets_data`

---

## Phase 4 — Verify

```bash
curl -s https://thesocialcollectivesg.com/ready
bash deploy/uat-smoke.sh
```

Browser checks:

| Check | Expected |
|-------|----------|
| `/` | Landing page — **not** auto-redirect to login |
| `/login` | Operator sign-in |
| `/dashboard` | Admin (when signed in) |
| Activity public link | `https://thesocialcollectivesg.com/register/...` |
| Padlock | Valid HTTPS certificate |

---

## Customize landing page text

Edit `.env` landing variables, then rebuild web only:

```bash
docker compose -f docker-compose.uat.yml up -d --build web
```

---

## Certificate renewal

```bash
bash deploy/renew-letsencrypt.sh
```

Optional weekly cron — see `docs/deploy/temporary-https-nipio.md`.

---

## SendGrid email DNS

App domain (A → droplet) is separate from email authentication. Add SendGrid SPF/DKIM in GoDaddy per `docs/deploy/sendgrid-production.md`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Certbot fails | DNS not on droplet yet — recheck `nslookup` |
| Browser padlock error / `curl` empty on `/ready` | nginx still serving old nip.io cert — run `bash deploy/fix-nginx-ssl.sh` on the droplet (after `git pull`) |
| `/` still redirects to login | Rebuild web after `git pull` (landing page is new code) |
| Wrong site name on landing | Set `LANDING_*` in `.env` and rebuild web |
| CORS errors | `PUBLIC_BASE_URL` must match browser URL exactly |
