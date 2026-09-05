#!/usr/bin/env bash
set -euo pipefail

# Post-deploy smoke checks for UAT on Ubuntu (Story 19.1).
# Usage:
#   bash deploy/uat-smoke.sh
#   PUBLIC_BASE_URL=https://your-droplet.example.com bash deploy/uat-smoke.sh
#   SMOKE_MARKETING_HOST=cohestra.app PUBLIC_BASE_URL=https://your-droplet.example.com bash deploy/uat-smoke.sh
#   SMOKE_INSECURE_TLS=1 — skip TLS verify when cert CN does not match IP/nip.io probe URL
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
CURL_TLS_FLAGS=()
if [[ "${SMOKE_INSECURE_TLS:-}" == "1" ]]; then
  CURL_TLS_FLAGS=(-k)
fi

curl_smoke() {
  curl "${CURL_TLS_FLAGS[@]}" "$@"
}

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
if command -v docker >/dev/null 2>&1; then
  docker compose -f docker-compose.uat.yml ps
else
  echo "(skipped — docker not on PATH; HTTP checks run against ${BASE_URL})"
fi

echo ""
echo "== nginx /ready =="
if curl_smoke -fsS "${BASE_URL%/}/ready" | grep -q '"status":"Healthy"'; then
  pass "/ready healthy"
  curl_smoke -fsS "${BASE_URL%/}/ready" | head -c 400
  echo ""
else
  fail "/ready unhealthy — check PUBLIC_BASE_URL and nginx"
  if command -v docker >/dev/null 2>&1; then
    docker compose -f docker-compose.uat.yml logs --tail=30 nginx api || true
  fi
fi

echo ""
echo "== Web home =="
HOME_CODE=$(curl_smoke -sS -o /dev/null -w "%{http_code}" "${BASE_URL%/}/" || echo "000")
if [[ "$HOME_CODE" == "200" || "$HOME_CODE" == "307" || "$HOME_CODE" == "308" ]]; then
  pass "Web home HTTP ${HOME_CODE}"
else
  fail "Web home returned ${HOME_CODE}"
fi

echo ""
echo "== Auth onboarding =="
if curl_smoke -fsS "${BASE_URL%/}/api/v1/auth/onboarding" | grep -q 'registrationAvailable'; then
  pass "Auth onboarding API"
else
  fail "Auth onboarding API"
fi

echo ""
echo "== Marketing signup surfaces =="
MARKETING_HOST="${SMOKE_MARKETING_HOST:-}"
for path in /signup /pricing; do
  if [[ -n "$MARKETING_HOST" ]]; then
    CODE=$(curl_smoke -sS -o /dev/null -w "%{http_code}" \
      -H "Host: ${MARKETING_HOST}" "${BASE_URL%/}${path}" || echo "000")
    LABEL="${path} (${MARKETING_HOST})"
  else
    CODE=$(curl_smoke -sS -o /dev/null -w "%{http_code}" "${BASE_URL%/}${path}" || echo "000")
    LABEL="${path}"
  fi
  if [[ "$CODE" == "200" ]]; then
    pass "${LABEL} returns 200"
  else
    fail "${LABEL} returned ${CODE}"
  fi
done

if curl_smoke -fsS "${BASE_URL%/}/api/v1/public/legal/versions" | grep -q 'termsVersion'; then
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
