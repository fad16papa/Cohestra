# Epic 19 — additive TLS live PASS + public URL flip

**Live proof HEAD on droplet:** `2496587` apply (HTTP-01 + certbot + Phase 3)
**Repo follow-up HEAD:** flip script (this artifact’s commit)

## Live

`EDGE TLS PROOF: PASS` (7/7) on the shared droplet.

- Leaf `CN=uat.cohestra.app` / SAN `DNS:uat.cohestra.app`
- `https://uat.cohestra.app/ready` 200 + `default-tenant` + `X-Cohestra-Edge-Vhost: uat` + HSTS
- `https://uat.cohestra.app/` 200
- `http://uat.cohestra.app/` → `301 https://uat.cohestra.app/`
- `existing_site_cert=present_untouched`
- existing public `/ready` Healthy
- Cert path `/etc/letsencrypt/live/uat.cohestra.app/` in `lead-generation-crm_certbot_certs`
- zz file still on the existing nginx writable layer — do not `compose up` lead-generation-crm

## Next (owner)

1. `flip-public-base-https.sh` — only three public URL keys; no secret print
2. `uat-compose.sh up -d --build web` then `up -d --no-deps api`
3. Re-prove TLS, `verify-existing-app.sh`, `uat-smoke.sh` against https
4. Keep PR #294 draft. Do not merge. Do not edit `@` / `www`.
