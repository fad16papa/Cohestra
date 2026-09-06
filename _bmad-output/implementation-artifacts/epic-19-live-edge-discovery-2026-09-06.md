# Epic 19 — live edge discovery (owner droplet)

**Date:** 2026-09-06  
**Clone HEAD on droplet:** `af7eff9`  
**Session:** `root@ubuntu-s-2vcpu-4gb-sgp1` (existing compose lives under `/root/lead-generation-crm`)  
**Command:** `bash deploy/host-proxy/live-19-1.sh discover`  
**Mutation:** none

## Verdicts

| Gate | Result |
|------|--------|
| LIVE EDGE DISCOVERY | **PASS** |
| EXISTING APP BASELINE | **PASS** (6/6) |
| EDGE NETWORK | **NOT YET** — only `lead-generation-crm_default` today |
| BACKUP | **PASS** — `20260906T123448Z` |
| COHESTRA INTERNAL DEPLOYMENT | **NOT YET** |
| HOST PATCH / REBOOT | **DEFERRED** — still do not apt upgrade / reboot |

## Existing nginx (real)

| Field | Value |
|-------|--------|
| Container | `lead-generation-crm-nginx-1` |
| Image | `nginx:1.27-alpine` |
| Restart | `unless-stopped` |
| Compose project | `lead-generation-crm` |
| Compose service | `nginx` |
| Working dir | `/root/lead-generation-crm` |
| Compose file | `/root/lead-generation-crm/docker-compose.uat.yml` |
| Network | `lead-generation-crm_default` only (172.18.0.6) |
| Public ports | `0.0.0.0:80`, `0.0.0.0:443` |
| `nginx -t` | successful |

## Persistence

Single **read-only** bind mount:

`/root/lead-generation-crm/deploy/nginx/active-ssl.conf` → `/etc/nginx/conf.d/default.conf` (`rw=false`)

Certs: Docker volumes `lead-generation-crm_certbot_certs` / `_www` (do not copy keys).

`nginx.conf` includes `/etc/nginx/conf.d/*.conf`. A **second** file `zz-cohestra-uat.conf` is additive. Do **not** edit `active-ssl.conf`. Persist later with a **second** bind mount. Do not recreate the existing stack to add the file.

## Server blocks (existing hostname only)

- `listen 80` / `listen 443 ssl`
- `server_name thesocialcollectivesg.com` (HTTP and HTTPS)
- Upstreams: `lead_crm_web`, `lead_crm_api` on the existing Compose network
- Cert paths (names only): `/etc/letsencrypt/live/thesocialcollectivesg.com/fullchain.pem` (+ key path)
- Also present in live/: `129-212-235-2.nip.io` (do not use / steal)

Reload: `docker exec lead-generation-crm-nginx-1 nginx -s reload`

## Safety

- Do not `compose up` `/root/lead-generation-crm/docker-compose.uat.yml` for Cohestra
- Do not join existing web/api/postgres/redis to `cohestra_uat_edge`
- Do not proxy Cohestra to `127.0.0.1:8180`
- Root session is explained by existing compose under `/root`. Cohestra itself should still be project `cohestra-uat`, not this tree.

## Next

On the same droplet session:

```bash
cd /tmp/cohestra-19
# after pulling the backup/vhost hardening commit if present
bash deploy/host-proxy/live-19-1.sh backup
bash deploy/host-proxy/live-19-1.sh attach
```

No secrets or private keys recorded.
