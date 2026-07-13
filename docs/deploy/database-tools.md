# pgAdmin & RedisInsight (UAT / production droplet)

Postgres and Redis are **not** exposed on the public internet. They listen on **127.0.0.1** inside the droplet so you can reach them safely with **SSH port forwarding** from your laptop.

Do **not** open ports 5432 or 6379 in the DigitalOcean cloud firewall.

## Prerequisites

- SSH access to the Ubuntu droplet
- `docker compose -f docker-compose.uat.yml ps` shows `postgres` and `redis` healthy
- Credentials from the server `.env` file (`POSTGRES_PASSWORD`, etc.)

## Connect pgAdmin to PostgreSQL

### 1. Open an SSH tunnel (keep this terminal open)

From your **local** machine:

```bash
ssh -N -L 15432:127.0.0.1:5432 root@YOUR_DROPLET_IP
```

Use your droplet user if not `root`. `-N` means no remote shell — only forwarding.

### 2. Register the server in pgAdmin

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `15432` (local tunnel port) |
| Maintenance database | `cohestra` |
| Username | `crm` (or `POSTGRES_USER` from `.env`) |
| Password | `POSTGRES_PASSWORD` from server `.env` |

**SSL mode:** Prefer (or Disable for tunnel-only UAT).

### 3. Verify

Run in pgAdmin query tool:

```sql
SELECT COUNT(*) FROM "AspNetUsers";
```

## Connect RedisInsight to Redis

### 1. Open an SSH tunnel

In a **second** local terminal (or combine tunnels in one SSH command):

```bash
ssh -N -L 16379:127.0.0.1:6379 root@YOUR_DROPLET_IP
```

**Combined tunnel (Postgres + Redis in one SSH session):**

```bash
ssh -N \
  -L 15432:127.0.0.1:5432 \
  -L 16379:127.0.0.1:6379 \
  root@YOUR_DROPLET_IP
```

### 2. Add database in RedisInsight

| Field | Value |
|-------|-------|
| Host | `127.0.0.1` |
| Port | `16379` |
| Database alias | `cohestra-uat` |

No password is configured on the default Redis container (internal Docker network only). The tunnel is your access control.

### 3. What to expect

- **Refresh tokens** — keys used by JWT refresh flow
- **OTP codes** — short-lived operator registration / password-reset codes
- **Rate limit counters** — public registration throttling

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection refused on localhost | SSH tunnel not running, or stack not up on droplet |
| pgAdmin auth failed | Wrong `POSTGRES_PASSWORD` — check server `.env` |
| Tunnel drops when laptop sleeps | Re-run the `ssh -N -L ...` command |
| Port already in use locally | Change `15432` / `16379` to another free local port |

## Security notes

- Never bind Postgres/Redis to `0.0.0.0` on the droplet.
- Never add 5432/6379 to the DigitalOcean firewall inbound rules.
- Rotate `POSTGRES_PASSWORD` if it was ever shared insecurely.
