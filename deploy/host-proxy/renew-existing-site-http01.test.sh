#!/usr/bin/env bash
# Mocked unit tests for renew-existing-site-http01.sh (no live Docker / ACME).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/host-proxy/renew-existing-site-http01.sh
source "$ROOT_DIR/deploy/host-proxy/renew-existing-site-http01.sh"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

DOCKER_LOG=""
FP_FILE=""
CERTBOT_RC=0
NGINX_T_RC=0
RELOAD_COUNT=0

reset_mocks() {
  DOCKER_LOG=""
  CERTBOT_RC=0
  NGINX_T_RC=0
  RELOAD_COUNT=0
  EXISTING_CERT_NAME="thesocialcollectivesg.com"
  COHESTRA_AUTHORIZE_EXISTING_RENEW=1
  FP_FILE=$(mktemp)
}

queue_fps() {
  printf '%s\n' "$@" > "$FP_FILE"
}

cohestra_docker() {
  DOCKER_LOG+="$*"$'\n'
  local joined="$*"
  if [[ "$joined" == exec*sha256sum* ]]; then
    local fp
    fp=$(sed -n '1p' "$FP_FILE")
    sed -i '1d' "$FP_FILE"
    printf '%s  %s\n' "$fp" "$LIVE_FULLCHAIN"
    return 0
  fi
  if [[ "$joined" == run*certbot/certbot:latest*renew* ]]; then
    if echo "$joined" | grep -q -- '--deploy-hook'; then
      echo "mock saw forbidden deploy-hook" >&2
      return 99
    fi
    return "$CERTBOT_RC"
  fi
  if [[ "$joined" == exec*nginx\ -t ]]; then
    return "$NGINX_T_RC"
  fi
  if [[ "$joined" == exec*nginx\ -s\ reload ]]; then
    RELOAD_COUNT=$((RELOAD_COUNT + 1))
    return 0
  fi
  echo "unexpected docker: $joined" >&2
  return 98
}

echo "== renew-existing-site-http01 mocked tests =="

reset_mocks
queue_fps aaa bbb
if renew_existing_site_http01 >/tmp/renew-test-ok.out && [[ "$RELOAD_COUNT" -eq 1 ]] \
  && grep -q 'RESULT=RENEWED' /tmp/renew-test-ok.out \
  && ! grep -q -- '--deploy-hook' <<<"$DOCKER_LOG"; then
  pass "successful renewal reloads from the host"
else
  fail "successful renewal"
  cat /tmp/renew-test-ok.out || true
fi

reset_mocks
queue_fps same same
if renew_existing_site_http01 >/tmp/renew-test-noop.out && [[ "$RELOAD_COUNT" -eq 0 ]] \
  && grep -q 'RESULT=NOOP' /tmp/renew-test-noop.out; then
  pass "no-op renewal skips reload"
else
  fail "no-op renewal"
fi

reset_mocks
queue_fps aaa
CERTBOT_RC=1
if ! renew_existing_site_http01 >/tmp/renew-test-cb.out && [[ "$RELOAD_COUNT" -eq 0 ]] \
  && grep -q 'RESULT=CERTBOT_FAIL' /tmp/renew-test-cb.out; then
  pass "certbot failure skips reload"
else
  fail "certbot failure"
fi

reset_mocks
queue_fps old new
NGINX_T_RC=1
set +e
renew_existing_site_http01 >/tmp/renew-test-ngx.out
rc=$?
set -e
if [[ "$rc" -eq 2 ]] && [[ "$RELOAD_COUNT" -eq 0 ]] \
  && grep -q 'RESULT=NGINX_TEST_FAIL' /tmp/renew-test-ngx.out; then
  pass "nginx -t failure skips reload"
else
  fail "nginx -t failure (rc=$rc reload=$RELOAD_COUNT)"
fi

reset_mocks
EXISTING_CERT_NAME="uat.cohestra.app"
if ! refuse_wrong_lineage 2>/tmp/renew-test-uat.err; then
  pass "refuses UAT cert-name"
else
  fail "UAT cert-name must be refused"
fi

reset_mocks
unset COHESTRA_AUTHORIZE_EXISTING_RENEW
if ! renew_existing_site_http01 >/tmp/renew-test-auth.out 2>/dev/null && grep -q 'RESULT=REFUSED_NO_AUTH' /tmp/renew-test-auth.out; then
  pass "refuses run without owner authorize env"
else
  fail "auth gate"
fi

rm -f /tmp/renew-test-ok.out /tmp/renew-test-noop.out /tmp/renew-test-cb.out \
  /tmp/renew-test-ngx.out /tmp/renew-test-uat.err /tmp/renew-test-auth.out

echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "EXISTING SITE HTTP-01 RENEW TESTS: PASS"
