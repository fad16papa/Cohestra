#!/usr/bin/env bash
# Fail-closed proof that Host: uat.cohestra.app on public :80 reaches Cohestra,
# not the existing lead-generation-crm default_server.
# Does not change DNS. Does not print secrets.
#
# Usage (on the droplet, after apply-additive-vhost.sh):
#   bash deploy/host-proxy/prove-edge-vhost.sh

set -euo pipefail

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
ALIAS="${COHESTRA_EDGE_ALIAS:-cohestra-uat-nginx}"
HOST_NAME="${COHESTRA_UAT_HOSTNAME:-uat.cohestra.app}"
EXISTING_HOST="${EXISTING_APP_HOST:-thesocialcollectivesg.com}"
EXISTING_URL="${EXISTING_APP_PUBLIC_URL:-https://thesocialcollectivesg.com}"
LOOPBACK_NGINX="${NGINX_HOST_PORT:-8180}"
LOOPBACK_API="${API_HOST_PORT:-5100}"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: locked UAT hostname is uat.cohestra.app (got $HOST_NAME)." >&2
  exit 1
fi

echo "== Edge vhost routing proof =="
echo "UAT Host: $HOST_NAME"
echo "Existing host: $EXISTING_HOST"
echo ""

if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "REFUSE: $EDGE_NGINX not found" >&2
  exit 1
fi
if ! docker inspect "$ALIAS" >/dev/null 2>&1; then
  echo "REFUSE: $ALIAS is not running" >&2
  exit 1
fi

echo "== loaded additive vhost (no secrets) =="
if ! docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  fail "zz-cohestra-uat.conf missing in $EDGE_NGINX"
else
  docker exec "$EDGE_NGINX" grep -nE 'server_name |listen |proxy_pass |set \$cohestra|X-Cohestra-Edge-Vhost' \
    /etc/nginx/conf.d/zz-cohestra-uat.conf || true
  if docker exec "$EDGE_NGINX" grep -qE "server_name[[:space:]]+${HOST_NAME};" \
    /etc/nginx/conf.d/zz-cohestra-uat.conf; then
    pass "zz-cohestra-uat.conf server_name is $HOST_NAME"
  else
    fail "zz-cohestra-uat.conf server_name is not $HOST_NAME — Host-header will miss this vhost"
  fi
  if docker exec "$EDGE_NGINX" grep -qE '127\.0\.0\.1:8180' /etc/nginx/conf.d/zz-cohestra-uat.conf; then
    fail "zz-cohestra-uat.conf proxies to host loopback"
  fi
fi

loaded=$(docker exec "$EDGE_NGINX" nginx -T 2>/dev/null | grep -c "configuration file /etc/nginx/conf.d/zz-cohestra-uat.conf" || true)
if [[ "${loaded:-0}" -ge 1 ]]; then
  pass "nginx -T includes zz-cohestra-uat.conf"
else
  fail "nginx -T does not include zz-cohestra-uat.conf (reload did not load it)"
fi

echo ""
echo "== Cohestra loopback discriminator =="
lb_nginx=$(curl -fsS --connect-timeout 5 "http://127.0.0.1:${LOOPBACK_NGINX}/ready" || echo "")
lb_api=$(curl -fsS --connect-timeout 5 "http://127.0.0.1:${LOOPBACK_API}/ready" || echo "")
echo "8180/ready=$lb_nginx"
echo "5100/ready=$lb_api"
if echo "$lb_nginx" | grep -q '"default-tenant"' && echo "$lb_nginx" | grep -q '"status":"Healthy"'; then
  pass "Cohestra nginx loopback /ready has default-tenant"
else
  fail "Cohestra nginx loopback /ready missing default-tenant — cannot discriminate routing"
fi

echo ""
echo "== Host-header to public :80 =="
uat_hdr=$(mktemp)
uat_body=$(mktemp)
trap 'rm -f "$uat_hdr" "$uat_body"' EXIT
uat_code=$(curl -sS --connect-timeout 5 -D "$uat_hdr" -o "$uat_body" -w '%{http_code}' \
  -H "Host: ${HOST_NAME}" "http://127.0.0.1/ready" || echo "000")
echo "uat /ready HTTP $uat_code"
echo "uat /ready body=$(tr -d '\n' <"$uat_body")"
echo "uat /ready headers:"
grep -iE '^(HTTP/|Location:|X-Cohestra-Edge-Vhost:|Server:)' "$uat_hdr" || true

if [[ "$uat_code" == "200" ]] && grep -q '"default-tenant"' "$uat_body" && grep -q '"status":"Healthy"' "$uat_body"; then
  pass "Host $HOST_NAME :80 /ready is Cohestra (has default-tenant)"
else
  fail "Host $HOST_NAME :80 /ready is NOT Cohestra (need HTTP 200 + default-tenant). Missing default-tenant usually means the existing default_server."
fi

if grep -qiE '^X-Cohestra-Edge-Vhost:[[:space:]]*uat' "$uat_hdr"; then
  pass "Host $HOST_NAME :80 carries X-Cohestra-Edge-Vhost"
else
  fail "Host $HOST_NAME :80 missing X-Cohestra-Edge-Vhost — additive vhost did not match"
fi

home_hdr=$(mktemp)
trap 'rm -f "$uat_hdr" "$uat_body" "$home_hdr"' EXIT
home_code=$(curl -sS --connect-timeout 5 -D "$home_hdr" -o /dev/null -w '%{http_code}' \
  -H "Host: ${HOST_NAME}" "http://127.0.0.1/" || echo "000")
home_loc=$(grep -iE '^Location:' "$home_hdr" | head -n1 | tr -d '\r' || true)
echo "uat / HTTP $home_code ${home_loc}"
if [[ "$home_code" == "200" || "$home_code" == "307" || "$home_code" == "308" ]]; then
  pass "Host $HOST_NAME :80 / HTTP $home_code"
elif [[ "$home_code" == "301" ]] && echo "$home_loc" | grep -qiE 'https://'; then
  fail "Host $HOST_NAME :80 / is HTTP→HTTPS 301 ($home_loc) — that is the existing default_server, not Cohestra"
else
  fail "Host $HOST_NAME :80 / HTTP $home_code ${home_loc}"
fi

exist_code=$(curl -sS --connect-timeout 5 -o /dev/null -w '%{http_code}' \
  -H "Host: ${EXISTING_HOST}" "http://127.0.0.1/ready" || echo "000")
if [[ "$exist_code" == "200" ]]; then
  pass "Host $EXISTING_HOST :80 /ready HTTP 200"
else
  fail "Host $EXISTING_HOST :80 /ready HTTP $exist_code"
fi

echo ""
echo "== existing public app =="
if curl -fsS --connect-timeout 8 "${EXISTING_URL%/}/ready" | grep -q '"status":"Healthy"'; then
  pass "existing public /ready Healthy"
else
  fail "existing public /ready failed"
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "EDGE VHOST PROOF: FAIL — do not change DNS."
  exit 1
fi
echo "EDGE VHOST PROOF: PASS — A uat → droplet is now allowed. Do not change apex/@/www."
