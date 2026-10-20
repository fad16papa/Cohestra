---
id: 46.2
key: 46-2-dedicated-production-host-and-network-hardening
title: Dedicated production host and network hardening
status: in-progress
epic: 46
created: 2026-10-19
baseline_commit: 36601be5c0fa25deb801fa27d8a65e67d12e824a
owner_gate: droplet_purchase
owner_gate_status: APPROVED
cutover_authorization: GRANTED
production_release_readiness: NOT_YET_COMPLETE
---

# Story 46.2: Dedicated production host and network hardening

Status: in-progress

## Story

As an **owner**,
I want **a new DigitalOcean droplet that only hosts Cohestra Production**,
so that **UAT and lead-generation-crm never share the Production runtime**.

## Acceptance Criteria

1. **Given** owner approval (`OWNER_GATE droplet_purchase: APPROVED`)
   **When** 46.2 executes
   **Then** a new DigitalOcean Basic droplet exists solely for Cohestra Production
   **And** it is 8 GiB RAM / 4 vCPU / 160 GiB SSD (slug `s-4vcpu-8gb`)
   **And** database option remains OPTION A (self-hosted PostgreSQL later; not purchased managed)
   **And** public identity (name, region, plan, IPv4, image) is recorded without credentials

2. **Given** the existing UAT/CRM host (`uat.cohestra.app` → `129.212.235.2`)
   **When** the Production droplet is inspected
   **Then** its droplet id and public IPv4 are distinct from UAT
   **And** `COHESTRA_SHARED_HOST_UAT` is not set on the Production host
   **And** the story **stops** if isolation cannot be proven

3. **Given** host/network hardening
   **When** the DigitalOcean cloud firewall is applied
   **Then** inbound 22/tcp is source-restricted to approved administration CIDRs
   **And** inbound 80/tcp and 443/tcp are public
   **And** 5432, 6379, 3000, and 8080 are not in the public firewall and are not publicly reachable
   **And** SSH password authentication is disabled **after** SSH key login is proven

4. **Given** unattended updates
   **When** the host is bootstrapped
   **Then** Ubuntu unattended security updates are installed and enabled
   **And** the policy is documented in `docs/deploy/production-host.md`

5. **Given** later stories
   **When** 46.2 completes
   **Then** Cohestra Production application workloads are **not** deployed
   **And** no Production auto-deploy workflow exists
   **And** `.github/workflows/deploy.yml` and `docker-compose.uat.yml` are unchanged
   **And** Production application secrets / GitHub Environment `production` are not populated (46.3)
   **And** live Paddle is not configured
   **And** 46.3 is not started
   **And** cutover authorization does **not** waive remaining Epic 46 gates
   **And** PRODUCTION RELEASE READINESS remains NOT YET COMPLETE

## Tasks / Subtasks

- [x] Task 1: Story + sprint-status + owner-gate record (AC 1, 5)
- [x] Task 2: Firewall/SSH/host contract files (AC 3, 4)
- [x] Task 3: Provision dedicated droplet; prove ≠ UAT (AC 1, 2)
- [x] Task 4: Apply cloud firewall + host sshd/ufw/unattended-upgrades (AC 3, 4)
- [x] Task 5: Public port probes + SSH proofs; sanitized evidence (AC 2, 3)
- [x] Task 6: Deterministic `deploy/validate-production-host.sh` + CI; UAT freeze (AC 5)
- [ ] Task 7: Exact-HEAD code review PASS (BLOCKER=0, MAJOR=0)

## Dev Notes

