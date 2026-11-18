#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/production-like-load.sh"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCRIPT" ]] || fail "production-like-load.sh missing"
chmod +x "$SCRIPT" 2>/dev/null || true

self_check_out="$(env -u BASE_URL -u REPORT_PATH bash "$SCRIPT" 2>/dev/null || true)"
if [[ "$self_check_out" != *'RESULT=SELF_CHECK'* ]]; then
  fail "missing BASE_URL must run self-check"
fi
pass "absent BASE_URL runs self-check without network"

for url in \
  "https://localhost:8080" \
  "http://cohestra.app/health" \
  "http://uat.cohestra.app/health" \
  "http://159.223.55.242/health" \
  "http://129.212.235.2/health"; do
  if env -u BASE_URL -u REPORT_PATH BASE_URL="$url" bash "$SCRIPT" 2>/dev/null; then
    fail "must refuse ${url}"
  fi
done
pass "forbidden URLs are refused"

if ! env -u BASE_URL -u REPORT_PATH BASE_URL="http://localhost:8080" bash -c "source '$SCRIPT' && _try_validate_base_url 'http://localhost:8080/health'"; then
  fail "localhost guard must accept"
fi
if ! env -u BASE_URL -u REPORT_PATH BASE_URL="http://127.0.0.1:9999" bash -c "source '$SCRIPT' && _try_validate_base_url 'http://127.0.0.1:9999/health'"; then
  fail "127.0.0.1 guard must accept"
fi
pass "loopback hosts accepted by guard"

if ! grep -qE 'LoadTestSeed__Enabled:[[:space:]]*"false"' "$COMPOSE"; then
  fail "LoadTestSeed__Enabled must be locked false in docker-compose.production.yml"
fi
pass "Production compose keeps LoadTestSeed disabled"

if grep -qE 'echo.*(PASSWORD|SECRET|API_KEY|JWT|SendGrid__|POSTGRES_PASSWORD|REDIS_PASSWORD)' "$SCRIPT"; then
  fail "script must not echo secret values"
fi
pass "script does not print secret values"

echo "production-like-load contract OK"