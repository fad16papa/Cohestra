# Story 46.3 Docker bootstrap acceptance (sanitized)

Date: 2026-10-24 (Asia/Singapore)
Baseline main: `7e1cf5d48064b28a831ba20b25ac06d27e1a17fc`
PR #500: MERGED
Production: NO-GO
Story 46.3: IN PROGRESS
`LIVE_EVIDENCE=PARTIAL`
`RESULT_PASS=NOT_VISIBLE`
`OWNER_EVIDENCE_REQUIRED=YES`

## What the owner provided

Observed terminal fragments (not a complete bootstrap transcript):

```text
ENGINE_VERSION_RECORDED=true
COMPOSE_VERSION_RECORDED=true
COMPOSE_CONFIG=PASS
DEPLOY_USER_IN_DOCKER_GROUP=false
PASSWORDLESS_SUDO=false
DOCKER_TCP_LISTENER=false
CONTAINERS_STARTED=false
COMPOSE_UP=false
DATABASE_MUTATED=false
FIREWALL_CHANGED=false
```

Owner-stated versions (not independently re-read from the host by Cursor):

- Docker Engine: `29.9.2`
- Docker Compose: `v5.6.1`

The screenshot does **not** show `RESULT=PASS`, `DOCKER_RUNTIME=installed`,
`DOCKER_SOURCE`, or `COMPOSE_METHOD`. Cursor did not SSH. This file does not
treat the fragment as full acceptance.

Script on `7e1cf5d4` emits `RESULT=PASS` only after compose config succeeds,
and emits `COMPOSE_CONFIG=pass` (lowercase). The owner fragment used `PASS`.

## What remains required

`OWNER_EVIDENCE_REQUIRED` — non-destructive, owner-only, no Cursor SSH:

1. Scroll the same terminal to the bootstrap header/footer and confirm the
   exact line `RESULT=PASS` (or paste `RESULT=REFUSE` if that is what ran).
2. Confirm these sibling lines from the same run:
   - `DOCKER_RUNTIME=installed`
   - `DOCKER_SOURCE=official_apt_download.docker.com`
   - `COMPOSE_METHOD=docker-compose-plugin`
3. Confirm checkout pin (read-only):

```bash
sudo -u deploy git -C /home/deploy/cohestra-production rev-parse HEAD
sudo -u deploy git -C /home/deploy/cohestra-production config --get remote.origin.url
```

Expected HEAD: `7e1cf5d48064b28a831ba20b25ac06d27e1a17fc`  
Expected origin: `https://github.com/fad16papa/Cohestra.git`

4. Optional read-only corroboration (do not compose-up, do not create `.env`):

```bash
docker --version
docker compose version
id -nG deploy
test -f /home/deploy/cohestra-production/.env && echo ENV_PRESENT || echo ENV_ABSENT
```

`id -nG deploy` must not include `docker`. `.env` must remain absent.

Do not dispatch Deploy Production. Do not start Story 46.4.

## Repository tests on this baseline (non-destructive)

- `deploy/bootstrap-production-docker.test.sh` PASS
- `deploy/production-compose-config-placeholders.test.sh` PASS
- `deploy/bootstrap-production-checkout.test.sh` PASS
- `deploy/bootstrap-production-overlay.test.sh` PASS
- `deploy/validate-deploy-production-workflow.sh` PASS
- `deploy/fail-closed-production-secrets.test.sh` PASS
