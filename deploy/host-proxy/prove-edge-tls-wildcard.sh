#!/usr/bin/env bash
# Fail-closed proof for Cohestra UAT platform + tenant wildcard TLS.
# Does not print private keys or secrets.
#
# Usage (on droplet, after apply-additive-tls-wildcard.sh):
#   bash deploy/host-proxy/prove-edge-tls-wildcard.sh
#
# Tenant example host: creativorare.uat.cohestra.app

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/host-proxy/cohestra-uat-server-names.sh
source "$ROOT_DIR/deploy/host-proxy/cohestra-uat-server-names.sh"

HOST_NAME="$COHESTRA_UAT_PLATFORM_HOST"
TENANT_HOST="$COHESTRA_UAT_TENANT_EXAMPLE"
DROPLET_IP="${DROPLET_IP:-129.212.235.2}"
EXISTING_URL="${EXISTING_APP_PUBLIC_URL:-https://thesocialcollectivesg.com}"
EXISTING_HOST="${EXISTING_APP_HOST:-thesocialcollectivesg.com}"
REGISTRATION_PATH="${COHESTRA_UAT_REGISTRATION_PATH:-/register/sunday-dragon-highlander-2}"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

check_tls_sans() {
  local sni="$1"
  local label="$2"
  local leaf
  leaf=$(echo | openssl s_client -servername "$sni" -connect 127.0.0.1:443 2>/dev/null \
    | openssl x509 -noout -ext subjectAltName 2>/dev/null || true)
  echo "${label}_leaf=${leaf:-MISSING}"
  if echo "$leaf" | grep -q "DNS:${HOST_NAME}"; then
    pass "${label} TLS names ${HOST_NAME}"
  else
    fail "${label} TLS missing SAN ${HOST_NAME}"
  fi
  if echo "$leaf" | grep -q 'DNS:\*.uat.cohestra.app'; then
    pass "${label} TLS names *.uat.cohestra.app"
  else
    fail "${label} TLS missing SAN *.uat.cohestra.app"
  fi
  if echo "$leaf" | grep -q "$EXISTING_HOST"; then
    fail "${label} TLS is the existing site certificate"
  fi
}

echo "== Edge wildcard TLS proof =="
echo "Platform: https://${HOST_NAME}"
echo "Tenant example: https://${TENANT_HOST}"
echo ""

check_tls_sans "$HOST_NAME" "platform"
check_tls_sans "$TENANT_HOST" "tenant"

platform_code=$(curl -sS --connect-timeout 8 -o /tmp/cohestra-uat-ready.json -w '%{http_code}' \
  "https://${HOST_NAME}/ready" || echo "000")
if [[ "$platform_code" == "200" ]] && grep -q '"default-tenant"' /tmp/cohestra-uat-ready.json; then
  pass "https://${HOST_NAME}/ready is Cohestra"
else
  fail "https://${HOST_NAME}/ready HTTP $platform_code"
fi

tenant_code=$(curl -sS --connect-timeout 8 -o /tmp/cohestra-tenant-reg.html -w '%{http_code}' \
  --resolve "${TENANT_HOST}:443:${DROPLET_IP}" \
  "https://${TENANT_HOST}${REGISTRATION_PATH}" || echo "000")
echo "tenant registration HTTP $tenant_code path=${REGISTRATION_PATH}"
if [[ "$tenant_code" == "200" || "$tenant_code" == "404" ]]; then
  pass "tenant host routes to Cohestra edge (HTTP $tenant_code)"
else
  fail "tenant host registration HTTP $tenant_code"
fi

tenant_hdr=$(curl -sS --connect-timeout 8 -D - -o /dev/null \
  --resolve "${TENANT_HOST}:443:${DROPLET_IP}" \
  "https://${TENANT_HOST}/" || true)
if echo "$tenant_hdr" | grep -qiE '^X-Cohestra-Edge-Vhost:[[:space:]]*uat'; then
  pass "tenant host carries X-Cohestra-Edge-Vhost"
else
  fail "tenant host missing X-Cohestra-Edge-Vhost"
fi

if curl -fsS --connect-timeout 8 "${EXISTING_URL%/}/ready" | grep -q '"status":"Healthy"'; then
  pass "existing public /ready Healthy"
else
  fail "existing public /ready failed"
fi

existing_leaf=$(echo | openssl s_client -servername "$EXISTING_HOST" -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null || true)
echo "existing_site_leaf=${existing_leaf:-MISSING}"
if echo "$existing_leaf" | grep -q "$EXISTING_HOST"; then
  pass "existing site certificate unchanged"
else
  fail "existing site certificate subject unexpected"
fi

rm -f /tmp/cohestra-uat-ready.json /tmp/cohestra-tenant-reg.html

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "EDGE WILDCARD TLS PROOF: FAIL"
  exit 1
fi
echo "EDGE WILDCARD TLS PROOF: PASS"
