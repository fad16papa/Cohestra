#!/usr/bin/env bash
# Regression: the allowlist pins call-site counts and ClientErasureService rechecks.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/deploy/validate-tenant-filter-bypass-allowlist.sh"
PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if bash "$SCRIPT"; then
  pass "current tree matches call-site allowlist"
else
  fail "current tree matches call-site allowlist"
fi

tmp="$(mktemp)"
sed 's/ClientErasureService.cs 4 tenant-recheck/ClientErasureService.cs 3 tenant-recheck/' \
  "$ROOT/deploy/tenant-filter-bypass-allowlist.txt" > "$tmp"
if ALLOWLIST="$tmp" bash "$SCRIPT"; then
  fail "wrong ClientErasureService count must fail"
else
  pass "wrong ClientErasureService count fails"
fi
rm -f "$tmp"

erasure="$ROOT/src/Infrastructure/Clients/ClientErasureService.cs"
if grep -q 'client.TenantId != tenantId' "$erasure" \
  && [[ "$(grep -c 'TenantId == tenantId' "$erasure")" -ge 3 ]] \
  && [[ "$(grep -c 'IgnoreTenantFilters' "$erasure")" -eq 4 ]]; then
  pass "ClientErasureService keeps four bypasses and TenantId rechecks"
else
  fail "ClientErasureService keeps four bypasses and TenantId rechecks"
fi

echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
