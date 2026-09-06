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

Do not change existing server blocks, certificates, or the existing hostname.

Story 19.1 may prove HTTP/internal routing. Story 19.2 owns HTTPS for the
Cohestra hostname. Do not disturb the existing app’s TLS.

## After the vhost exists

```
# Story 19.1 may use http:// until 19.2 adds Cohestra TLS on the existing edge.
PUBLIC_BASE_URL=https://YOUR-COHESTRA-UAT-HOSTNAME
NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://YOUR-COHESTRA-UAT-HOSTNAME
EXISTING_APP_PUBLIC_URL=https://thesocialcollectivesg.com
```

Paddle webhook stays `POST /api/v1/system/paddle/webhook`.
