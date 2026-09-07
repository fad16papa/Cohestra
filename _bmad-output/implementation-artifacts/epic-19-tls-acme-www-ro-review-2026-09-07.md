# BMAD review — Epic 19 ACME webroot write path

**HEAD:** `e486454`
**Scope:** `apply-additive-tls.sh` preflight write, diagnose mount flag, isolation contract
**Decision:** PASS (no BLOCKER / MAJOR on this HEAD)

## Live evidence

Owner apply on the shared droplet failed at preflight:

`mkdir: can't create directory '/var/www/certbot/.well-known/': Read-only file system`

Diagnose before apply: `zz_listen_443=no`, `live_cert_uat.cohestra.app=missing`, SNI still `CN=thesocialcollectivesg.com`. Existing site cert untouched. HTTP `/ready` 200 + `default-tenant`. Phase 1 HTTP+ACME vhost installed; apply then stopped. Existing app not recreated.

## Triage

| Sev | Finding | Disposition |
|-----|---------|-------------|
| — | Preflight wrote via `docker exec` on nginx. That container mounts `/var/www/certbot` read-only (standard certbot+nginx). | **Fixed.** Writes use `certbot/certbot --entrypoint sh` on `lead-generation-crm_certbot_www`. |
| MINOR | First apply left HTTP+ACME zz file (no `listen 443`). Correct fail-closed. Re-run apply, do not `apply-additive-vhost.sh`. | Accept. |

## Contract

- Isolation 45/45 PASS.
- Still no `active-ssl.conf` edit, no `compose up`, no `cohestra_uat_certbot_*`.
