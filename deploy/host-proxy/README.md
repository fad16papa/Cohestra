# Shared Docker edge — Cohestra UAT hostname

The public `:80` / `:443` listener on the UAT droplet is **not** host nginx.

Owner-proven edge:

```
Internet
  → 0.0.0.0:80 / :443
  → lead-generation-crm-nginx-1
       ├── existing hostname  → existing web/api   (unchanged)
       └── Cohestra UAT host  → http://cohestra-uat-nginx:80
                                    (Docker DNS on cohestra_uat_edge)
```

Inside `lead-generation-crm-nginx-1`, `127.0.0.1` is **that container**, not the
Ubuntu host. Do **not** `proxy_pass http://127.0.0.1:8180`.

`127.0.0.1:3100` / `:5100` / `:8180` stay Cohestra **host-loopback diagnostics**.
The edge proxy must not use them.

## Networks

| Network | Members |
|---------|---------|
| `cohestra_uat_edge` | `lead-generation-crm-nginx-1` + `cohestra-uat-nginx` **only** |
| `cohestra_uat_internal` | All Cohestra services (nginx, web, api, postgres, redis) |

Cohestra postgres, redis, web, and api must **never** join `cohestra_uat_edge`.
Existing postgres/redis/api/web must **never** join it.

Cohestra nginx alias on the edge network: **`cohestra-uat-nginx`**.

## Attach existing nginx without recreating the live stack

Do **not** `compose up --force-recreate` the existing project just to add a network.

1. Cohestra compose creates `cohestra_uat_edge` (after Cohestra is started, or
   `docker network create cohestra_uat_edge` first).
2. Idempotent attach (no recreate):

   ```bash
   bash deploy/host-proxy/reconcile-edge-network.sh
   ```

3. Persist later by editing the **existing** product’s nginx `networks` map
   and **keeping every network it already has**, plus `cohestra_uat_edge`
   (`external: true`). Do not `compose up` `lead-generation-crm.edge-overlay.yml`
   — it is documentation only and has no `services:` on purpose.

## Live discovery (2026-09-06) — PASS

`lead-generation-crm-nginx-1` is Compose service `nginx` in
`/root/lead-generation-crm/docker-compose.uat.yml`.

- Network today: **`lead-generation-crm_default` only**
- Public: `0.0.0.0:80` / `:443`
- **One** read-only bind:
  `/root/lead-generation-crm/deploy/nginx/active-ssl.conf`
  → `/etc/nginx/conf.d/default.conf`
- `include /etc/nginx/conf.d/*.conf`
- Existing `server_name` is **only** `thesocialcollectivesg.com` (HTTP + HTTPS)
- Certs stay in `lead-generation-crm_certbot_certs` (do not copy keys)
- Reload: `docker exec lead-generation-crm-nginx-1 nginx -s reload`

Do **not** edit `active-ssl.conf`. Add `zz-cohestra-uat.conf` as a second
`conf.d` file (`apply-additive-vhost.sh` after Cohestra is healthy). Persist
later with a **second** bind mount. Never `compose up` the existing project
just to add Cohestra.

## Live phases (on the droplet)

Do **not** `apt upgrade`, `dist-upgrade`, or reboot during Story 19.1.

```bash
# Canonical tree (never deploy permanently from /tmp):
bash deploy/prepare-canonical-checkout.sh
cd /home/deploy/cohestra

bash deploy/host-proxy/live-19-1.sh discover   # read-only
bash deploy/host-proxy/live-19-1.sh backup     # host config copies, no reload
bash deploy/host-proxy/live-19-1.sh attach     # docker network connect + re-verify
```

Backups land in `~/cohestra-uat-edge-backups/` (not git). Cert/key mounts are skipped.

This Cloud Agent cannot SSH (owner key stays on the Windows workstation).
Once `deploy@` is logged in, run the commands above **on the droplet**.

## Existing nginx config

Before any edit: `bash deploy/host-proxy/inspect-existing-nginx.sh` (read-only:
container, ports, networks, mounts, includes, `server_name` / listen / cert
*paths*, persistence). Backup the mounted host Source paths it prints.

Then:

1. Backup the mounted nginx config on the droplet.
2. Add **only** `zz-cohestra-uat.conf` from `cohestra-uat.nginx.example.conf`
   (the `zz-` prefix keeps it from becoming the HTTP default_server).
3. Wait until `cohestra-uat-nginx` is on `cohestra_uat_edge` before `nginx -t`.
4. `docker exec lead-generation-crm-nginx-1 nginx -t`
5. Reload (`nginx -s reload`), not a full-stack restart.
6. `bash deploy/host-proxy/prove-edge-vhost.sh` — Host `uat.cohestra.app` on
   `:80` must return Cohestra `/ready` (`default-tenant`) and
   `X-Cohestra-Edge-Vhost: uat`. A 301 to `https://` or `/ready` without
   `default-tenant` is the existing default_server. Do not change DNS on FAIL.

Do not change existing server blocks, certificates, or the existing hostname.

Story 19.1 may prove HTTP/internal routing. Story 19.2 adds **additive** HTTPS
on the same existing edge container (`apply-additive-tls.sh`): a new Let's
Encrypt name `uat.cohestra.app` in `lead-generation-crm_certbot_certs`, then
`listen 443` in `zz-cohestra-uat.conf` only. Do **not** regenerate
`active-ssl.conf`. Do **not** use the existing site certificate. Do **not**
run `cohestra-uat-certbot` or `setup-temporary-https.sh` on this shared host.
Do not re-run `apply-additive-vhost.sh` after TLS (it would drop `listen 443`).

The existing nginx mounts `/var/www/certbot` **read-only**. ACME writes (preflight
and `certbot`) use `lead-generation-crm_certbot_www` via a throwaway container.
Do not `docker exec` mkdir on that path inside `lead-generation-crm-nginx-1`.

Browser `NET::ERR_CERT_COMMON_NAME_INVALID` + HSTS on `https://uat.cohestra.app`
means `:443` is still the existing default_server cert. HTTP UAT can be fine.
Do not treat the screenshot as TLS PASS. Run
`bash deploy/host-proxy/diagnose-edge-tls.sh` (read-only) then
`apply-additive-tls.sh` as **deploy** from `/home/deploy/cohestra`. Paste the
`EDGE TLS PROOF` lines. If apply refuses ACME contact, set `LETSENCRYPT_EMAIL`
in that shell only — do not paste the email, keys, or `.env` values.

## After the vhost exists

After `EDGE TLS PROOF: PASS`, flip those keys with
`bash deploy/host-proxy/flip-public-base-https.sh` (never prints secrets), then
rebuild **web** and recreate **api** via `uat-compose.sh`. Do not compose the
existing app.

```
# Locked UAT hostname: uat.cohestra.app. Apex cohestra.app stays reserved.
PUBLIC_BASE_URL=https://uat.cohestra.app
NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://uat.cohestra.app
EXISTING_APP_PUBLIC_URL=https://thesocialcollectivesg.com
```

Do not point GoDaddy A records at `129.212.235.2` until the additive vhost exists
(parking IPs today). Then only the UAT hostname:

| Type | Name | Value |
|------|------|-------|
| A | `uat` | `129.212.235.2` |

Do not point apex `@` or `www` at UAT. Apex `cohestra.app` stays reserved.
Do not change `thesocialcollectivesg.com` DNS.

Paddle webhook stays `POST /api/v1/system/paddle/webhook`.
