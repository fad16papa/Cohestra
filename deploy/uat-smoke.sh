#!/usr/bin/env bash
set -euo pipefail

# Post-deploy smoke checks for UAT on Ubuntu.
# Usage:
#   bash deploy/uat-smoke.sh
#   PUBLIC_BASE_URL=http://YOUR_DROPLET_IP bash deploy/uat-smoke.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1}"

echo "== Docker services =="
docker compose -f docker-compose.uat.yml ps

echo ""
echo "== nginx /ready (via public entry point) =="
if curl -fsS "${BASE_URL%/}/ready" >/dev/null 2>&1; then
  curl -fsS "${BASE_URL%/}/ready" | head -c 400
  echo ""
else
  echo "Could not reach ${BASE_URL%/}/ready — check PUBLIC_BASE_URL and nginx container."
  docker compose -f docker-compose.uat.yml logs --tail=20 nginx || true
fi

echo ""
echo "== Web home (via nginx) =="
curl -fsSI "${BASE_URL%/}/" | head -3 || true

echo ""
echo "== Auth onboarding =="
curl -fsS "${BASE_URL%/}/api/v1/auth/onboarding"
echo ""

echo ""
echo "== Postgres (localhost bind) =="
if command -v nc >/dev/null 2>&1; then
  nc -z 127.0.0.1 5432 && echo "Postgres listening on 127.0.0.1:5432" || echo "Postgres not reachable on 127.0.0.1:5432"
else
  echo "Install netcat to verify port bind (optional)."
fi

echo ""
echo "== Redis (localhost bind) =="
if command -v nc >/dev/null 2>&1; then
  nc -z 127.0.0.1 6379 && echo "Redis listening on 127.0.0.1:6379" || echo "Redis not reachable on 127.0.0.1:6379"
fi

echo ""
echo "Smoke checks complete. PUBLIC_BASE_URL must match the URL in your browser."
echo "pgAdmin / RedisInsight: see docs/deploy/database-tools.md"
