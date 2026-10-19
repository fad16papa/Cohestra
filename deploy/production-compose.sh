#!/usr/bin/env bash
# Always invoke Production compose as project cohestra-production.
# Does not SSH, create a droplet, or invent a second topology.
# Usage: bash deploy/production-compose.sh config
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

normalize_flag() {
  printf '%s' "${1:-}" | sed 's/#.*//' | tr -d '[:space:]' | tr -d \"\' | tr '[:upper:]' '[:lower:]'
}

uat_process="$(normalize_flag "${COHESTRA_SHARED_HOST_UAT:-}")"
uat_file=""
if [[ -f "$ROOT_DIR/.env" ]]; then
  env_line="$(grep -E '^[[:space:]]*(export[[:space:]]+)?COHESTRA_SHARED_HOST_UAT=' "$ROOT_DIR/.env" | tail -n 1 || true)"
  if [[ -n "$env_line" ]]; then
    uat_file="$(normalize_flag "${env_line#*=}")"
  fi
fi
if [[ "$uat_process" == "true" || "$uat_process" == "1" || "$uat_process" == "yes" \
   || "$uat_file" == "true" || "$uat_file" == "1" || "$uat_file" == "yes" ]]; then
  echo "REFUSE: Production compose must not run on the UAT shared host."
  echo "Unset COHESTRA_SHARED_HOST_UAT. Dedicated droplet only."
  exit 1
fi

redact_config=0
for arg in "$@"; do
  case "$arg" in
    config|convert)
      redact_config=1
      ;;
    --dry-run|--dry-run=*)
      redact_config=1
      ;;
    run|exec)
      echo "REFUSE: do not pass run/exec to production-compose.sh."
      echo "Use the locked compose services; do not publish ad-hoc containers."
      exit 1
      ;;
    --output|--output=*|-o|-o=*|-o?*|--verbose|--debug)
      echo "REFUSE: do not pass --output/-o/--verbose/--debug to production-compose.sh."
      echo "Interpolated compose must not be written or printed."
      exit 1
      ;;
    --publish|--publish=*|-P|--network|--network=*|-e|--env|--env=*|--project-directory|--project-directory=*)
      echo "REFUSE: do not pass publish, network, env, or project-directory overrides."
      echo "Production topology is locked to docker-compose.production.yml."
      exit 1
      ;;
    -p|--project-name|--project-name=*|-p=*|-p?* )
      echo "REFUSE: do not pass -p / --project-name to production-compose.sh."
      echo "Project is locked to cohestra-production."
      exit 1
      ;;
    -f|--file|--file=*|-f=*|-f?* )
      echo "REFUSE: do not pass -f / --file to production-compose.sh."
      echo "Compose file is locked to docker-compose.production.yml."
      exit 1
      ;;
    --env-file|--env-file=* )
      echo "REFUSE: do not pass --env-file to production-compose.sh."
      echo "Use the Production host .env next to docker-compose.production.yml."
      exit 1
      ;;
  esac
done

if command -v docker >/dev/null 2>&1; then
  for net in cohestra_uat_internal cohestra_uat_edge; do
    if docker network inspect "$net" >/dev/null 2>&1; then
      echo "REFUSE: UAT Docker network ${net} is present."
      echo "Production must not share the UAT / lead-generation-crm host."
      exit 1
    fi
  done
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q 'lead-generation-crm'; then
    echo "REFUSE: lead-generation-crm containers are present."
    echo "Production must not share the UAT / lead-generation-crm host."
    exit 1
  fi
fi

export COMPOSE_PROJECT_NAME=cohestra-production
# Prevent env-driven compose file merges from older Compose clients.
unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_ENV_FILES || true
compose=(docker compose --project-name cohestra-production -f "$ROOT_DIR/docker-compose.production.yml")

# Never print interpolated secrets (config/convert dump resolved env).
if [[ "$redact_config" -eq 1 ]]; then
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
