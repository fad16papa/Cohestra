# Story 46.3 Docker bootstrap security review (Grok 4.6)

HEAD under review: this follow-up PR
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, deployment-security
Date: 2026-10-24 (Asia/Singapore)
Model routing: Grok 4.6 exclusively

## Verdict

BLOCKERS = 0
MAJORS = 0

## Blind Hunter

| Attack | Result |
| --- | --- |
| Fake Docker repository | Apt sources must be `https://download.docker.com/linux/ubuntu` with `Signed-By`. `get.docker.com`, `http://`, or any `*docker*` source that fails that check REFUSE. Tests cover `COHESTRA_TEST_BAD_REPO`. |
| Compromised signing key | Downloaded key fingerprint must equal `9DC858229FC7DD38854AE2D88D81803C0EBFCD88`. Mismatch deletes the keyring and REFUSE. Tests cover a replaced fingerprint. |
| `curl \| sh` | Script downloads the official GPG file with `curl -fsSL --proto '=https' --tlsv1.2` to a path. Tests fail if `curl\|sh`, `wget\|sh`, or `get.docker.com` appear. |
| Unintended Snap install | Live `snap list docker` REFUSE. Test flag `COHESTRA_TEST_SNAP_DOCKER` REFUSE. No `snap install docker`. |
| docker group privilege escalation | No `usermod` / `gpasswd` / `newgrp`. Existing `deploy` membership in `docker` REFUSE. Output always `DEPLOY_USER_IN_DOCKER_GROUP=false`. |
| Docker socket chmod | No `chmod`/`chown` of `docker.sock`. After install, mode must be `660` or `600`, owner `root`, group `docker` or `root`. |
| TCP Docker API exposure | Existing `daemon.json` with `tcp://`, `2375`, `2376`, or `hosts` REFUSE. Live `ss` listener on 2375/2376 REFUSE. Script does not write `daemon.json`. |
| UAT substitution | Hostname containing `uat`/`UAT` REFUSE. UAT IPv4 `129.212.235.2` REFUSE. Wrong hostname REFUSE. Test harness cannot target `/home/deploy`. |
| Existing foreign containers | Any `docker ps -aq` result REFUSE. UAT/production compose networks REFUSE. |
| Accidental `compose up` | Script never invokes `compose up` / `docker run` / `docker start`. `production-compose.sh config` is the only compose call. Tests fail if those commands appear and prove `config` does not call `up`. |
| Database startup/mutation | No `psql`, `pg_*`, migrate, or compose service start. Dummy env for `config` is process-only and never written to `.env`. |
| Firewall mutation | No `ufw`, `iptables`, `nft`, `tailscale`, or `sshd` changes. |
| Secret leakage | No secrets embedded. Compose config output is redacted by `production-compose.sh`. Versions recorded as CLI name strings only. |
| Non-idempotent package setup | Official packages already present: validate, do not destroy/reinstall. Malformed repo or conflicting `docker.io`/Snap/Podman REFUSE instead of force-overwrite. |

## Edge Case Hunter

- Non-root live execution REFUSE.
- Test `COHESTRA_TEST_EUID!=0` REFUSE.
- Unsupported kernel / non-Ubuntu / Ubuntu ≠ 24.04 REFUSE.
- Missing `deploy`, missing checkout, wrong origin REFUSE.
- Conflicting distro `docker.io` REFUSE.
- `production-compose.sh config` skips UAT network/container probes when `docker info` fails, so non-root `deploy` can dry-run without socket access.
- Second execution on a correct fixture PASS without calling apt/curl/systemctl stubs.
- Test harness mutation stubs (`apt-get`, `curl`, `usermod`, `ufw`, …) are never invoked.

## Acceptance Auditor

Owner authorization covers the Docker **prerequisite contract** only. Cursor did not SSH, did not run the script live, did not dispatch Deploy Production, and did not start Story 46.4. Production remains NO-GO.

Required dry-run result remains:

- `COMPOSE_UP=false`
- `DATABASE_MUTATED=false`
- `DEPLOY_USER_IN_DOCKER_GROUP=false`
- `DOCKER_TCP_LISTENER=false`

## Deployment-security

This bootstrap may install and enable local `docker` / `containerd` units. It does not compose-up, create Cohestra volumes, publish application ports, migrate, enable live Paddle, or alter Tailscale/SSH/UFW. Privileged container lifecycle stays in a later explicit Production story because docker-group membership is root-equivalent.
