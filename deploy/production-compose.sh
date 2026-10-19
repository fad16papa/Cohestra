#!/usr/bin/env bash
# Always invoke Production compose as project cohestra-production.
# Does not SSH, create a droplet, or invent a second topology.
# Usage: bash deploy/production-compose.sh config
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${COHESTRA_SHARED_HOST_UAT:-}" == "true" ]]; then
  echo "REFUSE: Production compose must not run on the UAT shared host."
  echo "Unset COHESTRA_SHARED_HOST_UAT. Dedicated droplet only."
  exit 1
fi

cmd=""
for arg in "$@"; do
  case "$arg" in
    -p|--project-name|--project-name=*)
      echo "REFUSE: do not pass -p / --project-name to production-compose.sh."
      echo "Project is locked to cohestra-production."
      exit 1
      ;;
    -f|--file|--file=*)
      echo "REFUSE: do not pass -f / --file to production-compose.sh."
      echo "Compose file is locked to docker-compose.production.yml."
      exit 1
      ;;
  esac
  if [[ "$arg" != -* && -z "$cmd" ]]; then
    cmd="$arg"
  fi
done

if command -v docker >/dev/null 2>&1; then
  for net in cohestra_uat_internal cohestra_uat_edge; do
    if docker network inspect "$net" >/dev/null 2>&1; then
      echo "REFUSE: UAT Docker network ${net} is present."
      echo "Production must not share the UAT / lead-generation-crm host."
      exit 1
    fi
  done
fi

export COMPOSE_PROJECT_NAME=cohestra-production
compose=(docker compose --project-name cohestra-production -f "$ROOT_DIR/docker-compose.production.yml")

# Never print interpolated secrets (config dumps resolved env).
if [[ "$cmd" == "config" ]]; then
  tmp="$(mktemp)"
  err="$(mktemp)"
  trap 'rm -f "$tmp" "$err"' EXIT
  if "${compose[@]}" "$@" >"$tmp" 2>"$err"; then
    echo "compose config OK (interpolated output not printed)"
    exit 0
  fi
  echo "compose config FAILED (interpolated output not printed)"
  exit 1
fi

exec "${compose[@]}" "$@"
