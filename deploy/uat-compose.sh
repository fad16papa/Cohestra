#!/usr/bin/env bash
# Always invoke isolated UAT compose as project cohestra-uat.
# Usage: bash deploy/uat-compose.sh up -d --build
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/cohestra-uat-guards.sh"
refuse_legacy_compose_project || exit 1
refuse_ssl_nginx_config || exit 1
refuse_public_cohestra_host_ports || exit 1

for arg in "$@"; do
  if [[ "$arg" == "-p" || "$arg" == "--project-name" || "$arg" == --project-name=* ]]; then
    echo "REFUSE: do not pass -p / --project-name to uat-compose.sh."
    echo "Project is locked to cohestra-uat."
    exit 1
  fi
  if [[ "$arg" == *certbot* ]]; then
    refuse_shared_host_cohestra_tls || exit 1
  fi
done

export COMPOSE_PROJECT_NAME=cohestra-uat
exec docker compose --project-name cohestra-uat -f "$ROOT_DIR/docker-compose.uat.yml" "$@"
