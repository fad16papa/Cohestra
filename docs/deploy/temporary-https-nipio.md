# Temporary HTTPS with nip.io + Let's Encrypt

Use this when you **do not have a client domain yet** but need real HTTPS on the droplet (clipboard, `crypto.randomUUID`, secure cookies, SendGrid link trust).

**Safe for existing deploys** — this only adds certificate volumes and switches nginx config. It does **not** remove Postgres, Redis, or campaign asset data.

## How it works

1. **nip.io** resolves `129-212-235-2.nip.io` → `129.212.235.2` (dots in IP become hyphens).
2. **Let's Encrypt** validates domain ownership via HTTP on port 80 (`/.well-known/acme-challenge/`).
3. nginx serves HTTPS on 443 with the issued certificate.
4. `PUBLIC_BASE_URL` is set to `https://129-212-235-2.nip.io` and web/API are rebuilt for CORS and baked-in URLs.

```
Browser → https://129-212-235-2.nip.io
       → nginx (443, TLS)
       → web / api (unchanged internally)
```

## Prerequisites

- Stack already deployed and reachable on **HTTP port 80** from the internet.
- DigitalOcean cloud firewall (if used) allows **inbound 80 and 443**.
- `.env` on the droplet with secrets already configured.

## One-time setup (on droplet)

```bash
cd ~/lead-generation-crm
git pull

# Fix CRLF on Windows-edited scripts if smoke/deploy fails:
sed -i 's/\r$//' deploy/*.sh

# Add Let's Encrypt contact email to .env
nano .env
# LETSENCRYPT_EMAIL=you@example.com

bash deploy/setup-temporary-https.sh
```

The script will:

1. Start nginx with ACME webroot on port 80.
2. Obtain a certificate for `129-212-235-2.nip.io` (auto-derived from public IP).
3. Generate `deploy/nginx/active-ssl.conf` from the template.
4. Set `PUBLIC_BASE_URL=https://129-212-235-2.nip.io` in `.env`.
5. Rebuild `web` and `api`, restart nginx.

## Verify

Open in browser:

```text
https://129-212-235-2.nip.io/
https://129-212-235-2.nip.io/ready
```

Run smoke checks:

```bash
bash deploy/uat-smoke.sh
```

Test registration submit, copy public link, and OTP email flows under HTTPS.

## Certificate renewal

Let's Encrypt certs expire every ~90 days. Renew manually or add a weekly cron:

```bash
# Manual
bash deploy/renew-letsencrypt.sh

# Cron (root crontab on droplet) — Sundays 03:00
0 3 * * 0 cd /root/lead-generation-crm && bash deploy/renew-letsencrypt.sh >> /var/log/letsencrypt-renew.log 2>&1
```

Adjust path if the repo lives elsewhere (e.g. `/home/deploy/lead-generation-crm`).

## Switch to client domain later

When DNS is ready:

1. Create **A record**: `uat.client.com` → droplet IP.
2. Run:

```bash
bash deploy/switch-https-domain.sh uat.client.com you@client.com
```

3. Share the new HTTPS URL with the client. Old nip.io cert can remain on disk; nginx uses the new domain from `active-ssl.conf`.

## Roll back to HTTP (emergency only)

If HTTPS misbehaves and you need the app back on HTTP quickly:

```bash
cd ~/lead-generation-crm
sed -i 's|^NGINX_CONFIG_PATH=.*|NGINX_CONFIG_PATH=./deploy/nginx/app.conf|' .env
sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=http://YOUR_DROPLET_IP|' .env
docker compose -f docker-compose.uat.yml up -d --build web api nginx
```

Replace `YOUR_DROPLET_IP` with the droplet public IP. Data volumes are untouched.

### After `docker compose down -v` (volumes wiped)

`down -v` deletes **postgres**, **redis**, **certbot certs**, and **campaign assets** volumes. If `.env` still has `NGINX_CONFIG_PATH=./deploy/nginx/active-ssl.conf`, nginx will **crash-loop** because TLS files no longer exist.

**Recovery:**

```bash
cd ~/lead-generation-crm

# 1. HTTP nginx first (fixes restart loop)
sed -i 's|^NGINX_CONFIG_PATH=.*|NGINX_CONFIG_PATH=./deploy/nginx/app.conf|' .env
docker compose -f docker-compose.uat.yml up -d nginx

# 2. Re-create operator at /register (database was wiped)
# 3. Re-issue HTTPS cert
bash deploy/setup-temporary-https.sh
```

Certbot showing `Exited (1)` on `docker compose up -d` is normal — it only runs via `run certonly` / `renew`, not as a daemon.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Certbot "Connection refused" | Port 80 not reachable — check DO firewall / `ufw` |
| Certbot "Invalid response" | nginx not serving ACME path — ensure `app.conf` has `/.well-known/acme-challenge/` |
| Browser shows wrong API / CORS | `PUBLIC_BASE_URL` must match browser URL exactly — rerun setup or rebuild web |
| 502 after SSL switch | `docker compose -f docker-compose.uat.yml logs nginx api web` |
| Script `set: pipefail` error | Run `sed -i 's/\r$//' deploy/*.sh` |

## Related

- [digitalocean-uat.md](./digitalocean-uat.md) — full droplet deploy
- [deploy/nginx/README.md](../../deploy/nginx/README.md) — routing reference
