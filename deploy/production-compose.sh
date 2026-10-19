#!/usr/bin/env bash
# Always invoke Production compose as project cohestra-production.
# Does not deploy, SSH, or create a droplet.
# Usage: bash deploy/production-compose.sh config
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "-p" || "$arg" == "--project-name" || "$arg" == --project-name=* ]]; then
    echo "REFUSE: do not pass -p / --project-name to production-compose.sh."
    echo "Project is locked to cohestra-production."
    exit 1
  fi
done

export COMPOSE_PROJECT_NAME=cohestra-production
exec docker compose --project-name cohestra-production -f "$ROOT_DIR/docker-compose.production.yml" "$@"
