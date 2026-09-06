#!/usr/bin/env bash
# Always invoke isolated UAT compose as project cohestra-uat.
# Usage: bash deploy/uat-compose.sh up -d --build
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/cohestra-uat-guards.sh"
refuse_legacy_compose_project || exit 1

exec docker compose --project-name cohestra-uat -f "$ROOT_DIR/docker-compose.uat.yml" "$@"
