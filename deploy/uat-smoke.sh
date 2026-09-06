#!/usr/bin/env bash
set -euo pipefail

# Post-deploy smoke checks for UAT on Ubuntu (Story 19.1).
# Usage:
#   bash deploy/uat-smoke.sh
#   PUBLIC_BASE_URL=https://your-droplet.example.com bash deploy/uat-smoke.sh
#   PUBLIC_BASE_URL=http://127.0.0.1 bash deploy/uat-smoke.sh --full

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FULL_SMOKE=false
if [[ "${1:-}" == "--full" ]]; then
  FULL_SMOKE=true
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1}"

if [[ -z "${TENANT_HOST:-}" ]]; then
  if [[ "$BASE_URL" == *localhost* ]]; then
    TENANT_HOST="default.localhost:8088"
    if [[ "$BASE_URL" != *":8088"* && "$BASE_URL" != *":80"* ]]; then
      TENANT_HOST="default.localhost"
    fi
  elif [[ -n "${SMOKE_TENANT_HOST:-}" ]]; then
    TENANT_HOST="${SMOKE_TENANT_HOST}"
  else
    TENANT_HOST=$(python3 -c "from urllib.parse import urlparse; print(urlparse('${BASE_URL}').netloc or '127.0.0.1')")
  fi
fi
export TENANT_HOST

PASS=0
FAIL=0

pass() { echo "✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Cohestra UAT smoke =="
echo "PUBLIC_BASE_URL=${BASE_URL}"
echo ""

echo "== Docker services =="
bash deploy/uat-compose.sh ps

echo ""
echo "== Loopback isolation (not public) =="
LOOPBACK_NGINX="${NGINX_HOST_PORT:-8180}"
LOOPBACK_WEB="${WEB_HOST_PORT:-3100}"
LOOPBACK_API="${API_HOST_PORT:-5100}"
if command -v docker >/dev/null 2>&1 && bash deploy/uat-compose.sh ps -q nginx 2>/dev/null | grep -q .; then
  if curl -fsS --connect-timeout 3 "http://127.0.0.1:${LOOPBACK_NGINX}/ready" | grep -q '"status":"Healthy"'; then
    pass "Cohestra nginx loopback :${LOOPBACK_NGINX} /ready"
  else
    fail "Cohestra nginx loopback :${LOOPBACK_NGINX} /ready — stack not healthy or ports differ"
  fi
  WEB_CODE=$(curl -sS --connect-timeout 3 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${LOOPBACK_WEB}/" || echo "000")
  if [[ "$WEB_CODE" == "200" || "$WEB_CODE" == "307" || "$WEB_CODE" == "308" ]]; then
    pass "Cohestra web loopback :${LOOPBACK_WEB} HTTP ${WEB_CODE}"
  else
    fail "Cohestra web loopback :${LOOPBACK_WEB} returned ${WEB_CODE}"
  fi
  if curl -fsS --connect-timeout 3 "http://127.0.0.1:${LOOPBACK_API}/ready" | grep -q '"status":"Healthy"'; then
    pass "Cohestra API loopback :${LOOPBACK_API} /ready"
  else
    fail "Cohestra API loopback :${LOOPBACK_API} /ready"
  fi
else
  echo "Skipping loopback isolation — isolated compose nginx is not running on this host"
fi

echo ""
echo "== nginx /ready =="
if curl -fsS "${BASE_URL%/}/ready" | grep -q '"status":"Healthy"'; then
  pass "/ready healthy"
  curl -fsS "${BASE_URL%/}/ready" | head -c 400
  echo ""
else
  fail "/ready unhealthy — check PUBLIC_BASE_URL and nginx"
  bash deploy/uat-compose.sh logs --tail=30 nginx api || true
fi

echo ""
echo "== Web home =="
HOME_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL%/}/" || echo "000")
if [[ "$HOME_CODE" == "200" || "$HOME_CODE" == "307" || "$HOME_CODE" == "308" ]]; then
  pass "Web home HTTP ${HOME_CODE}"
else
  fail "Web home returned ${HOME_CODE}"
fi

echo ""
echo "== Auth onboarding =="
if curl -fsS "${BASE_URL%/}/api/v1/auth/onboarding" | grep -q 'registrationAvailable'; then
  pass "Auth onboarding API"
else
  fail "Auth onboarding API"
fi

echo ""
echo "== Marketing signup surfaces =="
for path in /signup /pricing; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL%/}${path}" || echo "000")
  if [[ "$CODE" == "200" ]]; then
    pass "${path} returns 200"
  else
    fail "${path} returned ${CODE}"
  fi
done

if curl -fsS "${BASE_URL%/}/api/v1/public/legal/versions" | grep -q 'termsVersion'; then
  pass "Legal versions API"
else
  fail "Legal versions API"
fi

echo ""
echo "== Security headers (tenant host) =="
if bash deploy/verify-security-headers.sh "${BASE_URL}"; then
  pass "Security headers verified"
else
  fail "Security headers check"
fi

if [[ "$FULL_SMOKE" == true ]]; then
  echo ""
  echo "== Full API smoke (local-smoke-run.sh) =="
  set +e
  API_BASE="${BASE_URL}" TENANT_HOST="${TENANT_HOST}" bash deploy/local-smoke-run.sh
  FULL_EXIT=$?
  set -e
  if [[ "$FULL_EXIT" -ne 0 ]]; then
    fail "Full API smoke (exit ${FULL_EXIT})"
  else
    pass "Full API smoke"
  fi
fi

echo ""
echo "== Summary =="
echo "Passed: ${PASS} | Failed: ${FAIL}"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

echo "Smoke checks complete."
