#!/usr/bin/env bash
set -euo pipefail

# Called on the droplet by GitHub Actions (or manually after SSH).
# Pulls latest main and rebuilds the Docker stack.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env is missing in $ROOT_DIR"
  echo "Run deploy/droplet-init.sh once, then edit .env with secrets."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed."
  exit 1
fi

echo "== Deploy lead-generation-crm =="
echo "Path:   $ROOT_DIR"
echo "Branch: $DEPLOY_BRANCH"
echo "Commit before pull: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

echo "Commit after pull:  $(git rev-parse --short HEAD)"

echo ""
echo "== Docker compose build + up =="
docker compose -f docker-compose.uat.yml up -d --build

echo ""
echo "== Smoke checks =="
bash deploy/uat-smoke.sh

echo ""
echo "Deploy finished successfully."
