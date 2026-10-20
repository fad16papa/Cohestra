# Cohestra Production host (Story 46.2)

Dedicated DigitalOcean droplet for Cohestra Production. This is **not** the UAT / `lead-generation-crm` host.

Public facts live in [production-host-inventory.json](./production-host-inventory.json) after provision. That file contains **no** credentials, SSH private keys, API tokens, or application secrets.

## Owner authorization recorded

- `OWNER_GATE droplet_purchase`: APPROVED
- Dedicated Production droplet purchase: APPROVED
- `PRODUCTION CUTOVER: AUTHORIZED` does **not** waive remaining Epic 46 stories
- Production release readiness: **NOT YET COMPLETE**
- Story 46.3 (GitHub Environment `production`, app secrets, CD) is **not** this story
- Owner SSH from a Windows workstation is **not verified**. Cloud Agent SSH is not owner proof.
- DigitalOcean project membership for `Cohestra` is **owner-reported**. The API token used here cannot list projects (`403`). Droplet IDs and IPv4s were re-verified after the reported move.

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
| Inbound | 22/tcp | Approved administration CIDRs only (observed provisioner egress /32s + optional `PRODUCTION_SSH_ALLOWLIST`). Never `0.0.0.0/0` and never a regional AWS range. |
| Inbound | 80/tcp | Public |
| Inbound | 443/tcp | Public |
| Inbound | 5432, 6379, 3000, 8080 | **Forbidden** |

Host `ufw` allows 80/443 publicly and 22/tcp only from the same approved administration CIDRs as the cloud firewall. Postgres/Redis/application ports stay closed even if someone later publishes a Docker host port by mistake.

80/443 are allowed now so Let's Encrypt / HTTP can work in 46.13. No public DNS cutover in 46.2.

## SSH

1. Droplet is created with DigitalOcean account SSH keys plus a session bootstrap key.
2. Key authentication is proven.
3. Then `PasswordAuthentication no` is applied (`deploy/harden-production-host.sh`).
4. Password authentication is proven failed.
5. Private keys are **never** committed. Owners add their own public key in the DigitalOcean control panel if they need SSH after the provisioner session.

### Owner Windows SSH (not yet verified)

The live cloud firewall allows `22/tcp` only from the eight recorded provisioner `/32`s. That is not an owner office or home address. A Cloud Agent login, when it works, is **not** owner access.

Do **not** open `22` to `0.0.0.0/0` or `::/0`.

**Before any allowlist change**, confirm DigitalOcean Recovery Console still opens: Control Panel → Droplets → `cohestra-production` → Access → Launch Droplet Console.

**Owner-supplied facts only (no secrets):**

1. Public IPv4 or a `/24`–`/32` CIDR you will SSH from.
2. An SSH **public** key, or confirmation to keep using the existing DigitalOcean account key named `activitylead@cretivorare.com` (fingerprint `bf:ab:6d:8f:d0:a4:54:9a:86:ac:7f:bc:85:07:8a:8c`).
3. Explicit authorization to add that CIDR to the Production cloud firewall and host `ufw`.

**Windows PowerShell checks (run on the owner PC):**

```powershell
# Public IPv4 to send as a /32 (not a secret)
(Invoke-RestMethod -Uri 'https://ifconfig.me/ip').Trim()

# Expected today: TcpTestSucceeded = False (22 is not allowlisted for your IP)
Test-NetConnection -ComputerName 159.223.55.242 -Port 22

# Expected today: timeout or permission denied. Do not paste private keys.
ssh -o BatchMode=yes -o ConnectTimeout=8 -o PreferredAuthentications=publickey root@159.223.55.242

# Fingerprint only, if a public key already exists
if (Test-Path "$env:USERPROFILE\.ssh\id_ed25519.pub") { ssh-keygen -l -f "$env:USERPROFILE\.ssh\id_ed25519.pub" }
if (Test-Path "$env:USERPROFILE\.ssh\id_rsa.pub") { ssh-keygen -l -f "$env:USERPROFILE\.ssh\id_rsa.pub" }
```

To create a new key on that PC (private key stays local):

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\cohestra-production-owner" -C "owner-windows"
ssh-keygen -l -f "$env:USERPROFILE\.ssh\cohestra-production-owner.pub"
Get-Content "$env:USERPROFILE\.ssh\cohestra-production-owner.pub"
```

Send only the public IPv4/CIDR and the `.pub` line or fingerprint. After you authorize the change, the allowlist update can be applied in a follow-up. It is **not** applied in this verification.

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

The provisioner samples its current public IPv4s because some agent/CI egress paths rotate through a small NAT pool. Each observed address is added as a `/32`. The script refuses `0.0.0.0/0` and `::/0`.
