#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/public-uat-smoke.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! UAT_PUBLIC_BASE_URL=https://uat.cohestra.app bash "$SCRIPT" --dry-run "$TMP/ok.json"; then
  fail "dry-run of canonical UAT URL must pass"
fi
grep -q '"result": "dry_run"' "$TMP/ok.json" || fail "dry-run result marker"
pass "dry-run writes machine-readable JSON"

if UAT_PUBLIC_BASE_URL=https://thesocialcollectivesg.com bash "$SCRIPT" --dry-run "$TMP/crm.json"; then
  fail "CRM host must be refused"
fi
pass "shared CRM host is refused"

if UAT_PUBLIC_BASE_URL=http://uat.cohestra.app bash "$SCRIPT" --dry-run "$TMP/http.json"; then
  fail "http:// must be refused"
fi
pass "non-https public smoke is refused"

echo "public-uat-smoke contract OK"
