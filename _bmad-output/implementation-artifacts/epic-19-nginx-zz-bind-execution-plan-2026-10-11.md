# zz-cohestra-uat.conf RO bind — authorized execution only

**Do not run this plan until the owner explicitly authorizes an nginx-only change.**  
Live 2026-10-11 ~09:26: `PERSISTENCE=EXPORT_ONLY`. Export already exists.

## Preserve exactly

| Item | Live value — do not “improve” |
|------|-------------------------------|
| Container | `lead-generation-crm-nginx-1` |
| Compose | `/root/lead-generation-crm/docker-compose.uat.yml` service `nginx` |
| Public ports | host `0.0.0.0:80` / `:443` |
| Existing bind | `/root/lead-generation-crm/deploy/nginx/active-ssl.conf` → `/etc/nginx/conf.d/default.conf` (ro) |
| Certs / ACME www | existing volume names (`lead-generation-crm_certbot_certs`, `lead-generation-crm_certbot_www`) |
| Networks | `lead-generation-crm_default` **and** `cohestra_uat_edge` |
| `cohestra_uat_edge` aliases on this container | **`[]` (empty)** — do not add `cohestra-uat-nginx` here. That alias belongs to `cohestra-uat-nginx`. |
| Existing `server_name` | `thesocialcollectivesg.com` only in `default.conf` |
| UAT vhost | additive `zz-cohestra-uat.conf` only |

## Preconditions

1. `bash deploy/host-proxy/backup-existing-nginx.sh`
2. Export already at `/home/deploy/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf` (09:26 snapshot `…20261011T092550Z`)
3. `bash deploy/host-proxy/verify-existing-app.sh` → 6/0
4. `docker exec lead-generation-crm-nginx-1 nginx -t` already ok
5. Written owner authorization for **nginx-only** recreate

## Smallest change

On the **existing** compose nginx service, add **one** read-only bind. Keep every current volume and both networks. Do not edit web/api/postgres/redis.

```yaml
      - /home/deploy/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf:/etc/nginx/conf.d/zz-cohestra-uat.conf:ro
```

Then, from `/root/lead-generation-crm`:

```bash
docker compose -f docker-compose.uat.yml up -d --no-deps --no-recreate postgres web api redis
docker compose -f docker-compose.uat.yml up -d --no-deps nginx
```

Prefer **not** `--force-recreate` on the project. If Compose will not attach the new bind without recreating nginx, that nginx-only recreate is the authorized mutation.

## Prove immediately

```bash
docker exec lead-generation-crm-nginx-1 nginx -t
bash deploy/host-proxy/verify-existing-app.sh
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
bash deploy/host-proxy/prove-zz-vhost-persist.sh   # expect PERSISTENCE=BIND
```

## Rollback

1. Remove the zz bind from the existing compose.
2. `up -d --no-deps nginx` with original mounts only (still authorized).
3. If UAT HTTPS is gone: `docker cp` the stamped export back into `/etc/nginx/conf.d/zz-cohestra-uat.conf` and `nginx -t` + reload (CONTAINER_ONLY restore).
4. Never delete `lead-generation-crm_certbot_certs` or `live/uat.cohestra.app`.
5. Restore `active-ssl.conf` from `~/cohestra-uat-edge-backups/<utc>/` only if that file changed (it must not).

## Owner-accepted EXPORT_ONLY alternative

If the owner refuses nginx recreate: write in the 19.2 story file that EXPORT_ONLY is accepted, **never recreate** `lead-generation-crm-nginx-1`, and re-`docker cp` the export if a recreate ever happens. That is the only other 19.2 persistence close path.
