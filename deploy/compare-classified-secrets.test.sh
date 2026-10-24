#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/compare-classified-secrets.sh"
UAT="$ROOT_DIR/deploy/fixtures/46-4/classified-uat.synthetic.txt"
PROD="$ROOT_DIR/deploy/fixtures/46-4/classified-production.synthetic.txt"
SHARED="$ROOT_DIR/deploy/fixtures/46-4/classified-shared.synthetic.txt"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

if ! bash "$SCRIPT" "$UAT" "$PROD" >"$out"; then
  fail "synthetic isolated inventories must pass"
fi
grep -q 'CLASSIFIED_ISOLATION=PASS' "$out" || fail "isolation marker"
if grep -qE 'ua01|pr01|ua02|pr02' "$out"; then
  fail "must not print classified suffixes"
fi
pass "synthetic isolated suffixes pass without printing suffixes"

if bash "$SCRIPT" "$UAT" "$SHARED" >"$out" 2>&1; then
  fail "shared suffix fixture must fail"
fi
grep -q 'SHARED_SECRET_NAME=JWT_SIGNING_KEY' "$out" || fail "must name colliding secret"
if grep -q 'ua01' "$out"; then
  fail "must not print the colliding suffix"
fi
pass "shared suffix fixture fails closed"

bad="$(mktemp)"
trap 'rm -f "$out" "$bad"' EXIT
printf 'JWT_SIGNING_KEY\tthis-is-a-full-secret-value-not-a-suffix\n' >"$bad"
if bash "$SCRIPT" "$UAT" "$bad" >"$out" 2>&1; then
  fail "full values must be refused"
fi
grep -q 'OWNER_GATE=classified_inventory_invalid' "$out" || fail "invalid inventory marker"
if grep -q 'this-is-a-full-secret-value' "$out"; then
  fail "must not echo the rejected value"
fi
pass "full secret values are refused"

echo "compare-classified-secrets contract OK"
