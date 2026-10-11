# zz-cohestra-uat.conf persistence design — 2026-10-11

**Mutation:** none this run. Do not recreate `lead-generation-crm-nginx-1` until the owner authorizes a bind.

## Current contract (repo)

| Layer | Behavior |
|-------|----------|
| Live vhost | `/etc/nginx/conf.d/zz-cohestra-uat.conf` inside `lead-generation-crm-nginx-1` |
| Existing site | host bind `active-ssl.conf` → `/etc/nginx/conf.d/default.conf` (do not edit) |
| Export | `persist-cohestra-vhost.sh` → `~/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf` + stamped copy |
| Story 19.2 note | “durable bind mount is a follow-up owner step” |

`docker inspect` bind list is the only way to know if the live vhost is durable. This Cloud Agent cannot SSH. State is **unknown** → treat as **CONTAINER_ONLY** until `prove-zz-vhost-persist.sh` says otherwise.

If CONTAINER_ONLY or EXPORT_ONLY: an nginx **recreate** (not reload) drops Cohestra HTTPS until the file is copied back. Reload and cert renew do **not** require recreate.

## Safe sequence (authorized later)

1. Read-only prove: `bash deploy/host-proxy/prove-zz-vhost-persist.sh` and `inspect-existing-nginx.sh`.
2. Export: `bash deploy/host-proxy/persist-cohestra-vhost.sh`.
3. Backup: `bash deploy/host-proxy/backup-existing-nginx.sh`.
4. Existing-app: `bash deploy/host-proxy/verify-existing-app.sh` must PASS.
5. **STOP.** Adding a bind mount requires recreating **only** the existing nginx container. That is a separate owner authorization. Never `compose up --force-recreate` the existing project. Never touch DBs/volumes.

Authorized bind (existing compose **nginx service only**):

```
# host
/home/deploy/cohestra-uat-edge-backups/persist/zz-cohestra-uat.conf
# container, read-only
/etc/nginx/conf.d/zz-cohestra-uat.conf
```

Preserve every current network (`cohestra_uat_edge` included) and the cert/www volumes. Then:

```bash
docker exec lead-generation-crm-nginx-1 nginx -t
# If the recreate already started the process, prefer:
docker exec lead-generation-crm-nginx-1 nginx -s reload
bash deploy/host-proxy/verify-existing-app.sh
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
bash deploy/host-proxy/prove-zz-vhost-persist.sh   # expect PERSISTENCE=BIND
```

## Rollback

- If `nginx -t` fails **before** recreate: do nothing to the running container.
- If recreate broke routing: remove the new bind from the existing compose, start the previous nginx container/image with the **original** mounts only, `nginx -t`, prove both hosts.
- Restore `active-ssl.conf` from `~/cohestra-uat-edge-backups/<utc>/` only if that file was changed (this procedure must not change it).
- Never delete `lead-generation-crm_certbot_certs` or `live/uat.cohestra.app`.

## Acceptance implication

19.2 TLS can PASS while persistence is CONDITIONAL. Closing 19.2 requires either BIND or an explicit owner note accepting EXPORT_ONLY + “do not recreate nginx.”
