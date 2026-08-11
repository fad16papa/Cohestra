#!/usr/bin/env bash
# CI / local: build stack on port 8088 and run API + Playwright smoke.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NGINX_HTTP_PORT=8088
export PUBLIC_BASE_URL=http://localhost:8088
export OperatorSeed__Enabled=true
export DemoDataSeed__Enabled=true
export DemoDataSeed__ClientCount=8
export POSTGRES_PASSWORD=crm
export POSTGRES_USER=crm
export POSTGRES_DB=cohestra

echo "== Building and starting Docker stack on :8088 =="
docker compose build api web
docker compose up -d postgres redis api web nginx

echo "== Waiting for /ready =="
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:8088/ready" | grep -q '"status":"Healthy"'; then
    echo "Stack healthy after ${i} attempts"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Stack did not become healthy in time"
    docker compose logs --tail=50 api nginx
    exit 1
  fi
  sleep 5
done

echo "== API smoke =="
PUBLIC_BASE_URL=http://localhost:8088 API_BASE=http://localhost:8088 \
  TENANT_HOST=default.localhost:8088 \
  bash deploy/local-smoke-run.sh

echo "== Security headers =="
TENANT_HOST=default.localhost:8088 bash deploy/verify-security-headers.sh http://localhost:8088

echo "== Playwright smoke =="
cd web
npm ci
npx playwright install --with-deps chromium
PUBLIC_BASE_URL=http://localhost:8088 npm run test:e2e

echo "CI Docker smoke passed."
