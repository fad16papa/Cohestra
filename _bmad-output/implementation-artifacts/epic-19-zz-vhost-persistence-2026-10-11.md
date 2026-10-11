# zz-cohestra-uat.conf persistence design — 2026-10-11

**Mutation:** none. Do not recreate `lead-generation-crm-nginx-1` until the owner authorizes a bind.

## What we know without SSH

| Fact | Grade |
|------|--------|
| Live UAT HTTPS works | Confirmed (public probe) |
| Additive vhost path | Confirmed repo: `/etc/nginx/conf.d/zz-cohestra-uat.conf` |
| Existing site bind | Confirmed 2026-09-06 discovery: `/root/lead-generation-crm/deploy/nginx/active-ssl.conf` → `/etc/nginx/conf.d/default.conf` (RO) |
| `include /etc/nginx/conf.d/*.conf` | Confirmed 2026-09-06 |
| `zz` is a **second** bind today | **Unknown** — Cloud Agent cannot `docker inspect` mounts |
| Default assumption until prove | **CONTAINER_ONLY** (writable layer). Recreate (not reload) would drop UAT HTTPS |

Read-only prove (owner, after checkout includes this PR):

```bash
bash deploy/host-proxy/prove-zz-vhost-persist.sh
bash deploy/host-proxy/inspect-existing-nginx.sh
```

Expect `PERSISTENCE=BIND` or `EXPORT_ONLY` or `CONTAINER_ONLY`.

## Durable export / backup (no recreate)

```bash
bash deploy/host-proxy/backup-existing-nginx.sh
bash deploy/host-proxy/persist-cohestra-vhost.sh
# writes ~/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf + stamped copy
bash deploy/host-proxy/verify-existing-app.sh   # must PASS
```

Owner-accepted **conditional workaround** (if they refuse nginx recreate): keep CONTAINER_ONLY or EXPORT_ONLY, **never recreate** the existing nginx container, and re-`docker cp` the export if a recreate ever happens. Record that acceptance in the story file. Until then, durable bind stays BLOCKED for 19.2 close.

## Exact existing nginx Compose change (authorized recreate only)

Live compose (2026-09-06): `/root/lead-generation-crm/docker-compose.uat.yml`, service `nginx`.

Keep **every** existing network and the existing `active-ssl.conf` bind. Add **one** RO bind. Do not change cert/www volume names or published 80/443.

```yaml
# ONLY the nginx service. Do not edit web/api/postgres/redis.
services:
  nginx:
    # keep image, ports 80/443, env, existing volumes, existing networks
    volumes:
      - /root/lead-generation-crm/deploy/nginx/active-ssl.conf:/etc/nginx/conf.d/default.conf:ro
      - /home/deploy/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf:/etc/nginx/conf.d/zz-cohestra-uat.conf:ro
      # keep existing certs / www / any other current mounts verbatim
    networks:
      lead-generation-crm_default: {}
      cohestra_uat_edge:
        aliases: [cohestra-uat-nginx]
# top-level
networks:
  lead-generation-crm_default: {}
  cohestra_uat_edge:
    name: cohestra_uat_edge
    external: true
```

Confirm the live service key and current networks with `inspect-existing-nginx.sh` before editing. If the default network name differs, keep **that** name.

Then the **smallest** recreate (still requires explicit owner authorization):

```bash
# from /root/lead-generation-crm — nginx service only
docker compose -f docker-compose.uat.yml up -d --no-deps --no-recreate postgres web api redis
# nginx only, after backup + export + verify-existing-app PASS + nginx -t on a copied test?
docker compose -f docker-compose.uat.yml up -d --no-deps nginx
```

Prefer **not** `--force-recreate` on the project. If Compose will not pick up a new bind without recreate, that is the authorized nginx-only recreate. Do not compose the Cohestra project as part of this.

Immediately:

```bash
docker exec lead-generation-crm-nginx-1 nginx -t
bash deploy/host-proxy/verify-existing-app.sh
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
bash deploy/host-proxy/prove-zz-vhost-persist.sh   # expect PERSISTENCE=BIND
```

## Outage risk

| Step | Risk | Mitigation |
|------|------|------------|
| Reload | Low | `nginx -t` first |
| Nginx-only recreate | Existing :80/:443 blip; UAT + existing site both hit the same container | Backup; export; keep networks/volumes; prove both hosts; rollback bind |
| Project `--force-recreate` | High — DBs/volumes/routing | **Forbidden** |

## Rollback

1. Remove the zz bind from the existing compose.
2. `up -d --no-deps nginx` with original mounts only (still authorized recreate).
3. `docker cp` the stamped export back into the container if needed for a temporary CONTAINER_ONLY restore.
4. Never delete `lead-generation-crm_certbot_certs` or `live/uat.cohestra.app`.
5. Restore `active-ssl.conf` from `~/cohestra-uat-edge-backups/<utc>/` only if that file changed (it must not).
