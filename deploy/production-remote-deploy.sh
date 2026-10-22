#!/usr/bin/env bash
# Production control-plane helper. Story 46.3 is dry-run only.
# Must never compose-up, migrate, or touch a database.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

refuse() {
  echo "REFUSE: $1"
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --restore-dump|--restore|up|psql|pg_restore)
      echo "NOT_IMPLEMENTED_46_5"
      refuse "database restore / compose up is forbidden in 46.3"
      ;;
  esac
done

if [[ -n "${RESTORE_DUMP:-}" || -n "${restore_dump:-}" ]]; then
  echo "NOT_IMPLEMENTED_46_5"
  refuse "RESTORE_DUMP is forbidden in 46.3"
fi

if [[ "${COHESTRA_SHARED_HOST_UAT:-}" == "true" ]]; then
  refuse "COHESTRA_SHARED_HOST_UAT is forbidden"
fi

if [[ -n "${DROPLET_HOST:-}" || -n "${DROPLET_USER:-}" || -n "${DROPLET_SSH_KEY:-}" ]]; then
  refuse "UAT DROPLET_* secrets must not be read"
fi

if [[ "${PROD_COMPOSE_PROJECT:-cohestra-production}" != "cohestra-production" ]]; then
  refuse "compose project must be cohestra-production"
fi

HEAD_SHA="$(git rev-parse HEAD)"
if [[ ! "$HEAD_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "HEAD is not a 40-character SHA"
fi
export GIT_SHA="$HEAD_SHA"

# Dry-run compose contract only. Never `up`. Never eval.
if [[ "${COHESTRA_PRODUCTION_COMPOSE_CMD:-}" == "true" ]]; then
  true
elif [[ -n "${COHESTRA_PRODUCTION_COMPOSE_CMD:-}" ]]; then
  refuse "invalid compose override"
elif ! bash "$ROOT_DIR/deploy/production-compose.sh" config >/dev/null; then
  refuse "production-compose.sh config failed"
fi

echo "RESULT=PASS"
echo "MODE=dry-run"
echo "COMPOSE_UP=false"
echo "DATABASE_MUTATED=false"
echo "GIT_SHA=${GIT_SHA}"
echo "STORY_46_3_DEPLOY=not_executed"
