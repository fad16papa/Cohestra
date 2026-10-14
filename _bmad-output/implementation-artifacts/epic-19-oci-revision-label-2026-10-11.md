# OCI revision labels — next authorized UAT rebuild only

Running UAT images (`Created` 2026-10-10T16:25Z, `GIT_SHA` env `f293650d`) do **not** carry `org.opencontainers.image.revision`. Env + `Created` stay **PARTIAL** provenance.

## What landed on this PR (not deployed)

- `src/Api/Dockerfile` and `web/Dockerfile` final stages: `ARG GIT_SHA=` + `LABEL org.opencontainers.image.revision="${GIT_SHA}"` + source URL.
- `docker-compose.uat.yml` passes `GIT_SHA: ${GIT_SHA:-}` as a **build arg** for api and web (runtime env `GIT_SHA` is unchanged).
- Isolation contract asserts both Dockerfiles and both compose build args.

Empty `GIT_SHA` yields an empty revision label on local unlabeled builds. That is intentional.

## Next authorized rebuild (do not run now)

```bash
cd /home/deploy/cohestra
git fetch origin main
AUTHORIZED_SHA="$(git rev-parse origin/main)"   # must be the owner-named SHA
git reset --hard "$AUTHORIZED_SHA"
export GIT_SHA="$AUTHORIZED_SHA"
bash deploy/uat-compose.sh build --no-cache api web
docker inspect cohestra-uat-api --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
docker inspect cohestra-uat-web --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
# both must print $AUTHORIZED_SHA before any up/deploy
```

`remote-deploy.sh` already derives and exports `GIT_SHA` after `git reset --hard`. After this PR is on the droplet, a future authorized deploy will bake the label.

Do **not** rebuild UAT until the owner authorizes a named SHA.