- Spine: AD-1 dedicated droplet, AD-3 compose already locked in 46.1, AD-5 OPTION A, AD-6 Production CD is 46.3, AD-13 remaining release gates still apply.
- Do **not** run `docker-compose.production.yml` on this host in 46.2.
- Do **not** clone app secrets onto the host. Marker file `/etc/cohestra-production-host` only.
- DIGITALOCEAN_ACCESS_TOKEN and SSH private keys stay in the environment / local agent store. Never commit or print them.
- Approved SSH sources: provisioner public IP plus optional `PRODUCTION_SSH_ALLOWLIST` CIDRs. Do not open 22 to `0.0.0.0/0`.
- Region default: `sgp1` (same region family as UAT docs). Isolation is by droplet id/IP, not by region.
- Stop immediately if the created droplet IP equals UAT `129.212.235.2`.
- Stop if firewall/SSH hardening cannot be proven.
- Stop if credentials would need to be exposed.

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.2
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md` AD-1, FR-2
- `docs/deploy/production-launch-program.md`
- `docker-compose.production.yml` (contract only; do not deploy)

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- `DIGITALOCEAN_ACCESS_TOKEN` presence checked without printing the value: PRESENT
- `doctl account get` authentication: OK (token not printed)
- `bash deploy/provision-production-droplet.sh`: PROVISION_OK droplet_id=610830617 ip=159.223.55.242
- `bash deploy/validate-production-host.sh`: recorded in evidence
- UAT droplet 581334322 / 129.212.235.2 unchanged
- Password SSH: Permission denied (publickey), then key SSH still worked

### Completion Notes List

- Dedicated droplet `cohestra-production` created in sgp1: id 610830617, plan s-4vcpu-8gb (8192/4/160), Ubuntu 24.04, public IPv4 159.223.55.242.
- Host isolation proven: Production IPv4 and droplet id differ from UAT 129.212.235.2 / 581334322. `COHESTRA_SHARED_HOST_UAT` unset. `shared_host_uat=false` on the marker.
- Cloud firewall `cohestra-production` attached only to the Production droplet. 22/tcp from observed provisioner /32s only. 80/443 public. 5432/6379/3000/8080 absent and publicly closed.
- SSH key authentication proven before and after `PasswordAuthentication no`. Password login failed. Private key is not in git.
- unattended-upgrades enabled and active. No automatic reboot in 46.2.
- No Cohestra workloads, no Docker, no Production CD, no DNS mutation, no live Paddle, no GitHub Environment `production`.
- Provisioner fixes required to finish live create: `doctl ssh-key import --public-key-file`, do not persist `IFS=,`, sample provisioner NAT /32s, create `/run/sshd` before `sshd -t`.
- Review hardening: SSH CIDRs must be IPv4 /24-/32; UAT droplet id 581334322 is refused; firewall attach is exclusive and fail-closed; host `ufw` 22 is source-restricted; harden refuses the UAT address; unattended-upgrades enable is fail-closed.
- PRODUCTION RELEASE READINESS remains NOT YET COMPLETE. Do not start 46.3. Do not merge without owner authorization.

### File List

- deploy/provision-production-droplet.sh
- deploy/harden-production-host.sh
- deploy/validate-production-host.sh
- deploy/production-firewall.desired.json
- docs/deploy/production-host.md
- docs/deploy/production-host-inventory.json
- docs/deploy/production-launch-program.md
- .gitignore
- .github/workflows/ci.yml
- _bmad-output/implementation-artifacts/46-2-dedicated-production-host-and-network-hardening.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/evidence/46-2/README.md
- _bmad-output/implementation-artifacts/evidence/46-2/host-hardening.txt
- _bmad-output/implementation-artifacts/evidence/46-2/firewall-live.json
- _bmad-output/implementation-artifacts/evidence/46-2/port-probes.txt
- _bmad-output/implementation-artifacts/evidence/46-2/ssh-proofs.txt
- _bmad-output/implementation-artifacts/evidence/46-2/unattended-updates.txt
- _bmad-output/implementation-artifacts/evidence/46-2/uat-unchanged.txt
- _bmad-output/implementation-artifacts/evidence/46-2/workloads.txt
- _bmad-output/implementation-artifacts/evidence/46-2/dns-unchanged.txt
- _bmad-output/implementation-artifacts/evidence/46-2/secret-scan.txt
- _bmad-output/implementation-artifacts/evidence/46-2/validate-production-host.txt

### Change Log

- 2026-10-20: Provisioned dedicated Production droplet 610830617 and recorded sanitized host evidence.
