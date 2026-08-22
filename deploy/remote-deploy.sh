#!/usr/bin/env bash
set -euo pipefail

# Called on the droplet by GitHub Actions (or manually after SSH).
# Pulls latest main and rebuilds the Docker stack.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
FULL_SMOKE="${DEPLOY_FULL_SMOKE:-auto}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env is missing in $ROOT_DIR"
  echo "Run deploy/droplet-init.sh once, then edit .env — see docs/deploy/production-droplet-setup.md"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed."
  exit 1
fi

echo "== Deploy cohestra =="
echo "Path:   $ROOT_DIR"
echo "Branch: $DEPLOY_BRANCH"
echo "Commit before pull: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

echo "Commit after pull:  $(git rev-parse --short HEAD)"

echo ""
echo "== Preflight (non-strict reCAPTCHA) =="
if bash deploy/preflight-launch.sh; then
  echo "Preflight OK"
else
  echo "ERROR: preflight failed — fix .env before deploy (bash deploy/droplet-env-check.sh)"
  exit 1
fi

echo ""
echo "== Docker compose build + up =="
docker compose -f docker-compose.uat.yml up -d --build

echo ""
echo "== Smoke checks =="
SMOKE_ARGS=()
if [[ "$FULL_SMOKE" == "true" ]]; then
  SMOKE_ARGS=(--full)
elif [[ "$FULL_SMOKE" == "false" ]]; then
  SMOKE_ARGS=()
elif [[ -n "${SMOKE_TENANT_HOST:-}" ]]; then
  echo "SMOKE_TENANT_HOST set — running full smoke"
  SMOKE_ARGS=(--full)
else
  echo "SMOKE_TENANT_HOST unset — basic smoke only (set in .env for tenant door checks)"
fi

PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1}" \
  SMOKE_TENANT_HOST="${SMOKE_TENANT_HOST:-}" \
  bash deploy/uat-smoke.sh "${SMOKE_ARGS[@]}"

echo ""
echo "Deploy finished successfully."
echo "Commit: $(git rev-parse --short HEAD) | URL: ${PUBLIC_BASE_URL:-unknown}"
