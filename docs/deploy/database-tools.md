# pgAdmin & RedisInsight (UAT / production droplet)

Cohestra Postgres and Redis are **not** published on the host. They listen only on the
`cohestra_uat_internal` Docker network (`postgres:5432`, `redis:6379`).

Do **not** open ports 5432 or 6379 in the DigitalOcean cloud firewall.
Do **not** add `5432:5432` or `6379:6379` to `docker-compose.uat.yml`.

## CLI on the droplet (preferred)

```bash
bash deploy/uat-compose.sh exec postgres \
  psql -U crm -d cohestra

bash deploy/uat-compose.sh exec redis redis-cli ping
```

Backup:

```bash
bash deploy/uat-compose.sh exec postgres \
  pg_dump -U crm cohestra > backup-$(date +%F).sql
```

## pgAdmin via SSH (container IP, no host publish)

The host can reach the container address on the Cohestra network. Resolve it on the
droplet, then tunnel to that IP.

On the droplet:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cohestra-uat-postgres
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cohestra-uat-redis
```

From the laptop (replace the IPs):

```bash
ssh -N \
  -L 15432:COHESTRA_POSTGRES_IP:5432 \
  -L 16379:COHESTRA_REDIS_IP:6379 \
  DEPLOY_USER@YOUR_DROPLET_IP
```

Then in pgAdmin: Host `localhost`, Port `15432`, database `cohestra`, user `crm`,
password from the Cohestra `.env` (`POSTGRES_PASSWORD`).

RedisInsight: `127.0.0.1:16379`. Default Redis has no password; the SSH session is
the access control.

Do not point these tunnels at the **existing application’s** Postgres/Redis.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection refused | Isolated stack not up, or you tunneled to a host port that no longer exists |
| Wrong database | Confirm container name `cohestra-uat-postgres`, project `cohestra-uat` |
| pgAdmin auth failed | Wrong `POSTGRES_PASSWORD` — Cohestra `.env` only |
| Tunnel drops when laptop sleeps | Re-run the `ssh -N -L ...` command |

## Security notes

- Never bind Cohestra Postgres/Redis to `0.0.0.0`.
- Never add 5432/6379 to the DigitalOcean firewall inbound rules.
- Never reuse the existing application’s volume or credentials.
- Rotate `POSTGRES_PASSWORD` if it was ever shared insecurely.
