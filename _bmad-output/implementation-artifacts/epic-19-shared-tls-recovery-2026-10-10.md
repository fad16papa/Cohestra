# Shared-site TLS investigation — 2026-10-10

**Model:** Grok 4.6. **Mutation:** none. Do not renew, reload, or edit nginx until the owner authorizes it.

October 10 public probe: Cohestra UAT wildcard is valid; `thesocialcollectivesg.com` leaf expired **2026-10-01**. These are **separate Let's Encrypt lineages** on the same edge container.

## Confirmed lineage (repo + public TLS)

| Item | Existing app | Cohestra UAT |
|------|--------------|--------------|
| Public host | `thesocialcollectivesg.com` | `uat.cohestra.app` + `*.uat.cohestra.app` |
| Edge container | `lead-generation-crm-nginx-1` | same container, **additive** vhost |
| Nginx config | Host bind `active-ssl.conf` → `/etc/nginx/conf.d/default.conf` | `zz-cohestra-uat.conf` only |
| Cert volume | `lead-generation-crm_certbot_certs` | **same volume**, different `live/` name |
| ACME www | `lead-generation-crm_certbot_www` (`/var/www/certbot` **RO** in nginx) | same volume; writes via throwaway `certbot/certbot` |
| Challenge | HTTP-01 webroot (single name) | DNS-01 (`_acme-challenge.uat.cohestra.app`) |
| Public leaf 2026-10-10 | CN `thesocialcollectivesg.com`, notBefore 2026-07-03, **notAfter 2026-10-01** | SAN `uat` + `*.uat`, notBefore 2026-09-14, notAfter 2026-12-13 |
| `/ready` | Healthy **only** with insecure TLS (`curl -k`) | Healthy with normal trust |

Sources: `deploy/host-proxy/README.md`, `apply-additive-tls.sh`, `apply-additive-tls-wildcard.sh`, `diagnose-edge-tls.sh`. Live discovery 2026-09-06.

Do **not** use `cohestra-uat-certbot`, `setup-temporary-https.sh`, or `deploy/renew-letsencrypt.sh` (those target the Cohestra compose certbot profile, not the existing site).

## Why the existing cert failed to renew

**Confirmed:** a 90-day Let's Encrypt cert issued 2026-07-03 was not replaced before 2026-10-01. UAT wildcard issued 2026-09-14 on DNS-01 is independent and still valid.

**Deduced:** HTTP-01 auto-renew for `--cert-name thesocialcollectivesg.com` did not complete for ≥30 days before expiry (LE's usual renew window).

**Hypothesized (needs droplet `certbot certificates` + renewal logs; no SSH this run):**

1. No working renew timer on the shared stack (cron/`certbot renew` compose job stopped).
2. HTTP-01 write failed because nginx mounts ACME www **read-only**; renew must use the **www volume** via a throwaway certbot container, not `docker exec` mkdir.
3. Stale `/etc/letsencrypt/.certbot.lock` (`clear-certbot-lock.sh` exists for this).
4. `active-ssl.conf` ACME location missing or default_server steal (would also break renew).
5. Rate-limit or account/email issue in the shared ACME account (do not print email).

Do not treat UAT DNS-01 success as proof the existing HTTP-01 renew path works.

## Safest renewal (owner-authorized only)

Goal: replace **only** the existing-site lineage. Do not recreate `lead-generation-crm-nginx-1`. Do not edit `active-ssl.conf`. Do not touch `zz-cohestra-uat.conf`. Do not pass `uat.cohestra.app` or `*.uat.cohestra.app` to this certbot run. Do not alter existing DBs/volumes/compose project.

### 0. Read-only diagnose (safe now; still needs SSH)

```bash
# as deploy@droplet, cwd /home/deploy/cohestra
bash deploy/host-proxy/backup-existing-nginx.sh
bash deploy/host-proxy/inspect-existing-nginx.sh
bash deploy/host-proxy/diagnose-edge-tls.sh
bash deploy/host-proxy/verify-existing-app.sh   # expected FAIL today (expired leaf)
```

Inspect lineages without printing account email:

```bash
docker run --rm --entrypoint sh \
  -v lead-generation-crm_certbot_certs:/etc/letsencrypt \
  certbot/certbot:latest \
  -c 'ls /etc/letsencrypt/live; ls /etc/letsencrypt/renewal; echo ---; certbot certificates'
```

Expect a `thesocialcollectivesg.com` live directory **and** a separate `uat.cohestra.app` (or similar) live directory. Stop if those names are collapsed into one lineage.

### 1. Backup / rollback

- Nginx config backup: `~/cohestra-uat-edge-backups/<utc>/` (no keys).
- Rollback if reload breaks routing: restore the copied `*.conf` to the **same host bind** `active-ssl.conf` only if that file was changed (this procedure should not change it). Then `nginx -t` and `nginx -s reload`.
- Cert rollback: do **not** delete `live/uat.cohestra.app`. If the existing lineage is damaged, restore from Let's Encrypt `archive/thesocialcollectivesg.com` previous version **or** re-issue **that cert-name only**.
- Never `docker compose up --force-recreate` the existing project.

### 2. Renew existing cert only (STOP until owner says yes)

```bash
bash deploy/host-proxy/clear-certbot-lock.sh   # only if no certbot container is running

docker pull certbot/certbot:latest
docker run --rm \
  -v lead-generation-crm_certbot_certs:/etc/letsencrypt \
  -v lead-generation-crm_certbot_www:/var/www/certbot \
  certbot/certbot:latest \
  certonly --webroot -w /var/www/certbot \
  --cert-name thesocialcollectivesg.com \
  --keep-until-expiring \
  --non-interactive
```

If certbot asks for domains, they must be **only** the existing site names already on that lineage (typically `thesocialcollectivesg.com`, maybe `www.`). Refuse any prompt that includes `uat.cohestra.app`.

Then **reload, do not recreate**:

```bash
docker exec lead-generation-crm-nginx-1 nginx -t
docker exec lead-generation-crm-nginx-1 nginx -s reload
```

### 3. Independent post-renewal proof

```bash
# Existing site — must verify TLS (no -k)
curl -fsS https://thesocialcollectivesg.com/ready
echo | openssl s_client -servername thesocialcollectivesg.com -connect thesocialcollectivesg.com:443 2>/dev/null \
  | openssl x509 -noout -subject -dates -issuer

# Cohestra UAT — must still be the wildcard lineage
curl -fsS https://uat.cohestra.app/ready
echo | openssl s_client -servername uat.cohestra.app -connect uat.cohestra.app:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
echo | openssl s_client -servername creativorare.uat.cohestra.app -connect creativorare.uat.cohestra.app:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName

bash deploy/host-proxy/verify-existing-app.sh
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
```

PASS only if: existing leaf is trusted and unexpired; UAT SAN still `uat` + `*.uat`; both `/ready` Healthy; `X-Cohestra-Edge-Vhost: uat` on UAT; existing Host still serves the existing app.

## DNS

Do **not** change `thesocialcollectivesg.com` DNS for this renew (HTTP-01 uses the current A record). Do not change `uat` / `*.uat` DNS. UAT wildcard renewal remains DNS-01 and is **out of scope** for this recovery.

## Halt

No certificate, nginx, or DNS change was made in this Cloud Agent environment.
