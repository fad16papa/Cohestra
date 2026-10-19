# Cohestra Production host (Story 46.2)

Dedicated DigitalOcean droplet for Cohestra Production. This is **not** the UAT / `lead-generation-crm` host.

Public facts live in [production-host-inventory.json](./production-host-inventory.json) after provision. That file contains **no** credentials, SSH private keys, API tokens, or application secrets.

## Owner authorization recorded

- `OWNER_GATE droplet_purchase`: APPROVED
- Dedicated Production droplet purchase: APPROVED
- `PRODUCTION CUTOVER: AUTHORIZED` does **not** waive remaining Epic 46 stories
- Production release readiness: **NOT YET COMPLETE**
- Story 46.3 (GitHub Environment `production`, app secrets, CD) is **not** this story

## Plan (locked)

| Field | Value |
| --- | --- |
| Provider | DigitalOcean |
| Droplet name | `cohestra-production` |
| Size slug | `s-4vcpu-8gb` |
| RAM / CPU / disk | 8 GiB / 4 vCPU / 160 GiB SSD |
| Image | Ubuntu 24.04 LTS (`ubuntu-24-04-x64`) |
| Region default | `sgp1` |
| Database | OPTION A self-hosted PostgreSQL (not purchased, not public) |
| Compose | `docker-compose.production.yml` / project `cohestra-production` — **not deployed in 46.2** |

UAT public IPv4 (`uat.cohestra.app`) is `129.212.235.2`. Production IPv4 **must** differ.

## Network

DigitalOcean cloud firewall `cohestra-production` (see `deploy/production-firewall.desired.json`):

| Direction | Port | Sources |
| --- | --- | --- |
| Inbound | 22/tcp | Approved administration CIDRs only (provisioner IP + optional `PRODUCTION_SSH_ALLOWLIST`). Never `0.0.0.0/0`. |
| Inbound | 80/tcp | Public |
| Inbound | 443/tcp | Public |
| Inbound | 5432, 6379, 3000, 8080 | **Forbidden** |

Host `ufw` mirrors 22/80/443 only. Postgres/Redis/application ports stay closed even if someone later publishes a Docker host port by mistake.

80/443 are allowed now so Let's Encrypt / HTTP can work in 46.13. No public DNS cutover in 46.2.

## SSH

1. Droplet is created with DigitalOcean account SSH keys plus a session bootstrap key.
2. Key authentication is proven.
3. Then `PasswordAuthentication no` is applied (`deploy/harden-production-host.sh`).
4. Password authentication is proven failed.
5. Private keys are **never** committed. Owners add their own public key in the DigitalOcean control panel if they need SSH after the provisioner session.

## Unattended security updates

Ubuntu `unattended-upgrades` is installed and enabled:

- Daily package list update
- Unattended upgrade of the security pocket
- Autoclean every 7 days
- **No automatic reboot** in 46.2 (the host is not serving Production traffic yet)

Policy files: `/etc/apt/apt.conf.d/20auto-upgrades` and `/etc/apt/apt.conf.d/50unattended-upgrades`.

## What 46.2 does not do

- Does not deploy Cohestra web/api/postgres/redis/nginx/otelcol
- Does not create `.github/workflows/deploy-production.yml`
- Does not create GitHub Environment `production`
- Does not populate `PROD_DROPLET_*` or application secrets
- Does not change DNS or TLS
- Does not enable live Paddle
- Does not modify `.github/workflows/deploy.yml` or `docker-compose.uat.yml`

## Provision

Requires `DIGITALOCEAN_ACCESS_TOKEN` in the environment (not in git):

```bash
bash deploy/provision-production-droplet.sh
bash deploy/validate-production-host.sh
```

Optional extra SSH CIDRs: `PRODUCTION_SSH_ALLOWLIST=203.0.113.10/32,198.51.100.0/24`.
