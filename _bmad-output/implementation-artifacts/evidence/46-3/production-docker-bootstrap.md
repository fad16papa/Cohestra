# Story 46.3 Production Docker prerequisite bootstrap (sanitized)

Date: 2026-10-24 (Asia/Singapore)
Baseline main: `21e835604884a922f3a51d3b0d6039657affed15`
Production: NO-GO

## Owner-reported live state

- `LIVE_TAILSCALE=YES`
- `LIVE_TAILSCALE_HOST=100.90.12.72`
- `LIVE_DEPLOY_USER=YES`
- `LIVE_CHECKOUT=YES`
- `LIVE_CHECKOUT_SHA=21e835604884a922f3a51d3b0d6039657affed15`
- `PRODUCTION_ACTIONS_SSH_KEY=CREATED_AND_CONFIGURED`
- `GATE_B_VALUES=CONFIGURED`
- `DOCKER_RUNTIME=NOT_YET_INSTALLED`
- `GATE_B_VALIDATION=NOT_DISPATCHED`

Host preflight: `docker --version` returns `Command 'docker' not found`.
Gate B / `bash deploy/production-compose.sh config` must not be dispatched until this bootstrap is owner-run.

No secrets are recorded.

## What this pass did

- Added owner-run `deploy/bootstrap-production-docker.sh`.
- Added fail-closed fixture tests (`deploy/bootstrap-production-docker.test.sh`).
- Gated `production-compose.sh` UAT network/container probes behind a working `docker info`, so non-root `deploy` can run `config` without docker-group / socket access.
- Did **not** SSH Production.
- Did **not** execute the bootstrap live.
- Did **not** start Cohestra containers or compose-up.
- Did **not** run migrations or mutate a database.
- Did **not** dispatch Deploy Production or Gate B validation.
- Did **not** start Story 46.4.

## Contract

- Target OS: Ubuntu 24.04 LTS, hostname exactly `cohestra-production`
- Source: official Docker Engine apt repository `https://download.docker.com/linux/ubuntu`
- Packages: `docker-ce` `docker-ce-cli` `containerd.io` `docker-buildx-plugin` `docker-compose-plugin`
- Compose method: Docker Compose plugin
- GPG: official fingerprint `9DC858229FC7DD38854AE2D88D81803C0EBFCD88`
- `deploy` is **not** added to group `docker`
- No passwordless sudo
- No Docker TCP listener (2375/2376)
- No compose-up, container start, or database mutation
- Socket-less dry-run: `docker --version`, `docker compose version`, `bash deploy/production-compose.sh config`

## Privilege policy

Membership in group `docker` is root-equivalent. Story 46.3 only needs Compose configuration validation. Privileged container lifecycle authorization belongs to a later explicit Production deployment story.
