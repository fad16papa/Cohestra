#!/usr/bin/env bash
# Verify Epic 17/18 security headers on the public edge (Story 19.2).
#
# Usage:
#   bash deploy/verify-security-headers.sh
#   bash deploy/verify-security-headers.sh https://your-tenant.example.com
#   TENANT_HOST=default.localhost:8088 bash deploy/verify-security-headers.sh http://localhost:8088
#
# Pass criteria:
#   - Each expected header appears exactly once
#   - Content-Security-Policy is enforce mode (not Report-Only)
#   - Strict-Transport-Security present when URL scheme is https

set -euo pipefail

BASE_URL="${1:-${PUBLIC_BASE_URL:-http://localhost:8088}}"
TENANT_HOST="${TENANT_HOST:-default.localhost:8088}"
EXPECT_HSTS=false

if [[ "$BASE_URL" == https://* ]]; then
  EXPECT_HSTS=true
fi

HEADERS=$(curl -sSI -H "Host: ${TENANT_HOST}" "${BASE_URL%/}/" || true)

if [[ -z "$HEADERS" ]]; then
  echo "❌ Could not fetch headers from ${BASE_URL} (Host: ${TENANT_HOST})"
  exit 1
fi

count_header() {
  local name="$1"
  echo "$HEADERS" | grep -ci "^${name}:" || true
}

check_once() {
  local name="$1"
  local count
  count=$(count_header "$name")
  if [[ "$count" -eq 1 ]]; then
    echo "✅ ${name} (1)"
    return 0
  fi
  echo "❌ ${name} expected 1 occurrence, got ${count}"
  return 1
}

FAIL=0

for header in \
  X-Frame-Options \
  X-Content-Type-Options \
  Referrer-Policy \
  Permissions-Policy \
  Content-Security-Policy; do
  check_once "$header" || FAIL=1
done

REPORT_ONLY=$(count_header "Content-Security-Policy-Report-Only")
if [[ "$REPORT_ONLY" -gt 0 ]]; then
  echo "❌ Content-Security-Policy-Report-Only should not be present (enforce mode shipped)"
  FAIL=1
else
  echo "✅ No Content-Security-Policy-Report-Only header"
fi

if [[ "$EXPECT_HSTS" == true ]]; then
  check_once "Strict-Transport-Security" || FAIL=1
else
  HSTS_COUNT=$(count_header "Strict-Transport-Security")
  if [[ "$HSTS_COUNT" -gt 0 ]]; then
    echo "✅ Strict-Transport-Security present (${HSTS_COUNT})"
  else
    echo "ℹ️  Strict-Transport-Security not expected on HTTP (use HTTPS URL to require HSTS)"
  fi
fi

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Header dump:"
  echo "$HEADERS" | grep -iE '^(x-frame|x-content|referrer|permissions|content-security|strict-transport)' || true
  exit 1
fi

echo ""
echo "Security headers OK for ${BASE_URL} (Host: ${TENANT_HOST})"
