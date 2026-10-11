# Story 19.2 — Wildcard TLS on shared edge

**Status:** review  
**Epic:** 19  
**Branch:** `cursor/epic-19-wildcard-tls-a139`

## Goal

Serve Cohestra UAT securely on the **existing shared droplet edge** (`lead-generation-crm-nginx-1`) for:

- Platform: `uat.cohestra.app`
- Tenants: `*.uat.cohestra.app` (e.g. `creativorare.uat.cohestra.app`)

Without modifying `thesocialcollectivesg.com` server blocks or certificates.

## Architecture (Winston)

```
Internet :443
  → lead-generation-crm-nginx-1
       ├── thesocialcollectivesg.com → existing stack (unchanged)
       └── uat.cohestra.app + *.uat.cohestra.app
             → http://cohestra-uat-nginx:80 (cohestra_uat_edge)
```

- Wildcard Let's Encrypt requires **DNS-01** (`_acme-challenge.uat.cohestra.app`).
- Certificate lineage: separate from existing site; stored in `lead-generation-crm_certbot_certs`.
- Additive vhost only: `zz-cohestra-uat.conf` (never `active-ssl.conf`).
- Persistence: export via `persist-cohestra-vhost.sh`; durable bind mount is a follow-up owner step.

## Repository deliverables

| Script | Purpose |
|--------|---------|
| `apply-additive-tls-wildcard.sh` | HTTP vhost → DNS-01 cert → HTTPS vhost → proof |
| `certbot-dns01-auth-hook.sh` | Owner TXT gate + DNS propagation wait |
| `prove-edge-tls-wildcard.sh` | Platform + tenant TLS/SAN + existing app regression |
| `persist-cohestra-vhost.sh` | Export vhost to host backup path |
| `cohestra-uat-server-names.sh` | Shared `server_name` contract |

## Code fixes (tenant outbound URLs)

- `TenantPublicWebUrlBuilder`: `https://uat.cohestra.app` → `https://{slug}.uat.cohestra.app`
- `buildTenantDashboardUrl`: UAT apex → `{slug}.uat.cohestra.app/dashboard`

## Owner execution (live mutation)

Cloud Agent cannot SSH. On droplet as `deploy`:

```bash
cd /home/deploy/cohestra
git fetch origin cursor/epic-19-wildcard-tls-a139
git checkout cursor/epic-19-wildcard-tls-a139   # or merge PR first
bash deploy/host-proxy/apply-additive-tls-wildcard.sh
# Add GoDaddy TXT record(s) when certbot prints them
bash deploy/host-proxy/flip-public-base-https.sh    # if PUBLIC_BASE_URL still http
bash deploy/uat-compose.sh up -d --build web
bash deploy/uat-compose.sh up -d --no-deps api
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
bash deploy/host-proxy/persist-cohestra-vhost.sh
```

## Acceptance checklist

- [x] `EXISTING APP PRE-TLS BASELINE: PASS` — owner `verify-existing-app.sh` 6/0 on 2026-10-11 (after renew)
- [x] HTTP Host `uat.cohestra.app` + `creativorare.uat.cohestra.app` → Cohestra — public 2026-10-11
- [x] Cert SAN: `uat.cohestra.app` + `*.uat.cohestra.app` — public + owner wildcard proof 9/0
- [x] `https://uat.cohestra.app/ready` Healthy — public + owner
- [x] `https://creativorare.uat.cohestra.app/register/sunday-dragon-highlander-2` renders — public **200** Cohestra chrome (activity archived / unavailable; `og:url` on `*.uat`)
- [x] `https://thesocialcollectivesg.com/ready` Healthy with **trusted** TLS — owner renew 2026-10-11 04:45 GMT; public notAfter 2027-01-09; UAT wildcard **unchanged**
- [x] Tenant URLs emit `*.uat.cohestra.app` not `*.cohestra.app` — `TenantPublicWebUrlBuilder` + live `og:url`
- [x] Security headers verified — owner `verify-security-headers.sh` (inside smoke 10/0) + public singleton headers

Durable `zz-cohestra-uat.conf` bind remains **BLOCKED** (not inspected). Auto-renew timer for the existing site is **designed, not installed**. Tracker stays **review / not done**. See `epic-19-1-19-2-acceptance-2026-10-11.md`.

## Live state at story start (2026-09-12)

| Check | Result |
|-------|--------|
| Platform TLS | PASS (single-name cert, no wildcard SAN) |
| Tenant TLS | FAIL (SNI serves `thesocialcollectivesg.com` cert) |
| DNS | PASS (both A records → 129.212.235.2) |

## Independent public probe (2026-10-08)

Cloud Agent has **no SSH**. Public TLS checks only (no secrets):

| Check | Result |
|-------|--------|
| HTTP Host `uat.cohestra.app` | **301** to HTTPS, `X-Cohestra-Edge-Vhost: uat` |
| Cert SAN | `uat.cohestra.app` + `*.uat.cohestra.app` (notBefore Sep 14 2026, notAfter Dec 13 2026) |
| `https://uat.cohestra.app/ready` | **200** Healthy |
| `https://creativorare.uat.cohestra.app/` | **200**, same wildcard cert, HSTS `max-age=31536000`, CSP includes Paddle **sandbox** origins |
| Tenant SNI | Serves UAT wildcard, not `thesocialcollectivesg.com` |

Owner SSH checkboxes above remain **unchecked**. Tracker stays **review / not done**. This probe does **not** replace `prove-edge-tls-wildcard.sh`, existing-app regression, or BMAD close. Apex `cohestra.app` cert expiry is **unrelated** (shared droplet serves another site cert).

## Renewal

**MANUAL-ACCEPTED** for UAT wildcard until DNS provider automation exists.  
Existing-site HTTP-01 timer: designed in `epic-19-existing-site-http01-renew-timer-2026-10-11.md` — **do not install** without owner authorization.
