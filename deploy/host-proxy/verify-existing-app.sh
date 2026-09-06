#!/usr/bin/env bash
# Prove the existing lead-generation-crm stack is still healthy.
# Read-only. Does not restart, reload, or recreate anything.
# Does not print secrets.
#
# Usage (on the droplet):
#   bash deploy/host-proxy/verify-existing-app.sh

set -euo pipefail

EXISTING_APP_PUBLIC_URL="${EXISTING_APP_PUBLIC_URL:-https://thesocialcollectivesg.com}"
CONTAINERS=(
  lead-generation-crm-nginx-1
  lead-generation-crm-web-1
  lead-generation-crm-api-1
  lead-generation-crm-postgres-1
  lead-generation-crm-redis-1
)

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI required" >&2
  exit 1
fi

echo "== Existing application baseline / regression =="
echo "Public URL: $EXISTING_APP_PUBLIC_URL"
echo ""

for name in "${CONTAINERS[@]}"; do
  if ! docker inspect "$name" >/dev/null 2>&1; then
    fail "$name missing"
    continue
  fi
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name")
  running=$(docker inspect --format '{{.State.Running}}' "$name")
  if [[ "$running" == "true" && ( "$health" == "healthy" || "$health" == "running" ) ]]; then
    pass "$name $health"
  else
    fail "$name running=$running health=$health"
  fi
done

echo ""
echo "== Existing hostname =="
code=$(curl -sS -o /tmp/cohestra-existing-ready.json -w '%{http_code}' --connect-timeout 8 "${EXISTING_APP_PUBLIC_URL%/}/ready" || echo "000")
if [[ "$code" == "200" ]] && grep -q '"status":"Healthy"' /tmp/cohestra-existing-ready.json; then
  pass "existing hostname /ready Healthy (HTTP $code)"
else
  fail "existing hostname /ready HTTP $code (expected 200 Healthy)"
fi
rm -f /tmp/cohestra-existing-ready.json

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "EXISTING APP REGRESSION: FAIL — stop. Do not continue Story 19.1 mutation."
  exit 1
fi
echo "EXISTING APP BASELINE / REGRESSION: PASS"
