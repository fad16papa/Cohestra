# Cohestra Production host (Story 46.2)

Dedicated DigitalOcean droplet for Cohestra Production. This is **not** the UAT / `lead-generation-crm` host.

Public facts live in [production-host-inventory.json](./production-host-inventory.json) after provision. That file contains **no** credentials, SSH private keys, API tokens, or application secrets.

## Owner authorization recorded

- `OWNER_GATE droplet_purchase`: APPROVED
- Dedicated Production droplet purchase: APPROVED
- `PRODUCTION CUTOVER: AUTHORIZED` does **not** waive remaining Epic 46 stories
- Production release readiness: **NOT YET COMPLETE**
- Story 46.3 (GitHub Environment `production`, app secrets, CD) is **not** this story
- Owner Windows SSH: **owner-reported PASS** on 2026-10-20 (source `116.86.142.14/32`). Cloud Agent SSH is not owner proof.
- DigitalOcean Recovery Console: **owner-reported PASS**. Root console password was rotated after a temporary reset (secret not recorded).
- DigitalOcean project membership for `Cohestra` is **owner-confirmed**. The API token used here cannot list projects (`403`). Droplet IDs and IPv4s remain unchanged after the reported move.

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
| Inbound | 22/tcp | Approved administration CIDRs only (`owner_ssh_cidrs` + recorded sources + optional `PRODUCTION_SSH_ALLOWLIST` + observed provisioner `/32`s). Never `0.0.0.0/0` and never a regional AWS range. |
| Inbound | 80/tcp | Public |
| Inbound | 443/tcp | Public |
| Inbound | 5432, 6379, 3000, 8080 | **Forbidden** |

Host `ufw` allows 80/443 publicly and 22/tcp only from the same approved administration CIDRs as the cloud firewall. `deploy/harden-production-host.sh` validates `PRODUCTION_SSH_SOURCES` (IPv4 `/24`–`/32`, never `0.0.0.0/0` or `::/0`) **before** any UFW mutation. Reconcile is additive and idempotent: it does **not** run `ufw --force reset` or `ufw disable`, it never removes the owner CIDR `116.86.142.14/32` or other already-authorized SSH sources, and a failed UFW command must not leave UFW disabled. Missing, empty, invalid, or world-open sources exit without touching the firewall. Postgres/Redis/application ports stay closed even if someone later publishes a Docker host port by mistake.

80/443 are allowed now so Let's Encrypt / HTTP can work in 46.13. No public DNS cutover in 46.2.

## SSH

1. Droplet is created with DigitalOcean account SSH keys plus a session bootstrap key.
2. Key authentication is proven.
3. Then `PasswordAuthentication no` is applied (`deploy/harden-production-host.sh`).
4. Password authentication is proven failed.
5. Private keys are **never** committed. Owners add their own public key in the DigitalOcean control panel if they need SSH after the provisioner session.

### Owner Windows SSH (owner-reported PASS, 2026-10-20)

Owner-observed from a Windows workstation (not independently reproduced by a Cloud Agent):

- Source IPv4 `116.86.142.14` added as `116.86.142.14/32` on the DigitalOcean cloud firewall for TCP 22.
- The eight existing provisioner SSH `/32`s were preserved.
- Host `ufw` also allowed `116.86.142.14` on TCP 22 and stayed active.
- SSH succeeded with the owner's existing personal Ed25519 key.
- Remote `whoami` = `root`; `hostname` = `cohestra-production`.
- `SSH_CONNECTION` source `116.86.142.14` → dest `159.223.55.242:22`.
- `sshd -T`: `permitrootlogin without-password`, `pubkeyauthentication yes`, `passwordauthentication no`, `kbdinteractiveauthentication no`.
- DigitalOcean Recovery Console authenticated the owner. A temporary root console password was rotated afterward (value not recorded).

`owner_ssh_cidrs` in [production-host-inventory.json](./production-host-inventory.json) is the preserve-list. `deploy/provision-production-droplet.sh` merges those CIDRs on any later reconcile so a rotating provisioner NAT pool cannot drop owner access. Do **not** open `22` to `0.0.0.0/0` or `::/0`. Do not put this residential IP in application secrets or unrelated config.

If the residential IP changes, add a new `/24`–`/32` CIDR to `owner_ssh_cidrs` and the live firewall; do not expand to the public internet.

### Long-term administration (not implemented in 46.2)

Residential owner IPs and Cloud Agent egress NATs both change. The durable approach is a **stable management path** (owner-controlled VPN / WireGuard / Tailscale, or a dedicated jump host with a reserved IPv4) plus DigitalOcean Recovery Console as break-glass. Do not implement that path in Story 46.2.

Story 46.3 Owner Gate B is **blocked** on the same gap: GitHub-hosted `ubuntu-latest` has no deterministic source IP that can traverse this SSH allowlist. Do not open 22 to `0.0.0.0/0` and do not allowlist shared GitHub-hosted runner CIDRs. Recommended later path is a Production-only Tailscale overlay (WireGuard fallback). Investigation: `_bmad-output/implementation-artifacts/investigations/story-46-3-production-actions-network-path.md`. Do not implement overlay, populate `PROD_*`, or dispatch Production from that investigation.

## Unattended security updates

Ubuntu `unattended-upgrades` is installed and enabled:

- Daily package list update
- Unattended upgrade of the security pocket
- Autoclean every 7 days
- **No automatic reboot** in 46.2 (the host is not serving Production traffic yet)

Policy files: `/etc/apt/apt.conf.d/20auto-upgrades` and `/etc/apt/apt.conf.d/50unattended-upgrades`.

Owner MOTD on 2026-10-20 reported **57 available updates, 50 security**. That is pending package metadata / unattended-upgrades backlog on a new host, not proof that unattended-upgrades is disabled. Applying those updates or rebooting is a **separate owner-gated maintenance action**. Do not install or reboot from Story 46.2.

## What 46.2 does not do

- Does not deploy Cohestra web/api/postgres/redis/nginx/otelcol
- Did not create `.github/workflows/deploy-production.yml` (Story 46.3 added the workflow file; Environment `production` is still owner-created)
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

The provisioner merges `owner_ssh_cidrs` and existing `ssh_sources` from inventory, then adds current provisioner `/32`s. It refuses `0.0.0.0/0` and `::/0`. A reconcile must not restore world-open SSH and must not drop recorded owner CIDRs.
