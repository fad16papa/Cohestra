#!/usr/bin/env bash
# Fail-closed proof that https://uat.cohestra.app is Cohestra TLS, not the
# existing default_server cert. Does not print secrets or private keys.
#
# Usage (on the droplet, after apply-additive-tls.sh):
#   bash deploy/host-proxy/prove-edge-tls.sh

set -euo pipefail

HOST_NAME="${COHESTRA_UAT_HOSTNAME:-uat.cohestra.app}"
EXISTING_URL="${EXISTING_APP_PUBLIC_URL:-https://thesocialcollectivesg.com}"
EXISTING_HOST="${EXISTING_APP_HOST:-thesocialcollectivesg.com}"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: locked UAT hostname is uat.cohestra.app (got $HOST_NAME)." >&2
  exit 1
fi

echo "== Edge TLS proof =="
echo "UAT: https://${HOST_NAME}"
echo ""

subj=$(echo | openssl s_client -servername "$HOST_NAME" -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null || true)
echo "leaf_subject=${subj:-MISSING}"
if echo "$subj" | grep -q "$HOST_NAME"; then
  pass "TLS leaf names $HOST_NAME"
else
  fail "TLS leaf does not name $HOST_NAME — still the existing default_server cert"
fi
if echo "$subj" | grep -q "$EXISTING_HOST"; then
  fail "TLS leaf is the existing hostname cert — refuse"
fi

https_hdr=$(mktemp)
https_body=$(mktemp)
trap 'rm -f "$https_hdr" "$https_body"' EXIT
https_code=$(curl -sS --connect-timeout 8 -D "$https_hdr" -o "$https_body" -w '%{http_code}' \
  "https://${HOST_NAME}/ready" || echo "000")
echo "https /ready HTTP $https_code"
echo "https /ready body=$(tr -d '\n' <"$https_body")"
grep -iE '^(HTTP/|Location:|X-Cohestra-Edge-Vhost:|Strict-Transport-Security:)' "$https_hdr" || true

if [[ "$https_code" == "200" ]] && grep -q '"default-tenant"' "$https_body" && grep -q '"status":"Healthy"' "$https_body"; then
  pass "https://${HOST_NAME}/ready is Cohestra"
else
  fail "https://${HOST_NAME}/ready is not Cohestra (need 200 + default-tenant)"
fi
if grep -qiE '^X-Cohestra-Edge-Vhost:[[:space:]]*uat' "$https_hdr"; then
  pass "https /ready carries X-Cohestra-Edge-Vhost"
else
  fail "https /ready missing X-Cohestra-Edge-Vhost"
fi
if grep -qiE '^Strict-Transport-Security:' "$https_hdr"; then
  pass "https /ready sends HSTS"
else
  fail "https /ready missing Strict-Transport-Security"
fi

home_code=$(curl -sS --connect-timeout 8 -o /dev/null -w '%{http_code}' "https://${HOST_NAME}/" || echo "000")
if [[ "$home_code" == "200" || "$home_code" == "307" || "$home_code" == "308" ]]; then
  pass "https://${HOST_NAME}/ HTTP $home_code"
else
  fail "https://${HOST_NAME}/ HTTP $home_code"
fi

redir=$(curl -sS --connect-timeout 5 -o /dev/null -w '%{http_code} %{redirect_url}' \
  "http://${HOST_NAME}/" || echo "000")
echo "http / → $redir"
if echo "$redir" | grep -qE '^301 https://uat\.cohestra\.app/?'; then
  pass "http://${HOST_NAME}/ redirects to HTTPS UAT"
else
  fail "http://${HOST_NAME}/ must 301 to https://${HOST_NAME}/ (got $redir)"
fi

if curl -fsS --connect-timeout 8 "${EXISTING_URL%/}/ready" | grep -q '"status":"Healthy"'; then
  pass "existing public /ready Healthy"
else
  fail "existing public /ready failed"
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "EDGE TLS PROOF: FAIL — do not flip PUBLIC_BASE_URL to https yet."
  exit 1
fi
echo "EDGE TLS PROOF: PASS — https://${HOST_NAME} is Cohestra. Do not edit apex/@/www."
