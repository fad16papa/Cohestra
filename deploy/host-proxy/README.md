# Host public reverse proxy — Cohestra UAT hostname

The shared droplet must keep **one** public entry layer on `:80` / `:443`.

Do **not** apply these snippets blindly. First identify who already owns those ports
(`bash deploy/uat-port-audit.sh` on the droplet). Public evidence from outside the
host has shown `nginx/1.27.5` on `129.212.235.2` — that is likely the **existing
application’s** Docker nginx, not a host-installed proxy.

## Allowed change

Add a **new** Cohestra UAT `server_name` / site that proxies to:

```
http://127.0.0.1:8180
```

(`NGINX_HOST_PORT` if the frozen map used a different loopback port.)

## Forbidden

- Changing the existing application’s hostname, routes, ports, network, Postgres, Redis, volumes, or env
- Binding Cohestra nginx to `0.0.0.0:80` or `:443`
- Double TLS (Cohestra nginx stays HTTP; host proxy terminates HTTPS)
- Joining Cohestra containers to the existing application Docker network

## If :80/:443 are owned by the existing app’s Docker nginx

Do not steal those published ports.

Owner-approved options:

1. **Preferred if the existing proxy can add a vhost without changing current routes:** add only the Cohestra hostname server block (examples in this folder) to **that** public proxy.
2. **If no host proxy exists yet:** introducing a host nginx/Caddy in front of both apps requires remapping the existing app off `0.0.0.0:80/443`. That is a **minimal host-level routing addition** and needs explicit owner approval before anyone touches the live stack.

## After the vhost exists

Set Cohestra `.env`:

```
PUBLIC_BASE_URL=https://YOUR-COHESTRA-UAT-HOSTNAME
NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://YOUR-COHESTRA-UAT-HOSTNAME
```

Rebuild `web` so the baked `NEXT_PUBLIC_API_URL` matches.

Paddle webhook path stays:

```
POST /api/v1/system/paddle/webhook
```
